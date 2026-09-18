class SirenSoundService {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: any = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.8;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && this.isPlaying) {
      this.stop();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.3, this.audioCtx.currentTime);
    }
  }

  /**
   * Start dual-frequency security siren oscillator (European two-tone + wail)
   */
  public playSiren(durationSeconds: number = 10) {
    if (this.muted) return;
    this.initContext();
    if (!this.audioCtx) return;

    this.stop();
    this.isPlaying = true;

    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      let isHigh = false;
      const startTime = ctx.currentTime;
      osc.frequency.setValueAtTime(750, startTime);
      osc.start(startTime);

      this.oscillator = osc;
      this.gainNode = gain;

      // Two-tone alternating frequency modulation
      this.intervalId = setInterval(() => {
        if (!this.isPlaying || !this.oscillator) return;
        isHigh = !isHigh;
        const targetFreq = isHigh ? 1150 : 750;
        this.oscillator.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.15);
      }, 350);

      // Auto stop after duration
      setTimeout(() => {
        if (this.isPlaying) {
          this.stop();
        }
      }, durationSeconds * 1000);
    } catch (e) {
      console.warn('Audio playback error (browser policy):', e);
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {}
      this.oscillator = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {}
      this.gainNode = null;
    }
  }

  /**
   * Play 1.2 second security siren alert beep sequence
   */
  public playEmergencyBeep(durationSeconds: number = 1.2) {
    if (this.muted) return;
    this.initContext();
    if (!this.audioCtx) return;

    this.stop();
    this.isPlaying = true;

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Pulse helper
      const playPulse = (startTime: number, freq: number, duration: number, type: OscillatorType = 'triangle') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.3 * this.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // 1. First warning pulse (920Hz)
      playPulse(now, 920, 0.22, 'triangle');

      // 2. Second alert pulse (1180Hz)
      playPulse(now + 0.28, 1180, 0.22, 'triangle');

      // 3. Main authorization alert burst (1480Hz -> 980Hz)
      const mainOsc = ctx.createOscillator();
      const mainGain = ctx.createGain();

      mainOsc.type = 'sawtooth';
      mainOsc.frequency.setValueAtTime(1480, now + 0.56);
      mainOsc.frequency.exponentialRampToValueAtTime(980, now + 1.15);

      mainGain.gain.setValueAtTime(0.28 * this.volume, now + 0.56);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.18);

      mainOsc.connect(mainGain);
      mainGain.connect(ctx.destination);

      mainOsc.start(now + 0.56);
      mainOsc.stop(now + 1.18);

      this.oscillator = mainOsc;
      this.gainNode = mainGain;

      setTimeout(() => {
        if (this.isPlaying) {
          this.stop();
        }
      }, durationSeconds * 1000);
    } catch (e) {
      console.warn('Audio playback error (browser policy):', e);
    }
  }


  /**
   * Play subtle notification beep for standard alerts
   */
  public playBeep() {
    if (this.muted) return;
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5

      gain.gain.setValueAtTime(0.15 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }
}

export const sirenAudio = new SirenSoundService();

