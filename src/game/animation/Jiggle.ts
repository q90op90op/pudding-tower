/** Visual-only animation. No Matter objects or physics mutations enter this module. */
export const JIGGLE = {
  squashMs: 90, stretchMs: 120, settleMs: 330, cooldownMs: 200,
  squashX: 1.12, squashY: 0.86, stretchX: 0.95, stretchY: 1.08,
  maxFallStretch: 0.035, visualTilt: 0.012,
} as const;
export const JIGGLE_DURATION = JIGGLE.squashMs + JIGGLE.stretchMs + JIGGLE.settleMs;
export interface VisualPose { scaleX: number; scaleY: number; tilt: number }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export class Jiggle {
  readonly pose: VisualPose = { scaleX: 1, scaleY: 1, tilt: 0 };
  private elapsed = JIGGLE_DURATION;
  private cooldown = 0;
  private strength = 0;
  private fromX = 1;
  private fromY = 1;
  private fromTilt = 0;
  private fallStretch = 0;
  get active(): boolean { return this.elapsed < JIGGLE_DURATION; }

  impact(strength: number): boolean {
    strength = Number.isFinite(strength) ? clamp(strength, 0, 1) : 0;
    if (strength < 0.03 || this.cooldown > 0 || (this.active && strength < this.strength * 0.7)) return false;
    // Restart from the current absolute pose, never multiply or stack scale factors.
    this.fromX = this.pose.scaleX; this.fromY = this.pose.scaleY; this.fromTilt = this.pose.tilt;
    this.strength = strength; this.elapsed = 0; this.cooldown = JIGGLE.cooldownMs; this.fallStretch = 0;
    return true;
  }

  update(delta: number, downwardSpeed = 0): VisualPose {
    delta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (!this.active) {
      const target = clamp(downwardSpeed / 12, 0, 1) * JIGGLE.maxFallStretch;
      this.fallStretch += (target - this.fallStretch) * (1 - Math.exp(-delta / 65));
      if (target === 0 && this.fallStretch < 0.0001) this.fallStretch = 0;
      this.pose.scaleX = 1 - this.fallStretch * 0.55; this.pose.scaleY = 1 + this.fallStretch; this.pose.tilt = 0;
      return this.pose;
    }
    this.elapsed = Math.min(JIGGLE_DURATION, this.elapsed + delta);
    const strength = this.strength;
    const squashX = 1 + (JIGGLE.squashX - 1) * strength, squashY = 1 + (JIGGLE.squashY - 1) * strength;
    const stretchX = 1 + (JIGGLE.stretchX - 1) * strength, stretchY = 1 + (JIGGLE.stretchY - 1) * strength;
    if (this.elapsed <= JIGGLE.squashMs) {
      const t = this.elapsed / JIGGLE.squashMs, ease = 1 - (1 - t) ** 3;
      this.pose.scaleX = lerp(this.fromX, squashX, ease); this.pose.scaleY = lerp(this.fromY, squashY, ease); this.pose.tilt = this.fromTilt * (1 - ease);
    } else if (this.elapsed <= JIGGLE.squashMs + JIGGLE.stretchMs) {
      const t = (this.elapsed - JIGGLE.squashMs) / JIGGLE.stretchMs, back = 1.15;
      const ease = 1 + (back + 1) * (t - 1) ** 3 + back * (t - 1) ** 2;
      this.pose.scaleX = lerp(squashX, stretchX, ease); this.pose.scaleY = lerp(squashY, stretchY, ease); this.pose.tilt = 0;
    } else {
      const time = this.elapsed - JIGGLE.squashMs - JIGGLE.stretchMs, t = time / JIGGLE.settleMs;
      const envelope = Math.exp(-time / 115) * (1 - t) ** 2, wave = Math.cos(time / 135 * Math.PI * 2);
      this.pose.scaleX = 1 + (stretchX - 1) * envelope * wave; this.pose.scaleY = 1 + (stretchY - 1) * envelope * wave;
      this.pose.tilt = Math.sin(time / 135 * Math.PI * 2) * envelope * JIGGLE.visualTilt * strength;
    }
    if (!this.active) { this.pose.scaleX = this.pose.scaleY = 1; this.pose.tilt = 0; }
    return this.pose;
  }
  reset(): void {
    this.elapsed = JIGGLE_DURATION; this.cooldown = this.strength = this.fallStretch = 0;
    this.pose.scaleX = this.pose.scaleY = 1; this.pose.tilt = 0;
  }
}