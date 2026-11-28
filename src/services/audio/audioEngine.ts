import {
  createAudioPlaylist,
  setAudioModeAsync,
  type AudioPlaylist,
  type AudioPlaylistLoopMode,
  type AudioPlaylistStatus,
  type AudioSource,
} from 'expo-audio';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import type { RepeatMode, Song } from '@/types/music';

export interface PlaybackStatusSnapshot {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  didJustFinish: boolean;
  error: string | null;
}

export interface AudioEngineCallbacks {
  onStatusUpdate: (status: PlaybackStatusSnapshot) => void;
  onTrackChanged?: (newIndex: number) => void;
  onTrackFinished: () => void;
  onCrossfadeNeeded?: () => void;
  onExternalPause?: () => void;
  onError: (message: string) => void;
}

/**
 * Compact sliding native queue window.
 *
 * We keep a single persistent native AudioPlaylist alive across track and queue switches so
 * ExoPlayer, MediaSession, and AudioControlsService are never torn down and recreated when
 * picking another song. Initial load passes ONLY the selected track so playback starts in ~15ms,
 * and the surrounding window (`WINDOW_BEHIND` + `WINDOW_AHEAD`) is filled shortly after.
 */
const WINDOW_BEHIND = 5;
const WINDOW_AHEAD = 15;
const WINDOW_AHEAD_SLACK = 6;
const FULL_LOAD_LIMIT = WINDOW_BEHIND + WINDOW_AHEAD + 1;
const WINDOW_FILL_DELAY_MS = 250;
const INDEX_SYNC_GUARD_MS = 700;
const REBUILD_SETTLE_DELAY_MS = 40;

