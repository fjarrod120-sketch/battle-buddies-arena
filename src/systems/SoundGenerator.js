// Procedural wacky sound effects via Web Audio API
export class SoundGenerator {
  constructor(scene) {
    this.scene = scene;
    this.ctx = null;
    this.enabled = true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _play(type, params) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = type || 'square';
    const now = this.ctx.currentTime;

    if (params.freq) osc.frequency.setValueAtTime(params.freq, now);
    if (params.freqEnd) osc.frequency.exponentialRampToValueAtTime(params.freqEnd, now + (params.dur || 0.2));
    gain.gain.setValueAtTime(params.vol || 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (params.dur || 0.2));

    osc.start(now);
    osc.stop(now + (params.dur || 0.2));
  }

  shoot() {
    // Quick ascending zap
    this._play('square', { freq: 300, freqEnd: 800, dur: 0.08, vol: 0.1 });
    this._play('sawtooth', { freq: 200, freqEnd: 600, dur: 0.06, vol: 0.05 });
  }

  hit() {
    // Thud + noise
    this._play('square', { freq: 150, freqEnd: 60, dur: 0.12, vol: 0.15 });
    this._play('sawtooth', { freq: 100, freqEnd: 40, dur: 0.15, vol: 0.08 });
  }

  explosion() {
    this._play('sawtooth', { freq: 200, freqEnd: 30, dur: 0.3, vol: 0.12 });
    this._play('square', { freq: 100, freqEnd: 20, dur: 0.25, vol: 0.1 });
  }

  coinCollect() {
    // Rising ding
    this._play('sine', { freq: 800, freqEnd: 1600, dur: 0.15, vol: 0.12 });
    setTimeout(() => {
      this._play('sine', { freq: 1200, freqEnd: 2400, dur: 0.1, vol: 0.08 });
    }, 100);
  }

  unlock() {
    // Triumphant arpeggio
    [0, 150, 300, 450].forEach((delay, i) => {
      setTimeout(() => {
        this._play('sine', { freq: 523 * (1 + i * 0.25), dur: 0.2, vol: 0.12 });
      }, delay);
    });
  }

  ability() {
    this._play('sawtooth', { freq: 400, freqEnd: 1200, dur: 0.2, vol: 0.12 });
    this._play('square', { freq: 600, freqEnd: 1800, dur: 0.15, vol: 0.08 });
  }

  menuClick() {
    this._play('sine', { freq: 600, freqEnd: 900, dur: 0.08, vol: 0.08 });
  }

  countdown() {
    this._play('square', { freq: 440, dur: 0.15, vol: 0.1 });
  }

  go() {
    this._play('sine', { freq: 880, dur: 0.3, vol: 0.15 });
  }

  victory() {
    [0, 200, 400, 600, 800].forEach((delay) => {
      setTimeout(() => {
        this._play('sine', { freq: 523 + delay * 0.5, dur: 0.25, vol: 0.12 });
      }, delay);
    });
  }

  defeat() {
    [0, 300, 600].forEach((delay) => {
      setTimeout(() => {
        this._play('sawtooth', { freq: 400 - delay, dur: 0.3, vol: 0.1 });
      }, delay);
    });
  }

  error() {
    this._play('square', { freq: 200, freqEnd: 100, dur: 0.2, vol: 0.12 });
  }
}
