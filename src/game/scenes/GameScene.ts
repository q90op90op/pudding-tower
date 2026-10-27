import Phaser from 'phaser';
import { COLORS, TUNING, WORLD } from '../config';
import { chooseExpression, choosePudding, chooseStyle, definitionFor, EXPRESSIONS, PUDDINGS, STYLES } from '../data/puddingDefinitions';
import { Pudding, PuddingView } from '../entities/Pudding';
import { cameraTarget, outsideWorld, supportedBodies } from '../systems/rules';
import { physicalContacts } from '../systems/contacts';
import { Records } from '../systems/records';
import { SoundSystem } from '../systems/SoundSystem';
import { GameOverlay } from '../ui/GameOverlay';
import type { GameState, PuddingDefinition, PuddingIdentity, StyleId, TowerSnapshot } from '../types';

const STYLE_NAMES: Record<StyleId, string> = { cute: '可愛療癒', weird: '荒謬搞怪', pixel: '復古像素', soft3d: '軟 Q 奶糖' };
interface CollisionEvent { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] }
export class GameScene extends Phaser.Scene {
  private state: GameState = 'MENU';
  private readonly records = new Records();
  private readonly sfx = new SoundSystem();
  private overlay!: GameOverlay;
  private plate!: MatterJS.BodyType;
  private guide!: Phaser.GameObjects.Graphics;
  private puddings: Pudding[] = [];
  private pending?: { definition: PuddingDefinition; identity: PuddingIdentity; view: PuddingView; x: number; y: number; angle: number };
  private active?: Pudding;
  private score = 0;
  private initialBest = 0;
  private bestTowerSnapshot: TowerSnapshot | null = null;
  private clock = 0;
  private swingTime = 0;
  private accumulator = 0;
  private confirmation = 0;
  private fallingTime = 0;
  private failureTime = 0;
  private collapseTime = 0;
  private serial = 0;
  private effectObjects = new Set<Phaser.GameObjects.GameObject>();
  private readonly params = new URLSearchParams(location.search);
  private readonly manual = import.meta.env.DEV && this.params.has('e2e');
  constructor() { super('Game'); }

