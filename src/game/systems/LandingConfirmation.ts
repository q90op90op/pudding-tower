/** Accumulate actual stable time; brief solver jitter pauses rather than erases it. */
export class LandingConfirmation {
  private stableMs = 0;
  private interruptionMs = 0;
  constructor(private readonly durationMs: number, private readonly graceMs: number) {}

  get pending(): boolean { return this.stableMs > 0; }

  reset(): void { this.stableMs = this.interruptionMs = 0; }

  update(stable: boolean, delta: number): boolean {
    if (stable) {
      this.interruptionMs = 0;
      this.stableMs += delta;
    } else {
      this.interruptionMs += delta;
      if (this.interruptionMs > this.graceMs) this.stableMs = 0;
    }
    // A grace period never counts as stable time or confirms an unsupported body.
    return stable && this.stableMs >= this.durationMs;
  }
}