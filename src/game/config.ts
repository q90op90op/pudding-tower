export const WORLD = { width: 390, height: 844, plateX: 195, plateY: 750, plateWidth: 216, plateHeight: 16 } as const;

// All distances use the 390 × 844 world coordinate system, time uses milliseconds.
export const TUNING = {
  gravity: 1.15,
  density: 0.0015,
  friction: 0.7,
  frictionStatic: 1.1,
  restitution: 0.06,
  frictionAir: 0.025,
  inertiaMultiplier: 3,
  sleepThreshold: 45,
  positionIterations: 16,
  velocityIterations: 12,
  fixedStep: 1000 / 120,
  maxFrameDelta: 100,
  spawnPeriod: 1800,
  spawnAmplitude: 124,
  spawnScreenY: 310,
  dropGap: 92,
  confirmationMs: 550,
  collapseMs: 950,
  stabilityThreshold: 1.4,
  angularStabilityThreshold: 0.055,
  maxFallingMs: 15000,
  failMargins: { left: -90, right: 480, bottom: 125, graceMs: 500 },
  cameraTargetY: 560,
  cameraSmoothing: 5,
} as const;

export const COLORS = { background: 0xe8d9ec, cream: 0xfff6e9, pudding: 0xf7d69d, caramel: 0xc48662, outline: 0xa45d49, purple: 0xa77cbd } as const;