  preload(): void {
    const loading = this.add.text(195, 400, '正在準備甜點…', { color: '#815049', fontSize: '18px' }).setOrigin(0.5);
    for (const definition of PUDDINGS) for (const style of STYLES) this.load.image(`body-${definition.shapeId}-${style}`, `${import.meta.env.BASE_URL}assets/puddings/${definition.shapeId}/${style}-body.png`);
    for (const style of STYLES) for (const expression of EXPRESSIONS) this.load.image(`face-${style}-${expression}`, `${import.meta.env.BASE_URL}assets/faces/${style}/${expression}.png`);
    for (const name of ['background', 'plate']) this.load.image(name, `${import.meta.env.BASE_URL}assets/ui/${name}.png`);
    this.load.once('complete', () => loading.destroy());
  }
  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background); this.matter.world.autoUpdate = false;
    for (const style of STYLES) if (style === 'pixel') {
      for (const d of PUDDINGS) this.textures.get(`body-${d.shapeId}-${style}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const expression of EXPRESSIONS) this.textures.get(`face-${style}-${expression}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.plate = this.matter.add.rectangle(WORLD.plateX, WORLD.plateY, WORLD.plateWidth, WORLD.plateHeight, { isStatic: true, label: 'plate', friction: 0.85, frictionStatic: 1.3, restitution: 0.02 });
    this.add.image(195, 422, 'background').setDisplaySize(390, 844).setScrollFactor(0).setDepth(-20);
    this.add.image(195, 767, 'plate').setDisplaySize(280, 62).setDepth(5);
    this.guide = this.add.graphics().setDepth(0);
    this.overlay = new GameOverlay({ start: () => this.startRound(), toggleSound: () => this.sfx.toggle(), soundEnabled: () => this.sfx.enabled });
    this.overlay.menu(this.records.best); this.input.on('pointerdown', this.drop, this);
    this.matter.world.on('collisionstart', this.onCollision, this);
    this.events.once('shutdown', () => { this.input.off('pointerdown', this.drop, this); this.matter.world.off('collisionstart', this.onCollision, this); this.overlay.destroy(); this.sfx.destroy(); delete window.__PUDDING_TEST__; });
    if (this.manual) this.installTestBridge();
  }
  private startRound(): void {
    this.sfx.unlock(); this.sfx.play('start');
    for (const pudding of this.puddings) pudding.destroy(this); this.puddings = [];
    for (const effect of this.effectObjects) effect.destroy(); this.effectObjects.clear(); this.tweens.killAll();
    this.pending?.view.destroy(); this.pending = undefined; this.active = undefined; this.score = 0; this.initialBest = this.records.best; this.bestTowerSnapshot = null;
    this.confirmation = this.fallingTime = this.failureTime = this.collapseTime = this.accumulator = this.clock = this.serial = 0;
    this.cameras.main.setScroll(0, 0); this.overlay.playing(); this.spawn();
  }
  private towerTop(): number { return Math.min(WORLD.plateY - WORLD.plateHeight / 2, ...this.puddings.filter(p => p.scored).map(p => p.body.bounds.min.y)); }
  private spawn(): void {
    let definition = choosePudding(this.score), style = chooseStyle(), expression = chooseExpression();
    if (this.manual) {
      definition = this.params.has('shape') ? definitionFor(this.params.get('shape')!) : PUDDINGS[this.score % (this.params.has('all-shapes') ? 10 : 3)];
      style = STYLES.includes(this.params.get('style') as StyleId) ? this.params.get('style') as StyleId : STYLES[this.score % 4]; expression = EXPRESSIONS[this.score % 6];
    }
    const identity: PuddingIdentity = { id: `pudding-${++this.serial}`, shapeId: definition.shapeId, styleId: style, expressionId: expression };
    this.pending = { definition, identity, view: new PuddingView(this, definition, identity).setDepth(20), x: 195, y: 0, angle: 0 };
    this.swingTime = 0; this.state = 'READY'; this.updatePending(); this.updateOverlay(); this.overlay.next(definition.name, STYLE_NAMES[style]);
  }
  private updatePending(): void {
    if (!this.pending) return;
    const phase = this.swingTime / TUNING.spawnPeriod * Math.PI * 2, d = this.pending.definition;
    const amplitude = Math.min(TUNING.spawnAmplitude, WORLD.width / 2 - d.width * 0.62 - 10);
    this.pending.x = WORLD.width / 2 + Math.sin(phase) * amplitude;
    this.pending.y = Math.min(this.cameras.main.scrollY + TUNING.spawnScreenY, this.towerTop() - TUNING.dropGap - d.height / 2);
    this.pending.angle = Math.sin(phase) * 0.045;
    this.pending.view.setPosition(this.pending.x, this.pending.y).setRotation(this.pending.angle).setScale(1 + Math.sin(phase * 2) * 0.018, 1 - Math.sin(phase * 2) * 0.018);
    this.guide.clear(); if (this.score < 3) { this.guide.lineStyle(1, COLORS.outline, 0.16); for (let y = this.pending.y + d.height / 2 + 28; y < this.towerTop() - 8; y += 12) this.guide.lineBetween(this.pending.x, y, this.pending.x, y + 3); }
  }
  private drop(): void {
    if (this.state !== 'READY' || !this.pending || document.hidden) return;
    const { definition, identity, x, y, angle, view } = this.pending; view.destroy(); this.pending = undefined; this.guide.clear();
    this.active = new Pudding(this, definition, identity, x, y, angle); this.puddings.push(this.active);
    this.state = 'FALLING'; this.confirmation = this.fallingTime = 0; this.sfx.play('drop'); this.updateOverlay();
  }
  update(_time: number, delta: number): void {
    if (this.manual || this.state === 'MENU' || this.state === 'GAME_OVER' || document.hidden) return;
    this.accumulator += Math.min(delta, TUNING.maxFrameDelta);
    while (this.accumulator >= TUNING.fixedStep) { this.tick(TUNING.fixedStep); this.accumulator -= TUNING.fixedStep; }
  }
  private tick(delta: number): void {
    if (this.state === 'MENU' || this.state === 'GAME_OVER') return;
    this.clock += delta; this.matter.world.step(delta);
    for (const p of this.puddings) p.sync(delta);
    if (this.state === 'COLLAPSING') {
      this.collapseTime += delta;
      if (this.collapseTime >= TUNING.collapseMs) this.endRound();
      return;
    }
    this.checkFailure(delta); if (this.failureTime >= TUNING.failMargins.graceMs) return;
    this.checkScore(delta);
    const target = cameraTarget(this.towerTop(), TUNING.cameraTargetY), camera = this.cameras.main;
    camera.scrollY += (target - camera.scrollY) * (1 - Math.exp(-TUNING.cameraSmoothing * delta / 1000));
    if (this.state === 'READY') { this.swingTime += delta; this.updatePending(); }
  }
  private checkScore(delta: number): void {
    const active = this.active; if (!active || active.scored || this.failureTime > 0) return;
    this.fallingTime += delta;
    const physicalBodies = [this.plate, ...this.puddings.filter(p => p.scored || p === active).map(p => p.body)];
    const contacts = physicalContacts(this.matter, physicalBodies);
    const bodies = physicalBodies.slice(1).map(body => ({ id: body.id, y: body.position.y, x: body.position.x, minX: body.bounds.min.x, maxX: body.bounds.max.x }));
    const supported = supportedBodies({ id: this.plate.id, y: this.plate.position.y, minX: this.plate.bounds.min.x, maxX: this.plate.bounds.max.x }, bodies, contacts);
    const b = active.body, towerConnected = this.puddings.filter(p => p.scored).every(p => supported.has(p.body.id));
    const stable = towerConnected && supported.has(b.id) && b.speed < TUNING.stabilityThreshold && Math.abs(b.angularVelocity) < TUNING.angularStabilityThreshold;
    if (stable) { if (this.confirmation === 0) this.state = 'CONFIRMING'; this.confirmation += delta; }
    else { this.confirmation = 0; this.state = 'FALLING'; }
    if (this.confirmation >= TUNING.confirmationMs) {
      active.scored = true; this.score++; this.records.record(this.score);
      this.bestTowerSnapshot = { score: this.score, capturedAt: Date.now(), puddings: this.puddings.filter(p => p.scored).map(p => p.snapshot()) };
      this.sparkles(b.position.x, b.position.y - active.definition.height / 2, true); this.sfx.play('score'); this.active = undefined; this.spawn();
    } else if (this.fallingTime > TUNING.maxFallingMs) this.beginCollapse();
  }
  private onCollision(event: CollisionEvent): void {
    if (this.state === 'MENU' || this.state === 'GAME_OVER') return;
    // Read relative velocity only. These reactions never apply force or change a Matter body.
    const reactions = new Map<Pudding, number>();
    for (const pair of event.pairs) {
      const a = pair.bodyA.parent ?? pair.bodyA, b = pair.bodyB.parent ?? pair.bodyB;
      const relativeSpeed = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      const intensity = Math.min(1, Math.max(0, (relativeSpeed - 0.35) / 4.5));
      const participants = this.puddings.filter(p => p.body === a || p.body === b);
      const hasFalling = participants.some(p => !p.scored);
      for (const p of participants) {
        const strength = intensity * (p.scored ? hasFalling ? 0.32 : 0.16 : 1);
        reactions.set(p, Math.max(reactions.get(p) ?? 0, strength));
      }
    }
    // Only two already-stacked neighbors react per collision batch; the tower is never squashed as a group.
    let neighbors = 0;
    for (const [p, strength] of [...reactions].sort((a, b) => b[1] - a[1])) {
      if (p.scored && neighbors++ >= 2) continue;
      p.impact(strength);
    }
    for (const pair of event.pairs) {
      const a = pair.bodyA.parent ?? pair.bodyA, b = pair.bodyB.parent ?? pair.bodyB;
      for (const pudding of this.puddings) {
        if (pudding.body !== a && pudding.body !== b) continue;
        if (this.clock - pudding.lastImpact < 180 || pudding.body.speed < 0.5) continue;
        pudding.lastImpact = this.clock;
        this.sparkles(pudding.body.position.x, pudding.body.bounds.max.y, false); this.sfx.play('land');
      }
    }
  }
  private sparkles(x: number, y: number, score: boolean): void {
    const graphic = this.add.graphics({ x, y }).setDepth(30); graphic.fillStyle(score ? 0xffe1a0 : 0xfff6e9, 0.9);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; graphic.fillEllipse(Math.cos(a) * 21, Math.sin(a) * 9, 3, 5); }
    this.effectObjects.add(graphic);
    this.tweens.add({ targets: graphic, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 440, onComplete: () => { this.effectObjects.delete(graphic); graphic.destroy(); } });
    if (score) {
      const text = this.add.text(x, y - 8, '+1', { fontFamily: 'Trebuchet MS', fontSize: '23px', fontStyle: 'bold', color: '#fff6e9', stroke: '#a45d49', strokeThickness: 3 }).setOrigin(0.5).setDepth(40);
      this.effectObjects.add(text); this.tweens.add({ targets: text, y: y - 42, alpha: 0, duration: 620, onComplete: () => { this.effectObjects.delete(text); text.destroy(); } });
    }
  }
  private checkFailure(delta: number): void {
    const failed = this.puddings.some(p => outsideWorld(p.body.position.x, p.body.position.y, WORLD.plateY, TUNING.failMargins));
    this.failureTime = failed ? this.failureTime + delta : 0;
    if (this.failureTime >= TUNING.failMargins.graceMs) this.beginCollapse();
  }
  private beginCollapse(): void {
    if (this.state === 'COLLAPSING' || this.state === 'GAME_OVER') return;
    this.state = 'COLLAPSING'; this.collapseTime = 0; this.pending?.view.destroy(); this.pending = undefined; this.guide.clear(); this.sfx.play('fail'); this.updateOverlay();
  }
  private endRound(): void {
    for (const pudding of this.puddings) pudding.resetVisual();
    this.state = 'GAME_OVER'; this.overlay.gameOver(this.score, this.records.best, this.score > this.initialBest, this.records.available, this.bestTowerSnapshot);
  }
  private updateOverlay(): void { this.overlay.update(this.score, this.records.best, this.state, this.records.available); }
  private installTestBridge(): void {
    window.__PUDDING_TEST__ = {
      advance: (ms: number) => { const steps = Math.round(Math.max(0, Math.min(ms, 60000)) / TUNING.fixedStep); for (let i = 0; i < steps; i++) this.tick(TUNING.fixedStep); },
      inspect: () => ({ state: this.state, score: this.score, best: this.records.best, clock: this.clock, scrollY: this.cameras.main.scrollY,
        pending: this.pending ? { x: this.pending.x, y: this.pending.y, width: this.pending.definition.width, height: this.pending.definition.height, ...this.pending.identity } : null,
        bodies: this.puddings.map(p => ({ ...p.snapshot(), scored: p.scored, mass: p.body.mass, partCount: p.body.parts.length, speed: p.body.speed, visualScaleY: p.view.scaleY, visualScaleX: p.view.scaleX, visualX: p.view.x, visualY: p.view.y, visualAngle: p.view.rotation, area: p.body.area, inertia: p.body.inertia })),
        snapshot: this.bestTowerSnapshot ? structuredClone(this.bestTowerSnapshot) : null, plate: { x: this.plate.position.x, y: this.plate.position.y }, soundEnabled: this.sfx.enabled, cardReady: this.overlay.cardReady,
      }),
    };
  }
}

declare global {
  interface Window { __PUDDING_TEST__?: {
    advance(ms: number): void;
    inspect(): { state: GameState; score: number; best: number; clock: number; scrollY: number;
      pending: ({ x: number; y: number; width: number; height: number } & PuddingIdentity) | null;
      bodies: (ReturnType<Pudding['snapshot']> & { scored: boolean; mass: number; partCount: number; speed: number; visualScaleY: number; visualScaleX: number; visualX: number; visualY: number; visualAngle: number; area: number; inertia: number })[];
      snapshot: TowerSnapshot | null; plate: { x: number; y: number }; soundEnabled: boolean; cardReady: boolean };
  } }
}