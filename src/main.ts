import Phaser from 'phaser';
import { WORLD, TUNING } from './game/config';
import { GameScene } from './game/scenes/GameScene';
import './styles.css';

const stage = document.querySelector<HTMLDivElement>('#stage')!;
const viewport = document.querySelector<HTMLElement>('#viewport')!;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WORLD.width,
  height: WORLD.height,
  backgroundColor: '#e8d9ec',
  audio: { noAudio: true }, // SoundSystem owns the single gesture-unlocked audio context.
  physics: { default: 'matter', matter: {
    gravity: { x: 0, y: TUNING.gravity }, autoUpdate: false,
    enableSleeping: true, positionIterations: TUNING.positionIterations, velocityIterations: TUNING.velocityIterations,
  } },
  scale: { mode: Phaser.Scale.NONE, width: WORLD.width, height: WORLD.height },
  input: { activePointers: 1 },
  render: { antialias: true, roundPixels: false },
  scene: [GameScene],
});

function fit(): void {
  const scale = Math.min(viewport.clientWidth / WORLD.width, viewport.clientHeight / WORLD.height);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  // CSS transform is the equivalent of FIT; refresh input coordinates after viewport / safe-area changes.
  if (game.isBooted) {
    game.scale.updateBounds();
    game.scale.displayScale.set(WORLD.width / game.scale.canvasBounds.width, WORLD.height / game.scale.canvasBounds.height);
  }
}
new ResizeObserver(fit).observe(viewport);
window.visualViewport?.addEventListener('resize', fit);
game.events.once(Phaser.Core.Events.READY, fit);
fit();