export type GameState = 'MENU' | 'READY' | 'FALLING' | 'CONFIRMING' | 'COLLAPSING' | 'GAME_OVER';
export type ShapeId = 'classic' | 'tall' | 'flat' | 'tilted' | 'double' | 'mushroom' | 'longface' | 'burst' | 'platform' | 'oddball';
export type StyleId = 'cute' | 'weird' | 'pixel' | 'soft3d';
export type ExpressionId = 'blank' | 'nervous' | 'crying' | 'angry' | 'dizzy' | 'surprised';
export interface HullDefinition { points: readonly (readonly [number, number])[]; densityScale?: number }
export interface PuddingDefinition {
  shapeId: ShapeId; name: string; width: number; height: number; weight: number;
  mass: number; friction: number; restitution: number; inertia: number;
  center: { x: number; y: number }; hulls: readonly HullDefinition[];
  face: { x: number; y: number; scale: number };
}
export interface PuddingIdentity { id: string; shapeId: ShapeId; styleId: StyleId; expressionId: ExpressionId }
export interface PuddingSnapshot extends PuddingIdentity {
  x: number; y: number; angle: number; width: number; height: number;
  scaleX: number; scaleY: number; offsetX: number; offsetY: number;
}
export interface TowerSnapshot { score: number; capturedAt: number; puddings: PuddingSnapshot[] }