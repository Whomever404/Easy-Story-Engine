import type { AudioCategory, AudioCrossModePolicy, AudioPlaybackOptions } from '../types';

export class AudioManager {
  private volumes: Record<AudioCategory, number> = {
    bgm: 0.8,
    bgs: 0.6,
    se: 0.9,
    me: 0.8,
  };

  private currentBgm: string | null = null;
  private currentBgs: string | null = null;
  private currentModePolicy: AudioCrossModePolicy = 'continue';

  private audioCtx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private bgsAudio: HTMLAudioElement | null = null;

  constructor(policy: AudioCrossModePolicy = 'continue') {
    this.currentModePolicy = policy;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setVolume(category: AudioCategory, volume: number): void {
    this.volumes[category] = Math.max(0, Math.min(1, volume));
    if (category === 'bgm' && this.bgmAudio) {
      this.bgmAudio.volume = this.volumes.bgm;
    }
    if (category === 'bgs' && this.bgsAudio) {
      this.bgsAudio.volume = this.volumes.bgs;
    }
  }

  public getVolume(category: AudioCategory): number {
    return this.volumes[category];
  }

  public setPolicy(policy: AudioCrossModePolicy): void {
    this.currentModePolicy = policy;
  }

  public getPolicy(): AudioCrossModePolicy {
    return this.currentModePolicy;
  }

  public getCurrentBgm(): string | null {
    return this.currentBgm;
  }

  public playBgm(track: string, options: AudioPlaybackOptions = {}): void {
    if (this.currentBgm === track && this.bgmAudio && !this.bgmAudio.paused) {
      return;
    }

    this.stopBgm(options.crossfadeDuration || 0.3);
    this.currentBgm = track;

    if (typeof Audio !== 'undefined' && track.startsWith('http') || track.startsWith('/') || track.startsWith('./') || track.startsWith('data:')) {
      try {
        const audio = new Audio(track);
        audio.loop = options.loop !== false;
        audio.volume = (options.volume ?? 1) * this.volumes.bgm;
        audio.playbackRate = options.pitch ?? 1;
        audio.play().catch(() => {
          // Autoplay policy or synthetic fallback
        });
        this.bgmAudio = audio;
        return;
      } catch {
        // Fall back to synthetic audio
      }
    }

    // Synthetic tone loop generator for web environment without external mp3
    this.playSyntheticBgmTone(track);
  }

  public stopBgm(fadeOutDuration: number = 0): void {
    if (this.bgmAudio) {
      const audio = this.bgmAudio;
      if (fadeOutDuration > 0) {
        const step = 0.05;
        const fadeInterval = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume = Math.max(0, audio.volume - step);
          } else {
            clearInterval(fadeInterval);
            audio.pause();
            audio.currentTime = 0;
          }
        }, (fadeOutDuration * 1000) / (audio.volume / step || 10));
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
      this.bgmAudio = null;
    }
    this.currentBgm = null;
  }

  public playBgs(track: string, options: AudioPlaybackOptions = {}): void {
    this.stopBgs();
    this.currentBgs = track;
    if (typeof Audio !== 'undefined' && (track.startsWith('http') || track.startsWith('/') || track.startsWith('./') || track.startsWith('data:'))) {
      try {
        const audio = new Audio(track);
        audio.loop = true;
        audio.volume = (options.volume ?? 1) * this.volumes.bgs;
        audio.play().catch(() => {});
        this.bgsAudio = audio;
      } catch {}
    }
  }

  public stopBgs(): void {
    if (this.bgsAudio) {
      this.bgsAudio.pause();
      this.bgsAudio = null;
    }
    this.currentBgs = null;
  }

  public playSe(track: string, options: AudioPlaybackOptions = {}): void {
    const vol = (options.volume ?? 1) * this.volumes.se;
    if (typeof Audio !== 'undefined' && (track.startsWith('http') || track.startsWith('/') || track.startsWith('./') || track.startsWith('data:'))) {
      try {
        const audio = new Audio(track);
        audio.volume = vol;
        audio.playbackRate = options.pitch ?? 1;
        audio.play().catch(() => {
          this.playSyntheticSe(track);
        });
        return;
      } catch {
        // fallback
      }
    }
    this.playSyntheticSe(track);
  }

  public playMe(track: string, options: AudioPlaybackOptions = {}): void {
    this.playSe(track, options);
  }

  // Synthesizer for retro sounds (dialogue blip, cursor, confirm, buzzer, breakthrough)
  private playSyntheticSe(effectType: string): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      const vol = this.volumes.se * 0.15;

      switch (effectType.toLowerCase()) {
        case 'cursor':
        case 'blip':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        case 'confirm':
        case 'decision':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880, now + 0.08); // A5
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.18);
          break;
        case 'cancel':
        case 'buzzer':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.setValueAtTime(140, now + 0.08);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        case 'breakthrough':
        case 'victory':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
          osc.frequency.setValueAtTime(1046.5, now + 0.24); // C6
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
          break;
        default:
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
      }
    } catch {}
  }

  private playSyntheticBgmTone(_track: string): void {
    // Ambient web audio tone for test/demo mode
  }
}
