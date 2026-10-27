type Sound = 'start' | 'drop' | 'land' | 'score' | 'fail';
const KEY = 'pudding-tower.sound.v1';
export class SoundSystem {
  enabled = true;
  private context?: AudioContext;
  private gain?: GainNode;
  private lastLand = -Infinity;
  constructor() { try { this.enabled = localStorage.getItem(KEY) !== 'off'; } catch { /* Keep the in-memory preference. */ } }
  unlock(): void {
    if (!this.enabled) return;
    try {
      const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      if (!this.context) { this.context = new Constructor(); this.gain = this.context.createGain(); this.gain.gain.value = 0.18; this.gain.connect(this.context.destination); }
      void this.context.resume().catch(() => {});
    } catch { /* Audio is optional; the game remains playable. */ }
  }
  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.gain) this.gain.gain.value = this.enabled ? 0.18 : 0;
    if (this.enabled) this.unlock();
    try { localStorage.setItem(KEY, this.enabled ? 'on' : 'off'); } catch {}
    return this.enabled;
  }
  play(sound: Sound): void {
    if (!this.enabled || !this.context || !this.gain || this.context.state !== 'running') return;
    if (sound === 'land' && this.context.currentTime - this.lastLand < 0.12) return;
    if (sound === 'land') this.lastLand = this.context.currentTime;
    const notes: Record<Sound, number[]> = { start: [392, 523.25, 659.25], drop: [440, 220], land: [180, 100], score: [523.25, 659.25, 783.99], fail: [392, 329.63, 261.63, 196] };
    notes[sound].forEach((frequency, i) => {
      const context = this.context!, start = context.currentTime + i * 0.075;
      const oscillator = context.createOscillator(), envelope = context.createGain();
      oscillator.type = sound === 'land' ? 'sine' : 'triangle'; oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * (sound === 'land' ? 0.6 : 0.98), start + 0.16);
      envelope.gain.setValueAtTime(0, start); envelope.gain.linearRampToValueAtTime(0.28, start + 0.008); envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      oscillator.connect(envelope); envelope.connect(this.gain!); oscillator.start(start); oscillator.stop(start + 0.22);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    });
  }
  destroy(): void { void this.context?.close().catch(() => {}); }
}