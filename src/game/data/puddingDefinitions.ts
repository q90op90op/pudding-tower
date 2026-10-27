import type { ExpressionId, HullDefinition, PuddingDefinition, StyleId } from '../types';

const trapezoid = (taper: number): HullDefinition => ({ points: [[-0.5 + taper, -0.5], [0.5 - taper, -0.5], [0.5, 0.5], [-0.5, 0.5]] });
export const PUDDINGS: readonly PuddingDefinition[] = [
  { shapeId: 'classic', name: '普通布丁', width: 90, height: 54, weight: 22, mass: 6.4152, friction: 0.7, restitution: 0.06, inertia: 3, center: { x: 0, y: 0 }, hulls: [trapezoid(0.12)], face: { x: 0, y: 7, scale: 1 } },
  { shapeId: 'tall', name: '高瘦布丁', width: 48, height: 86, weight: 10, mass: 5.94432, friction: 0.72, restitution: 0.04, inertia: 3.2, center: { x: 0, y: 0 }, hulls: [trapezoid(0.04)], face: { x: 0, y: 7, scale: 0.76 } },
  { shapeId: 'flat', name: '扁胖布丁', width: 126, height: 35, weight: 16, mass: 5.9535, friction: 0.8, restitution: 0.05, inertia: 3, center: { x: 0, y: 0 }, hulls: [trapezoid(0.10)], face: { x: 0, y: 3, scale: 0.8 } },
  { shapeId: 'tilted', name: '歪歪布丁', width: 80, height: 65, weight: 10, mass: 6.5, friction: 0.72, restitution: 0.05, inertia: 3, center: { x: 3, y: 1 }, hulls: [{ points: [[-0.22, -0.5], [0.48, -0.36], [0.34, 0.5], [-0.5, 0.5]] }], face: { x: 3, y: 8, scale: 0.95 } },
  { shapeId: 'double', name: '雙層布丁', width: 94, height: 84, weight: 8, mass: 9.2, friction: 0.8, restitution: 0.035, inertia: 3.5, center: { x: 0, y: 0 }, hulls: [
    { points: [[-0.3, -0.5], [0.3, -0.5], [0.39, 0.03], [-0.39, 0.03]], densityScale: 0.9 },
    { points: [[-0.39, -0.03], [0.39, -0.03], [0.5, 0.5], [-0.5, 0.5]], densityScale: 1.1 },
  ], face: { x: 0, y: 20, scale: 0.95 } },
  { shapeId: 'mushroom', name: '香菇布丁', width: 100, height: 82, weight: 7, mass: 8.2, friction: 0.76, restitution: 0.04, inertia: 3.2, center: { x: 0, y: -2 }, hulls: [
    { points: [[-0.18, -0.5], [0.18, -0.5], [0.44, -0.29], [0.5, -0.04], [-0.5, -0.04], [-0.44, -0.29]], densityScale: 1.35 },
    { points: [[-0.23, -0.08], [0.23, -0.08], [0.27, 0.5], [-0.27, 0.5]], densityScale: 0.8 },
  ], face: { x: 0, y: 18, scale: 0.8 } },
  { shapeId: 'longface', name: '長臉布丁', width: 48, height: 103, weight: 5, mass: 6.6, friction: 0.75, restitution: 0.03, inertia: 3.4, center: { x: -1, y: 2 }, hulls: [{ points: [[-0.21, -0.5], [0.35, -0.46], [0.49, 0.43], [0.3, 0.5], [-0.5, 0.5], [-0.42, 0.2]] }], face: { x: 1, y: -6, scale: 0.74 } },
  { shapeId: 'burst', name: '爆漿布丁', width: 112, height: 56, weight: 8, mass: 7.7, friction: 0.9, restitution: 0.035, inertia: 3.4, center: { x: 2, y: 2 }, hulls: [{ points: [[-0.27, -0.5], [0.22, -0.5], [0.43, -0.16], [0.5, 0.4], [0.28, 0.5], [-0.5, 0.5], [-0.45, -0.12]] }], face: { x: -4, y: 7, scale: 0.95 } },
  { shapeId: 'platform', name: '平台布丁', width: 142, height: 43, weight: 11, mass: 8.8, friction: 0.92, restitution: 0.025, inertia: 4, center: { x: 0, y: 1 }, hulls: [
    { points: [[-0.36, -0.5], [0.36, -0.5], [0.41, 0.05], [-0.41, 0.05]] },
    { points: [[-0.43, 0], [0.43, 0], [0.5, 0.5], [-0.5, 0.5]], densityScale: 1.25 },
  ], face: { x: 0, y: 8, scale: 0.8 } },
  { shapeId: 'oddball', name: '怪奇布丁', width: 88, height: 74, weight: 3, mass: 8, friction: 0.8, restitution: 0.075, inertia: 3.5, center: { x: -3, y: 2 }, hulls: [{ points: [[-0.18, -0.5], [0.19, -0.47], [0.45, -0.14], [0.5, 0.35], [0.24, 0.5], [-0.48, 0.5], [-0.5, 0.1], [-0.34, -0.28]] }], face: { x: -4, y: 12, scale: 1.05 } },
];
export const STYLE_WEIGHTS: Readonly<Record<StyleId, number>> = { cute: 45, weird: 25, pixel: 15, soft3d: 15 };
export const STYLES = Object.keys(STYLE_WEIGHTS) as StyleId[];
export const EXPRESSIONS: readonly ExpressionId[] = ['blank', 'nervous', 'crying', 'angry', 'dizzy', 'surprised'];
export const definitionFor = (id: string): PuddingDefinition => PUDDINGS.find(p => p.shapeId === id) ?? PUDDINGS[0];
export function weightedPick<T>(values: readonly T[], weight: (value: T) => number, random = Math.random): T {
  let roll = random() * values.reduce((sum, item) => sum + weight(item), 0);
  for (const value of values) { roll -= weight(value); if (roll < 0) return value; }
  return values[values.length - 1];
}
export function choosePudding(index: number, random = Math.random): PuddingDefinition {
  return index === 0 ? PUDDINGS[0] : weightedPick(PUDDINGS, p => p.weight, random);
}
export const chooseStyle = (random = Math.random): StyleId => weightedPick(STYLES, style => STYLE_WEIGHTS[style], random);
export const chooseExpression = (random = Math.random): ExpressionId => EXPRESSIONS[Math.floor(random() * EXPRESSIONS.length)];
export function seededRandom(seed: number): () => number {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let value = Math.imul(seed ^ seed >>> 15, 1 | seed); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
}