function toPlaylistLoopMode(mode: RepeatMode): AudioPlaylistLoopMode {
  if (mode === 'one') return 'single';
  if (mode === 'all') return 'all';
  return 'none';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Singleton AudioEngine backed by expo-audio's native AudioPlaylist (ExoPlayer Media3 queue):
 * - Single persistent AudioPlaylist reused in-place across track & queue switches (zero teardown crashes)
 * - Instant O(1) first-track startup + deferred sliding window for zero UI lag
 * - Clean MediaSession & Foreground Service recovery after notification pause + swipe-dismiss
 * - Native Android MediaSession with Next / Previous / Play / Pause (Lock screen & Bluetooth)
 * - Background-safe Crossfade, Sleep Timer fade multiplier, and EQ headroom gain
 */
class AudioEngine {
  private playlist: AudioPlaylist | null = null;
  private lockScreenActive = false;
  private queueSongs: Song[] = [];
  /** Index into `queueSongs` of the active track. */
  private currentIndex = -1;
  /** `nativeMap[nativeIndex]` = index into `queueSongs`. */
  private nativeMap: number[] = [];
  private isModeConfigured = false;
  private modeConfigPromise: Promise<void> | null = null;
  private callbacks: AudioEngineCallbacks | null = null;
  private statusSub: { remove: () => void } | null = null;
  private trackChangedSub: { remove: () => void } | null = null;
  private playbackRate = 1.0;
  private volume = 1.0;
  private fadeMultiplier = 1.0;
  private eqGainMultiplier = 1.0;
  private loopMode: AudioPlaylistLoopMode = 'none';
  private crossfadeSeconds = 0;
  private isCrossfadingOut = false;
  private isCrossfadingIn = false;
  private finishGuard = false;
  private wasPlaying = false;
  private userPaused = false;
  private loadToken = 0;
  private indexSyncBlockedUntil = 0;
  private lastPosition = 0;
  private wentBackground = false;
  private needsSessionRebuild = false;
  private playWatchdog: ReturnType<typeof setTimeout> | null = null;
  private windowFillTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSub: { remove: () => void } | null = null;

  private ensureAppStateListener(): void {
    if (this.appStateSub) return;
    try {
      this.appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
        if (nextState === 'background' || nextState === 'inactive') {
          this.wentBackground = true;
          return;
        }

        if (nextState === 'active' && this.wentBackground) {
          this.wentBackground = false;
          // If playback was paused while outside the app, the user may have swiped away the live
          // Android Media3 notification (which detaches/stops MediaSession or AudioControlsService).
          // Rebuild cleanly on the next play/selection so audio and notification recover immediately.
          if (!this.isActivelyPlaying()) {
            this.needsSessionRebuild = true;
          }
        }
      });
    } catch {
      // Ignore in environments where AppState is unavailable
    }
  }

  // ---------------------------------------------------------------------------
  // Setup & cold-start hydration
  // ---------------------------------------------------------------------------

  setCallbacks(callbacks: AudioEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  warmUp(): void {
    if (Platform.OS === 'web') return;
    this.ensureAppStateListener();
  }

  hydrateQueue(songs: Song[], currentIndex: number, position = 0): void {
    if (songs.length === 0) return;
    this.queueSongs = [...songs];
    this.currentIndex = Math.max(0, Math.min(currentIndex, songs.length - 1));
    this.lastPosition = Math.max(0, position);
    this.userPaused = true;
  }

  async configureAudioSession(): Promise<void> {
    if (this.isModeConfigured) return;
    if (this.modeConfigPromise) return this.modeConfigPromise;

    this.modeConfigPromise = (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMixPersistent',
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
        });
        this.isModeConfigured = true;
      } catch (err) {
        this.callbacks?.onError(
          err instanceof Error ? err.message : 'تنظیم پخش پس‌زمینه با خطا مواجه شد.'
        );
      } finally {
        this.modeConfigPromise = null;
      }
    })();
    return this.modeConfigPromise;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private clearPlayWatchdog(): void {
    if (this.playWatchdog) {
      clearTimeout(this.playWatchdog);
      this.playWatchdog = null;
    }
  }

  private clearWindowFillTimer(): void {
    if (this.windowFillTimer) {
      clearTimeout(this.windowFillTimer);
      this.windowFillTimer = null;
    }
  }

  private scheduleWindowFill(expectedToken: number): void {
    this.clearWindowFillTimer();
    if (this.queueSongs.length <= 1) return;

    this.windowFillTimer = setTimeout(() => {
      this.windowFillTimer = null;
      if (expectedToken !== this.loadToken || !this.playlist) return;
      this.rebalanceWindow();
    }, WINDOW_FILL_DELAY_MS);
  }

  private isActivelyPlaying(): boolean {
    if (!this.playlist) return false;
    try {
      return Boolean(this.playlist.playing);
    } catch {
      return false;
    }
  }

  private getEffectiveVolume(): number {
    return Math.min(1.0, Math.max(0.0, this.volume * this.fadeMultiplier * this.eqGainMultiplier));
  }

  private applyVolume(multiplier = 1.0): void {
    if (this.playlist) {
      try {
        this.playlist.volume = Math.min(1.0, Math.max(0.0, this.getEffectiveVolume() * multiplier));
      } catch {
        // Ignore volume errors on disposed playlist
      }
    }
  }

  private get isWindowed(): boolean {
    return this.queueSongs.length > FULL_LOAD_LIMIT;
  }

  private toSource(queueIndex: number): AudioSource {
    const song = this.queueSongs[queueIndex]!;
    return { uri: song.fileUri, name: song.title };
  }

  private successor(index: number): number | null {
    const len = this.queueSongs.length;
    if (index + 1 < len) return index + 1;
    return this.loopMode === 'all' && len > 1 ? 0 : null;
  }

  private predecessor(index: number): number | null {
    const len = this.queueSongs.length;
    if (index - 1 >= 0) return index - 1;
    return this.loopMode === 'all' && len > 1 ? len - 1 : null;
  }

  private nativeToQueueIndex(nativeIndex: number): number {
    return nativeIndex >= 0 && nativeIndex < this.nativeMap.length
      ? this.nativeMap[nativeIndex]!
      : -1;
  }

  private guardIndexSync(): void {
    this.indexSyncBlockedUntil = Date.now() + INDEX_SYNC_GUARD_MS;
  }

  private isIndexSyncBlocked(): boolean {
    return Date.now() < this.indexSyncBlockedUntil;
  }

  private isPlaylistHealthy(): boolean {
    if (!this.playlist || this.needsSessionRebuild) return false;
    try {
      return Boolean(this.playlist.isLoaded || this.playlist.isBuffering);
    } catch {
      return false;
    }
  }

  private detachListeners(): void {
    this.statusSub?.remove();
    this.statusSub = null;
    this.trackChangedSub?.remove();
    this.trackChangedSub = null;
  }

  /**
   * Cleans up the current native playlist.
   *
   * IMPORTANT: Never call `old.release()` synchronously here — expo-audio's `AudioControlsService`
   * and `Playable.setVolume()` enqueue coroutines on `appContext.mainQueue` that reference
   * `old.player`. Calling `old.release()` triggers `ExoPlayer.release()` + `unbindService()` on a
   * separate `GlobalScope` launch, racing with those coroutines and crashing Android. Letting GC
   * finalize the destroyed SharedObject after `pause/clear/clearLockScreenControls/destroy` is safe.
   */
  private destroyPlaylist(): boolean {
    this.clearWindowFillTimer();
    this.detachListeners();
    this.lockScreenActive = false;
    this.nativeMap = [];

    if (!this.playlist) return false;

    const old = this.playlist;
    this.playlist = null;
    try {
      old.pause();
      old.clear();
      old.clearLockScreenControls();
      old.destroy();
    } catch {
      // Ignore cleanup errors
    }
    return true;
  }

  private isSameQueue(songs: Song[]): boolean {
    if (songs.length !== this.queueSongs.length) return false;
    for (let i = 0; i < songs.length; i++) {
      if (songs[i]!.id !== this.queueSongs[i]!.id) return false;
    }
    return true;
  }

  private ensureLockScreenActive(playlist: AudioPlaylist, song: Song): void {
    if (this.lockScreenActive) {
      this.updateMetadata(song);
      return;
    }
    try {
      playlist.setActiveForLockScreen(
        true,
        {
          title: song.title,
          artist: song.artist,
          albumTitle: song.album,
          artworkUrl: song.artworkUri ?? undefined,
        },
        {
          showSeekBackward: true,
          showSeekForward: true,
          showNextTrack: true,
          showPreviousTrack: true,
        }
      );
      this.lockScreenActive = true;
    } catch {
      // Lock screen controls are not supported on web
    }
  }

  /**
   * Swaps the playing track in-place on the already-alive `AudioPlaylist` without tearing down
   * ExoPlayer, MediaSession, or AudioControlsService.
   */
  private swapActiveTrackInPlace(
    playlist: AudioPlaylist,
    targetQueueIndex: number
  ): boolean {
    try {
      const prevCount = playlist.trackCount;
      playlist.add(this.toSource(targetQueueIndex));
      const afterAddCount = playlist.trackCount;
      if (afterAddCount <= prevCount) {
        return false;
      }

      playlist.skipTo(prevCount);

      for (let i = 0; i < prevCount; i++) {
        playlist.remove(0);
      }

      this.nativeMap = [targetQueueIndex];
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Sliding window maintenance
  // ---------------------------------------------------------------------------

  private rebalanceWindow(): void {
    const playlist = this.playlist;
    if (!playlist || this.queueSongs.length === 0) return;

    let n = this.nativeMap.indexOf(this.currentIndex);
    if (n < 0) return;

    // Abort rebalance if native trackCount drifted out of sync with nativeMap
    try {
      if (playlist.trackCount !== this.nativeMap.length) {
        return;
      }
    } catch {
      return;
    }

    const windowed = this.isWindowed;
    const aheadLimit = windowed ? WINDOW_AHEAD : Number.MAX_SAFE_INTEGER;
    const behindLimit = windowed ? WINDOW_BEHIND : Number.MAX_SAFE_INTEGER;
    let shifted = false;

    try {
      // 1. Drop upcoming items that no longer match queue order
      for (let p = n + 1; p < this.nativeMap.length; p++) {
        if (this.nativeMap[p] !== this.successor(this.nativeMap[p - 1]!)) {
          for (let r = this.nativeMap.length - 1; r >= p; r--) {
            playlist.remove(r);
          }
          this.nativeMap.length = p;
          break;
        }
      }

      // 2. Drop previous items that no longer precede the active track
      for (let p = n - 1; p >= 0; p--) {
        if (this.nativeMap[p] !== this.predecessor(this.nativeMap[p + 1]!)) {
          for (let r = p; r >= 0; r--) {
            playlist.remove(0);
          }
          this.nativeMap.splice(0, p + 1);
          n -= p + 1;
          shifted = true;
          break;
        }
      }

      const seen = new Set(this.nativeMap);

      // 3. Top up upcoming tracks (verify native count so nativeMap never drifts)
      while (this.nativeMap.length - 1 - n < aheadLimit) {
        const next = this.successor(this.nativeMap[this.nativeMap.length - 1]!);
        if (next === null || seen.has(next)) break;
        const before = playlist.trackCount;
        playlist.add(this.toSource(next));
        if (playlist.trackCount <= before) break;
        this.nativeMap.push(next);
        seen.add(next);
      }

      // 4. Trim excess upcoming tracks
      if (windowed) {
        while (this.nativeMap.length - 1 - n > aheadLimit + WINDOW_AHEAD_SLACK) {
          playlist.remove(this.nativeMap.length - 1);
          seen.delete(this.nativeMap.pop()!);
        }
      }

      // 5. Trim old tracks behind the active track
      while (n > behindLimit) {
        playlist.remove(0);
        seen.delete(this.nativeMap.shift()!);
        n--;
        shifted = true;
      }

      // 6. Populate previous tracks so Lock Screen / Bluetooth "Previous" works natively
      if (!windowed || n < Math.ceil(behindLimit / 2)) {
        while (n < behindLimit) {
          const prev = this.predecessor(this.nativeMap[0]!);
          if (prev === null || seen.has(prev)) break;
          const before = playlist.trackCount;
          playlist.insert(this.toSource(prev), 0);
          if (playlist.trackCount <= before) break;
          this.nativeMap.unshift(prev);
          seen.add(prev);
          n++;
          shifted = true;
        }
      }
    } catch {
      // Ignore transient native sync errors
    }

    if (shifted) {
      this.guardIndexSync();
    }
  }

  private handleNativeTrackAdvance(queueIndex: number): void {
    this.currentIndex = queueIndex;
    this.lastPosition = 0;
    this.finishGuard = false;

    if (this.isCrossfadingOut) {
      this.isCrossfadingOut = false;
      this.isCrossfadingIn = this.crossfadeSeconds > 0;
      if (!this.isCrossfadingIn) {
        this.applyVolume(1.0);
      }
    } else {
      this.isCrossfadingIn = false;
      this.applyVolume(1.0);
    }

    const song = this.queueSongs[queueIndex];
    if (song) {
      this.updateMetadata(song);
    }

    this.callbacks?.onTrackChanged?.(queueIndex);
    this.scheduleWindowFill(this.loadToken);
  }

  private attachListeners(playlist: AudioPlaylist): void {
    this.detachListeners();

    this.trackChangedSub = playlist.addListener('trackChanged', ({ currentIndex }) => {
      if (this.playlist !== playlist || this.isIndexSyncBlocked()) return;
      const queueIndex = this.nativeToQueueIndex(currentIndex);
      if (queueIndex < 0 || queueIndex === this.currentIndex) return;
      this.handleNativeTrackAdvance(queueIndex);
    });

    this.statusSub = playlist.addListener('playlistStatusUpdate', (status: AudioPlaylistStatus) => {
      if (this.playlist !== playlist) return;

      const position = Number.isFinite(status.currentTime) ? status.currentTime : 0;
      const duration = Number.isFinite(status.duration) ? status.duration : 0;
      if (position > 0) {
        this.lastPosition = position;
      }

      if (!this.isIndexSyncBlocked() && typeof status.currentIndex === 'number') {
        const queueIndex = this.nativeToQueueIndex(status.currentIndex);
        if (queueIndex >= 0 && queueIndex !== this.currentIndex) {
          this.handleNativeTrackAdvance(queueIndex);
        }
      }

      // Detect unexpected OS-triggered pause (headphone unplugged, BT disconnected, call)
      if (
        this.wasPlaying &&
        !status.playing &&
        !this.userPaused &&
        !status.didJustFinish &&
        status.isLoaded
      ) {
        this.callbacks?.onExternalPause?.();
      }
      this.wasPlaying = status.playing;

      this.updateCrossfadeEnvelope(status.playing, position, duration);

      this.callbacks?.onStatusUpdate({
        isLoaded: status.isLoaded,
        isPlaying: status.playing,
        isBuffering: status.isBuffering,
        position,
        duration,
        didJustFinish: status.didJustFinish,
        error: null,
      });

      if (status.didJustFinish && !this.finishGuard) {
        this.finishGuard = true;
        const isLastTrack = this.currentIndex >= this.queueSongs.length - 1;
        if (this.loopMode === 'none' && isLastTrack) {
          this.isCrossfadingOut = false;
          this.isCrossfadingIn = false;
          this.applyVolume(1.0);
          this.callbacks?.onTrackFinished();
        } else if (this.loopMode !== 'single') {
          const next = this.successor(this.currentIndex);
          if (next !== null) {
            this.callbacks?.onTrackChanged?.(next);
            void this.skipToIndex(next, true);
          }
        }
      } else if (!status.didJustFinish) {
        this.finishGuard = false;
      }
    });
  }

  private updateCrossfadeEnvelope(isPlaying: boolean, position: number, duration: number): void {
    const fadeSec = this.crossfadeSeconds;
    if (fadeSec <= 0 || this.loopMode === 'single') {
      if (this.isCrossfadingOut || this.isCrossfadingIn) {
        this.isCrossfadingOut = false;
        this.isCrossfadingIn = false;
        this.applyVolume(1.0);
      }
      return;
    }

    if (!isPlaying || duration <= 0) return;

    const hasNextTrack = this.successor(this.currentIndex) !== null;
    const remaining = Math.max(0, duration - position);

    if (hasNextTrack && duration > fadeSec + 1.5 && remaining <= fadeSec) {
      this.isCrossfadingOut = true;
      this.isCrossfadingIn = false;
      const ratio = Math.min(1, Math.max(0, remaining / fadeSec));
      const floor = AppState.currentState === 'active' ? 0.04 : 0.14;
      const gain = floor + (1 - floor) * Math.pow(ratio, 1.35);
      this.applyVolume(gain);
      return;
    }

    const fadeInDuration = Math.max(0.8, Math.min(fadeSec * 0.65, duration * 0.25));
    if (this.isCrossfadingIn && position < fadeInDuration) {
      const ratio = Math.min(1, Math.max(0, position / fadeInDuration));
      const gain = 0.15 + 0.85 * Math.pow(ratio, 0.85);
      this.applyVolume(gain);
      return;
    }

    if (this.isCrossfadingOut || this.isCrossfadingIn) {
      this.isCrossfadingOut = false;
      this.isCrossfadingIn = false;
      this.applyVolume(1.0);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading & navigation
  // ---------------------------------------------------------------------------

  async setQueueAndPlay(
    songs: Song[],
    startIndex = 0,
    autoPlay = true,
    startPosition = 0,
    forceRecreate = false
  ): Promise<void> {
    if (songs.length === 0) return;

    this.ensureAppStateListener();
    this.clearPlayWatchdog();
    const clampedIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
    const activeSong = songs[clampedIndex]!;
    const healthy = !forceRecreate && this.isPlaylistHealthy();

    // Fast path 1: same queue, healthy native player, and target is already in the native window
    if (healthy && this.playlist && this.isSameQueue(songs) && this.nativeMap.includes(clampedIndex)) {
      this.queueSongs = [...songs];
      await this.skipToIndex(clampedIndex, autoPlay);
      if (startPosition > 0) {
        await this.seekTo(startPosition);
      }
      return;
    }

    // Fast path 2: reuse the existing healthy AudioPlaylist in-place (different queue or out-of-window)
    // Avoids tearing down ExoPlayer, MediaSession, and AudioControlsService on song switches!
    if (healthy && this.playlist) {
      const token = ++this.loadToken;
      this.clearWindowFillTimer();
      this.queueSongs = [...songs];
      this.currentIndex = clampedIndex;
      this.lastPosition = startPosition;
      this.guardIndexSync();
      this.finishGuard = false;
      this.isCrossfadingOut = false;
      this.isCrossfadingIn = false;
      this.userPaused = !autoPlay;

      if (this.swapActiveTrackInPlace(this.playlist, clampedIndex)) {
        try {
          this.applyVolume(1.0);
          if (autoPlay) {
            this.ensureLockScreenActive(this.playlist, activeSong);
          } else {
            this.updateMetadata(activeSong);
          }
          if (startPosition > 0) {
            try {
              await this.playlist.seekTo(startPosition);
            } catch {
              // Ignore pre-buffer seek error
            }
          }
          if (autoPlay && token === this.loadToken) {
            this.playlist.play();
          }
          this.scheduleWindowFill(token);
          return;
        } catch {
          // Fall through to full rebuild below if in-place playback fails
        }
      }
    }

    // Full creation path (first launch, or recovery after notification dismissal / STATE_IDLE)
    const token = ++this.loadToken;
    if (!this.isModeConfigured) {
      await this.configureAudioSession();
      if (token !== this.loadToken) return;
    }

    const hadPrevious = this.destroyPlaylist();
    if (hadPrevious) {
      // Allow Android's Main Looper to finish AudioControlsService.clearSessionInternal()
      // before binding a brand-new MediaSession so there is zero teardown/startup race.
      await delay(REBUILD_SETTLE_DELAY_MS);
      if (token !== this.loadToken) return;
    }

    this.queueSongs = [...songs];
    this.currentIndex = clampedIndex;
    this.lastPosition = startPosition;
    this.needsSessionRebuild = false;
    this.finishGuard = false;
    this.isCrossfadingOut = false;
    this.isCrossfadingIn = false;
    this.userPaused = !autoPlay;

    try {
      const playlist = createAudioPlaylist({
        sources: [this.toSource(clampedIndex)],
        updateInterval: 250,
        loop: this.loopMode,
      });

      if (token !== this.loadToken) {
        try {
          playlist.pause();
          playlist.clear();
          playlist.destroy();
        } catch {
          // Ignore stale cleanup
        }
        return;
      }

      this.playlist = playlist;
      this.lockScreenActive = false;
      this.nativeMap = [clampedIndex];
      this.guardIndexSync();
      playlist.volume = this.getEffectiveVolume();
      playlist.playbackRate = this.playbackRate;

      this.attachListeners(playlist);
      if (autoPlay) {
        this.ensureLockScreenActive(playlist, activeSong);
      }

      if (startPosition > 0) {
        try {
          await playlist.seekTo(startPosition);
        } catch {
          // Ignore pre-buffer seek failure
        }
      }

      if (autoPlay && token === this.loadToken) {
        playlist.play();
      }

      this.scheduleWindowFill(token);
    } catch (err) {
      this.callbacks?.onError(
        err instanceof Error
          ? `خطا در پخش «${activeSong.title}»: ${err.message}`
          : `امکان پخش «${activeSong.title}» وجود ندارد. ممکن است فایل صوتی در دسترس نباشد.`
      );
    }
  }

  async skipToIndex(index: number, autoPlay = true): Promise<void> {
    if (index < 0 || index >= this.queueSongs.length) return;
    const song = this.queueSongs[index]!;

    const nativeIndex = this.nativeMap.indexOf(index);
    if (!this.playlist || nativeIndex < 0 || !this.isPlaylistHealthy()) {
      await this.setQueueAndPlay(this.queueSongs, index, autoPlay, 0, !this.isPlaylistHealthy());
      return;
    }

    const token = ++this.loadToken;
    this.clearPlayWatchdog();
    this.clearWindowFillTimer();
    this.currentIndex = index;
    this.lastPosition = 0;
    this.guardIndexSync();
    this.finishGuard = false;
    this.isCrossfadingOut = false;
    this.isCrossfadingIn = false;
    this.userPaused = !autoPlay;

    try {
      this.applyVolume(1.0);
      this.playlist.skipTo(nativeIndex);
      if (autoPlay) {
        this.ensureLockScreenActive(this.playlist, song);
        this.playlist.play();
      } else {
        this.updateMetadata(song);
      }
      this.scheduleWindowFill(token);
    } catch (err) {
      this.callbacks?.onError(
        err instanceof Error
          ? `خطا در پخش «${song.title}»: ${err.message}`
          : `امکان پخش «${song.title}» وجود ندارد.`
      );
    }
  }

  async loadAndPlay(song: Song, autoPlay = true, startPosition = 0): Promise<void> {
    const existingIdx = this.queueSongs.findIndex((s) => s.id === song.id);
    if (this.playlist && existingIdx >= 0 && this.isPlaylistHealthy()) {
      await this.skipToIndex(existingIdx, autoPlay);
      if (startPosition > 0) {
        await this.seekTo(startPosition);
      }
      return;
    }
    await this.setQueueAndPlay([song], 0, autoPlay, startPosition);
  }

  // ---------------------------------------------------------------------------
  // Live queue mutations
  // ---------------------------------------------------------------------------

  addSongToQueue(song: Song): void {
    this.queueSongs.push(song);
    if (this.playlist && !this.windowFillTimer) {
      this.scheduleWindowFill(this.loadToken);
    }
  }

  insertSongInQueue(song: Song, index: number): void {
    const clamped = Math.max(0, Math.min(index, this.queueSongs.length));
    this.queueSongs.splice(clamped, 0, song);
    if (clamped <= this.currentIndex) {
      this.currentIndex += 1;
    }
    this.nativeMap = this.nativeMap.map((i) => (i >= clamped ? i + 1 : i));

    if (this.playlist && !this.windowFillTimer) {
      const prevPos = clamped > 0 ? this.nativeMap.indexOf(clamped - 1) : -1;
      let slot = -1;
      if (prevPos >= 0) {
        slot = prevPos + 1;
      } else if (this.nativeMap[0] === clamped + 1) {
        slot = 0;
      }
      if (slot >= 0) {
        try {
          const activeNative = this.nativeMap.indexOf(this.currentIndex);
          const before = this.playlist.trackCount;
          this.playlist.insert(this.toSource(clamped), slot);
          if (this.playlist.trackCount > before) {
            this.nativeMap.splice(slot, 0, clamped);
            if (slot <= activeNative) {
              this.guardIndexSync();
            }
          }
        } catch {
          // Ignore native queue sync error
        }
      }
      this.scheduleWindowFill(this.loadToken);
    }
  }

  removeSongFromQueue(index: number): void {
    if (index < 0 || index >= this.queueSongs.length) return;

    const nativePos = this.nativeMap.indexOf(index);
    const activeNative = this.nativeMap.indexOf(this.currentIndex);

    this.queueSongs.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex -= 1;
    }

    if (nativePos >= 0) {
      if (this.playlist) {
        try {
          this.playlist.remove(nativePos);
        } catch {
          // Ignore native queue sync error
        }
        if (nativePos <= activeNative) {
          this.guardIndexSync();
        }
      }
      this.nativeMap.splice(nativePos, 1);
    }
    this.nativeMap = this.nativeMap.map((i) => (i > index ? i - 1 : i));
    if (this.playlist && !this.windowFillTimer) {
      this.scheduleWindowFill(this.loadToken);
    }
  }

  syncQueueOrder(songs: Song[], newCurrentIndex: number): void {
    const playlist = this.playlist;
    if (!playlist || songs.length === 0 || newCurrentIndex < 0) {
      this.queueSongs = [...songs];
      this.currentIndex = newCurrentIndex;
      if (!playlist) this.nativeMap = [];
      return;
    }

    this.clearWindowFillTimer();

    try {
      const activeNative = playlist.currentIndex;
      const count = playlist.trackCount;

      for (let i = count - 1; i > activeNative; i--) {
        playlist.remove(i);
      }
      for (let i = activeNative - 1; i >= 0; i--) {
        playlist.remove(0);
      }

      this.queueSongs = [...songs];
      this.currentIndex = newCurrentIndex;
      this.nativeMap = [newCurrentIndex];
      this.guardIndexSync();
      this.scheduleWindowFill(this.loadToken);
    } catch {
      this.queueSongs = [...songs];
      this.currentIndex = newCurrentIndex;
    }
  }

  async preloadNextTrack(_song: Song | null): Promise<void> {
    // ExoPlayer buffers the next track in AudioPlaylist natively; kept as no-op for compatibility.
  }

  // ---------------------------------------------------------------------------
  // Transport
  // ---------------------------------------------------------------------------

  private rebuildAtLastPosition(): void {
    if (this.queueSongs.length > 0 && this.currentIndex >= 0) {
      void this.setQueueAndPlay(
        this.queueSongs,
        this.currentIndex,
        true,
        this.lastPosition,
        true
      );
    }
  }

  play(): void {
    this.userPaused = false;
    this.clearPlayWatchdog();

    if (!this.playlist || !this.isPlaylistHealthy()) {
      this.rebuildAtLastPosition();
      return;
    }

    try {
      const activeSong =
        this.currentIndex >= 0 && this.currentIndex < this.queueSongs.length
          ? this.queueSongs[this.currentIndex]
          : null;
      if (activeSong) {
        this.ensureLockScreenActive(this.playlist, activeSong);
      }
      this.playlist.play();

      this.playWatchdog = setTimeout(() => {
        this.playWatchdog = null;
        if (this.userPaused || !this.playlist) return;
        try {
          if (!this.playlist.playing && !this.playlist.isBuffering) {
            this.rebuildAtLastPosition();
          }
        } catch {
          // Ignore watchdog error
        }
      }, 450);
    } catch (err) {
      if (this.queueSongs.length > 0 && this.currentIndex >= 0) {
        this.rebuildAtLastPosition();
      } else {
        this.callbacks?.onError(
          err instanceof Error ? err.message : 'امکان ادامه پخش وجود ندارد.'
        );
      }
    }
  }

  pause(): void {
    this.userPaused = true;
    this.clearPlayWatchdog();
    try {
      this.playlist?.pause();
    } catch {
      // Ignore pause errors when unloaded
    }
  }

  async stop(): Promise<void> {
    this.userPaused = true;
    this.clearPlayWatchdog();
    this.clearWindowFillTimer();
    this.isCrossfadingOut = false;
    this.isCrossfadingIn = false;
    if (!this.playlist) return;
    try {
      this.playlist.pause();
      await this.playlist.seekTo(0);
      this.playlist.clearLockScreenControls();
      this.lockScreenActive = false;
    } catch {
      // Ignore stop errors
    }
  }

  async seekTo(seconds: number): Promise<void> {
    const clamped = Math.max(0, seconds);
    this.lastPosition = clamped;
    if (!this.playlist) return;
    this.isCrossfadingOut = false;
    this.isCrossfadingIn = false;
    this.applyVolume(1.0);
    try {
      await this.playlist.seekTo(clamped);
    } catch (err) {
      this.callbacks?.onError(
        err instanceof Error ? err.message : 'امکان جابه‌جایی زمان پخش وجود ندارد.'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.min(2.0, Math.max(0.5, rate));
    if (this.playlist) {
      try {
        this.playlist.playbackRate = this.playbackRate;
      } catch {
        // Ignore rate error if unloaded
      }
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1.0, Math.max(0.0, volume));
    this.applyVolume(1.0);
  }

  setFadeMultiplier(multiplier: number): void {
    this.fadeMultiplier = Math.min(1.0, Math.max(0.0, multiplier));
    this.applyVolume(1.0);
  }

  setEqGainMultiplier(multiplier: number): void {
    this.eqGainMultiplier = Math.min(1.0, Math.max(0.5, multiplier));
    this.applyVolume(1.0);
  }

  setRepeatMode(mode: RepeatMode): void {
    this.loopMode = toPlaylistLoopMode(mode);
    if (this.playlist) {
      try {
        this.playlist.loop = this.loopMode;
      } catch {
        // Ignore loop update error
      }
      if (!this.windowFillTimer) {
        this.scheduleWindowFill(this.loadToken);
      }
    }
  }

  setLoopCurrent(loop: boolean): void {
    this.setRepeatMode(loop ? 'one' : 'off');
  }

  setGaplessPlayback(_enabled: boolean): void {
    // ExoPlayer playlists are natively gapless
  }

  setCrossfadeSeconds(seconds: number): void {
    this.crossfadeSeconds = Math.max(0, Math.min(12, seconds));
    if (this.crossfadeSeconds === 0 && (this.isCrossfadingOut || this.isCrossfadingIn)) {
      this.isCrossfadingOut = false;
      this.isCrossfadingIn = false;
      this.applyVolume(1.0);
    }
  }

  updateMetadata(song: Song): void {
    if (!this.lockScreenActive) return;
    try {
      this.playlist?.updateLockScreenMetadata({
        title: song.title,
        artist: song.artist,
        albumTitle: song.album,
        artworkUrl: song.artworkUri ?? undefined,
      });
    } catch {
      // Ignore if lock screen is inactive
    }
  }

  destroy(): void {
    this.isCrossfadingOut = false;
    this.isCrossfadingIn = false;
    this.clearPlayWatchdog();
    this.clearWindowFillTimer();
    this.destroyPlaylist();
    this.queueSongs = [];
    this.currentIndex = -1;
  }
}

export const audioEngine = new AudioEngine();
