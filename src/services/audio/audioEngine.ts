import {
  createAudioPlayer,
  preload,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import { Platform } from 'react-native';
import type { Song } from '@/types/music';

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
  onTrackFinished: () => void;
  onCrossfadeNeeded?: () => void;
  onExternalPause?: () => void;
  onError: (message: string) => void;
}

/**
 * Singleton AudioEngine managing expo-audio playback with:
 * - Background playback, lock screen & headset/Bluetooth controls
 * - Gapless preloading of the next track
 * - Dual-player smooth Crossfade transitions
 * - Non-destructive volume fade multiplier (for Sleep Timer fade-out)
 * - Automatic sync on OS audio route / headphone disconnect interruptions
 */
class AudioEngine {
  private player: AudioPlayer | null = null;
  private fadingOutPlayer: AudioPlayer | null = null;
  private isModeConfigured = false;
  private callbacks: AudioEngineCallbacks | null = null;
  private subscription: { remove: () => void } | null = null;
  private playbackRate = 1.0;
  private volume = 1.0;
  private fadeMultiplier = 1.0;
  private eqGainMultiplier = 1.0;
  private loopCurrent = false;
  private gaplessEnabled = true;
  private crossfadeSeconds = 0;
  private finishGuard = false;
  private crossfadeGuard = false;
  private wasPlaying = false;
  private userPaused = false;
  private crossfadeTimer: ReturnType<typeof setInterval> | null = null;
  private preloadedUri: string | null = null;

