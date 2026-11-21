import {
  createAudioPlayer,
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
  onError: (message: string) => void;
}

/**
 * Singleton AudioEngine managing a single expo-audio AudioPlayer instance,
 * background audio mode, lock screen & notification controls, and error recovery.
 */
class AudioEngine {
  private player: AudioPlayer | null = null;
  private isModeConfigured = false;
  private callbacks: AudioEngineCallbacks | null = null;
  private subscription: { remove: () => void } | null = null;
  private playbackRate = 1.0;
  private volume = 1.0;
  private loopCurrent = false;
  private finishGuard = false;

  setCallbacks(callbacks: AudioEngineCallbacks): void {
    this.callbacks = callbacks;
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
        interruptionMode: 'doNotMix',
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });

      this.isModeConfigured = true;
    } catch (err) {
      this.callbacks?.onError(
        err instanceof Error ? err.message : 'Failed to configure background audio session.'
      );
    }
  }

  private ensurePlayer(): AudioPlayer {
    if (this.player) return this.player;

    const player = createAudioPlayer(null, {
      updateInterval: 250,
      keepAudioSessionActive: true,
    });

    player.volume = this.volume;
    player.loop = this.loopCurrent;

    this.subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.error) {
        this.callbacks?.onError(status.error);
      }

      this.callbacks?.onStatusUpdate({
        isLoaded: status.isLoaded,
        isPlaying: status.playing,
        isBuffering: status.isBuffering,
        position: Number.isFinite(status.currentTime) ? status.currentTime : 0,
        duration: Number.isFinite(status.duration) ? status.duration : 0,
        didJustFinish: status.didJustFinish,
        error: status.error,
      });

      if (status.didJustFinish && !this.loopCurrent && !this.finishGuard) {
        this.finishGuard = true;
        this.callbacks?.onTrackFinished();
      } else if (!status.didJustFinish) {
        this.finishGuard = false;
      }
    });

    this.player = player;
    return player;
  }

  async loadAndPlay(song: Song, autoPlay = true): Promise<void> {
    await this.configureAudioSession();
    this.finishGuard = false;

    try {
      const player = this.ensurePlayer();
      player.replace({ uri: song.fileUri, name: song.title });
      player.volume = this.volume;
      player.loop = this.loopCurrent;
      player.setPlaybackRate(this.playbackRate);

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
          }
        );
      } catch {
        // Lock screen controls are not supported on web
      }

      if (autoPlay) {
        player.play();
      }
    } catch (err) {
      this.callbacks?.onError(
        err instanceof Error
          ? `Unable to play "${song.title}": ${err.message}`
          : `Unable to play "${song.title}". The audio file may be unavailable.`
      );
    }
  }

  play(): void {
    try {
      this.player?.play();
    } catch (err) {
      this.callbacks?.onError(
        err instanceof Error ? err.message : 'Unable to resume playback.'
      );
    }
  }

  pause(): void {
    try {
      this.player?.pause();
    } catch {
      // Ignore pause errors when unloaded
    }
  }

  async stop(): Promise<void> {
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
    try {
      await this.player.seekTo(clamped);
    } catch (err) {
      this.callbacks?.onError(err instanceof Error ? err.message : 'Unable to seek audio.');
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
    if (this.player) {
      this.player.volume = this.volume;
    }
  }

  setLoopCurrent(loop: boolean): void {
    this.loopCurrent = loop;
    if (this.player) {
      this.player.loop = loop;
    }
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
