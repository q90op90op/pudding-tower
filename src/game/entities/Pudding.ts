import Phaser from 'phaser';
import { TUNING } from '../config';
import { ART_PAD } from '../art/puddingArt';
import { Jiggle } from '../animation/Jiggle';
import type { ExpressionId, PuddingDefinition, PuddingIdentity, PuddingSnapshot } from '../types';

export class PuddingView extends Phaser.GameObjects.Container {
  private readonly faceImage: Phaser.GameObjects.Image;
  expression: ExpressionId;
  constructor(scene: Phaser.Scene, readonly definition: PuddingDefinition, readonly identity: PuddingIdentity) {
    super(scene, 0, 0); scene.add.existing(this); this.expression = identity.expressionId;
    const body = scene.add.image(0, 0, `body-${definition.shapeId}-${identity.styleId}`).setDisplaySize(definition.width + ART_PAD * 2, definition.height + ART_PAD * 2);
    this.faceImage = scene.add.image(definition.face.x, definition.face.y, `face-${identity.styleId}-${identity.expressionId}`).setDisplaySize(48 * definition.face.scale, 36 * definition.face.scale);
    this.add([body, this.faceImage]);
  }
  setExpression(expression: ExpressionId): void {
    if (this.expression === expression) return;
    this.expression = expression; this.faceImage.setTexture(`face-${this.identity.styleId}-${expression}`);
  }
}

function centroid(points: { x: number; y: number }[]): { x: number; y: number } {
  let area = 0, x = 0, y = 0;
  for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; const cross = a.x * b.y - b.x * a.y; area += cross; x += (a.x + b.x) * cross; y += (a.y + b.y) * cross; }
  return { x: x / (3 * area), y: y / (3 * area) };
}

export class Pudding {
  readonly body: MatterJS.BodyType;
  readonly view: PuddingView;
  readonly offset: { x: number; y: number };
  scored = false;
  lastImpact = -1000;
  private readonly jiggle = new Jiggle();

  constructor(scene: Phaser.Scene, readonly definition: PuddingDefinition, readonly identity: PuddingIdentity, x: number, y: number, angle: number) {
    const options = { label: identity.id, density: TUNING.density, friction: definition.friction,
      frictionStatic: TUNING.frictionStatic, restitution: definition.restitution,
      frictionAir: TUNING.frictionAir, sleepThreshold: TUNING.sleepThreshold, slop: 0.025 };
    const parts = definition.hulls.map(hull => {
      const vertices = hull.points.map(([px, py]) => ({ x: px * definition.width, y: py * definition.height }));
      const center = centroid(vertices);
      return scene.matter.bodies.fromVertices(center.x, center.y, [vertices], { ...options, density: TUNING.density * (hull.densityScale ?? 1) });
    });
    this.body = parts.length === 1 ? parts[0] : scene.matter.body.create({ ...options, parts });
    if (definition.center.x || definition.center.y) scene.matter.body.setCentre(this.body, definition.center, true);
    this.offset = { x: -this.body.position.x, y: -this.body.position.y };
    scene.matter.body.setMass(this.body, definition.mass);
    scene.matter.body.setInertia(this.body, this.body.inertia * definition.inertia);
    scene.matter.body.setPosition(this.body, { x, y });
    scene.matter.body.setAngle(this.body, angle);
    scene.matter.world.add(this.body);
    this.view = new PuddingView(scene, definition, identity).setDepth(10);
    this.sync();
  }

  impact(strength = 1): boolean { return this.jiggle.impact(strength); }

  sync(delta = 0): void {
    const pose = this.jiggle.update(delta, this.scored ? 0 : Math.max(0, this.body.velocity.y));
    const angle = this.body.angle, visualAngle = angle + pose.tilt, anchorY = this.definition.height / 2;
    // Keep the local bottom-center attached to the same physical point during squash and tilt.
    const anchorX = this.body.position.x + Math.cos(angle) * this.offset.x - Math.sin(angle) * (this.offset.y + anchorY);
    const anchorWorldY = this.body.position.y + Math.sin(angle) * this.offset.x + Math.cos(angle) * (this.offset.y + anchorY);
    this.view.setPosition(anchorX + Math.sin(visualAngle) * anchorY * pose.scaleY, anchorWorldY - Math.cos(visualAngle) * anchorY * pose.scaleY);
    this.view.setRotation(visualAngle).setScale(pose.scaleX, pose.scaleY);
    const panic = Math.abs(angle) > 0.24 || Math.abs(this.body.angularVelocity) > 0.055;
    this.view.setExpression(panic ? 'surprised' : this.identity.expressionId);
  }
  resetVisual(): void { this.jiggle.reset(); this.sync(0); }
  snapshot(): PuddingSnapshot {
    return { ...this.identity, expressionId: this.view.expression, x: this.body.position.x, y: this.body.position.y, angle: this.body.angle,
      width: this.definition.width, height: this.definition.height, scaleX: 1, scaleY: 1, offsetX: this.offset.x, offsetY: this.offset.y };
  }
  destroy(scene: Phaser.Scene): void { this.jiggle.reset(); scene.matter.world.remove(this.body); this.view.destroy(); }
}