  setCallbacks(callbacks: AudioEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  private getEffectiveVolume(): number {
    return Math.min(1.0, Math.max(0.0, this.volume * this.fadeMultiplier * this.eqGainMultiplier));
  }

  private applyVolume(): void {
    if (this.player) {
      this.player.volume = this.getEffectiveVolume();
    }
  }

  async configureAudioSession(): Promise<void> {
    if (this.isModeConfigured) return;

    try {
      if (Platform.OS === 'android') {
        try {
          await requestNotificationPermissionsAsync();
        } catch {
          // Notification permission is optional on older Android versions
        }
      }

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
    }
  }

  private attachListeners(player: AudioPlayer): void {
    this.subscription?.remove();
    this.subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.error) {
        this.callbacks?.onError(status.error);
      }

      const position = Number.isFinite(status.currentTime) ? status.currentTime : 0;
      const duration = Number.isFinite(status.duration) ? status.duration : 0;

      // Detect unexpected OS-triggered pause (e.g., headphone unplugged, Bluetooth disconnected, phone call)
      if (this.wasPlaying && !status.playing && !this.userPaused && !status.didJustFinish && status.isLoaded) {
        this.callbacks?.onExternalPause?.();
      }
      this.wasPlaying = status.playing;

      this.callbacks?.onStatusUpdate({
        isLoaded: status.isLoaded,
        isPlaying: status.playing,
        isBuffering: status.isBuffering,
        position,
        duration,
        didJustFinish: status.didJustFinish,
        error: status.error,
      });

      // Trigger Crossfade before track finishes when enabled
      if (
        this.crossfadeSeconds > 0 &&
        !this.loopCurrent &&
        !this.crossfadeGuard &&
        status.playing &&
        duration > this.crossfadeSeconds + 1.5 &&
        duration - position <= this.crossfadeSeconds
      ) {
        this.crossfadeGuard = true;
        this.callbacks?.onCrossfadeNeeded?.();
      }

      if (status.didJustFinish && !this.loopCurrent && !this.finishGuard) {
        this.finishGuard = true;
        this.callbacks?.onTrackFinished();
      } else if (!status.didJustFinish) {
        this.finishGuard = false;
      }
    });
  }

  private createFreshPlayer(): AudioPlayer {
    const player = createAudioPlayer(null, {
      updateInterval: 250,
      keepAudioSessionActive: true,
      preferredForwardBufferDuration: this.gaplessEnabled ? 10 : 0,
    });
    player.volume = this.getEffectiveVolume();
    player.loop = this.loopCurrent;
    return player;
  }

  private ensurePlayer(): AudioPlayer {
    if (this.player) return this.player;
    const player = this.createFreshPlayer();
    this.attachListeners(player);
    this.player = player;
    return player;
  }

  private clearCrossfadeTimer(): void {
    if (this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    if (this.fadingOutPlayer) {
      try {
        this.fadingOutPlayer.pause();
        this.fadingOutPlayer.remove();
      } catch {
        // Ignore cleanup error
      }
      this.fadingOutPlayer = null;
    }
  }

  private applyLockScreen(player: AudioPlayer, song: Song): void {
    try {
      player.setActiveForLockScreen(
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
    } catch {
      // Lock screen controls are not supported on web
    }
  }

  async loadAndPlay(song: Song, autoPlay = true, startPosition = 0): Promise<void> {
    await this.configureAudioSession();
    this.clearCrossfadeTimer();
    this.finishGuard = false;
    this.crossfadeGuard = false;
    this.userPaused = !autoPlay;

    try {
      const player = this.ensurePlayer();
      player.replace({ uri: song.fileUri, name: song.title });
      player.volume = this.getEffectiveVolume();
      player.loop = this.loopCurrent;
      player.setPlaybackRate(this.playbackRate);
      this.applyLockScreen(player, song);

      if (startPosition > 0) {
        try {
          await player.seekTo(startPosition);
        } catch {
          // Seek may fail if not yet buffered; ignore
        }
      }

      if (autoPlay) {
        player.play();
      }
    } catch (err) {
      this.callbacks?.onError(
        err instanceof Error
          ? `خطا در پخش «${song.title}»: ${err.message}`
          : `امکان پخش «${song.title}» وجود ندارد. ممکن است فایل صوتی در دسترس نباشد.`
      );
    }
  }

  /**
   * Smoothly crossfades from the currently playing track into `nextSong`.
   */
  async crossfadeTo(nextSong: Song, durationSeconds: number): Promise<void> {
    await this.configureAudioSession();
    this.clearCrossfadeTimer();

    const oldPlayer = this.player;
    if (!oldPlayer || durationSeconds <= 0) {
      await this.loadAndPlay(nextSong, true);
      return;
    }

    this.finishGuard = false;
    this.crossfadeGuard = false;
    this.userPaused = false;

    try {
      const newPlayer = this.createFreshPlayer();
      newPlayer.replace({ uri: nextSong.fileUri, name: nextSong.title });
      newPlayer.volume = 0;
      newPlayer.loop = this.loopCurrent;
      newPlayer.setPlaybackRate(this.playbackRate);
      this.applyLockScreen(newPlayer, nextSong);

      this.fadingOutPlayer = oldPlayer;
      this.player = newPlayer;
      this.attachListeners(newPlayer);
      newPlayer.play();

      const steps = Math.max(8, Math.round(durationSeconds * 10));
      const intervalMs = Math.max(50, Math.round((durationSeconds * 1000) / steps));
      let step = 0;

      this.crossfadeTimer = setInterval(() => {
        step += 1;
        const progress = Math.min(1, step / steps);
        const targetVol = this.getEffectiveVolume();

        try {
          newPlayer.volume = targetVol * progress;
          if (this.fadingOutPlayer) {
            this.fadingOutPlayer.volume = targetVol * (1 - progress);
          }
        } catch {
          // Ignore volume errors on disposed player
        }

        if (progress >= 1) {
          this.clearCrossfadeTimer();
          this.applyVolume();
        }
      }, intervalMs);
    } catch {
      await this.loadAndPlay(nextSong, true);
    }
  }

  /**
   * Preloads the next track in the queue for near-instant gapless transitions.
   */
  async preloadNextTrack(song: Song | null): Promise<void> {
    if (!this.gaplessEnabled || !song || Platform.OS === 'web') return;
    if (this.preloadedUri === song.fileUri) return;
    try {
      this.preloadedUri = song.fileUri;
      await preload({ uri: song.fileUri, name: song.title }, { preferredForwardBufferDuration: 10 });
    } catch {
      // Preloading is an optimization; ignore failures
    }
  }

  play(): void {
    this.userPaused = false;
    try {
      this.player?.play();
    } catch (err) {
      this.callbacks?.onError(
        err instanceof Error ? err.message : 'امکان ادامه پخش وجود ندارد.'
      );
    }
  }

  pause(): void {
    this.userPaused = true;
    try {
      this.player?.pause();
    } catch {
      // Ignore pause errors when unloaded
    }
  }

  async stop(): Promise<void> {
    this.userPaused = true;
    this.clearCrossfadeTimer();
    if (!this.player) return;
    try {
      this.player.pause();
      await this.player.seekTo(0);
      this.player.clearLockScreenControls();
    } catch {
      // Ignore stop errors
    }
  }

  async seekTo(seconds: number): Promise<void> {
    if (!this.player) return;
    const clamped = Math.max(0, seconds);
    this.crossfadeGuard = false;
    try {
      await this.player.seekTo(clamped);
    } catch (err) {
      this.callbacks?.onError(
        err instanceof Error ? err.message : 'امکان جابه‌جایی زمان پخش وجود ندارد.'
      );
    }
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.min(2.0, Math.max(0.5, rate));
    try {
      this.player?.setPlaybackRate(this.playbackRate);
    } catch {
      // Ignore rate error if unloaded
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1.0, Math.max(0.0, volume));
    this.applyVolume();
  }

  setFadeMultiplier(multiplier: number): void {
    this.fadeMultiplier = Math.min(1.0, Math.max(0.0, multiplier));
    this.applyVolume();
  }

  setEqGainMultiplier(multiplier: number): void {
    this.eqGainMultiplier = Math.min(1.0, Math.max(0.5, multiplier));
    this.applyVolume();
  }

  setLoopCurrent(loop: boolean): void {
    this.loopCurrent = loop;
    if (this.player) {
      this.player.loop = loop;
    }
  }

  setGaplessPlayback(enabled: boolean): void {
    this.gaplessEnabled = enabled;
  }

  setCrossfadeSeconds(seconds: number): void {
    this.crossfadeSeconds = Math.max(0, Math.min(12, seconds));
  }

  updateMetadata(song: Song): void {
    try {
      this.player?.updateLockScreenMetadata({
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
    this.clearCrossfadeTimer();
    this.subscription?.remove();
    this.subscription = null;
    try {
      this.player?.clearLockScreenControls();
      this.player?.remove();
    } catch {
      // Ignore cleanup errors
    }
    this.player = null;
  }
}

export const audioEngine = new AudioEngine();
