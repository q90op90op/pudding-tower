import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Jiggle, JIGGLE, JIGGLE_DURATION } from '../src/game/animation/Jiggle';
import type {} from '../src/game/scenes/GameScene';

async function physicalTrace(page: Page) {
  await page.goto('http://127.0.0.1:5173/?e2e');
  await page.waitForFunction(() => !!window.__PUDDING_TEST__);
  await page.getByRole('button', { name: /開始遊戲/ }).click();
  const hashes: string[] = [];
  for (let layer = 1; layer <= 22; layer++) {
    await page.evaluate(() => {
      const bridge = window.__PUDDING_TEST__!;
      for (let i = 0; i < 220; i++) {
        if (Math.abs(bridge.inspect().pending!.x - 195) < 0.05) return;
        bridge.advance(1000 / 120);
      }
      throw new Error('No center crossing');
    });
    await page.locator('canvas').tap({ position: { x: 195, y: 420 } });
    const trace = await page.evaluate(() => {
      const bridge = window.__PUDDING_TEST__!, frames = [];
      for (let i = 0; i < 2400; i++) {
        bridge.advance(1000 / 120); const data = bridge.inspect();
        frames.push({ state: data.state, score: data.score, clock: data.clock, scrollY: data.scrollY,
          bodies: data.bodies.map(p => ({ id: p.id, x: p.x, y: p.y, angle: p.angle, mass: p.mass, speed: p.speed, parts: p.partCount, scored: p.scored })) });
        if (data.state === 'READY' || data.state === 'GAME_OVER') return frames;
      }
      throw new Error('Unresolved fall');
    });
    expect(trace[trace.length - 1].score).toBe(layer);
    hashes.push(createHash('sha256').update(JSON.stringify(trace)).digest('hex'));
  }
  return hashes;
}

test('Q 彈優化前後 22 層逐步物理軌跡完全相同', async ({ page }) => {
  const hashes = await physicalTrace(page);
  const baseline = JSON.parse(await readFile('tests/fixtures/physics-before-jiggle.json', 'utf8'));
  expect(hashes).toEqual(baseline.hashes);
});
test('90ms 壓縮、120ms 彈性伸長、330ms 餘震後精確恢復', () => {
  const jiggle = new Jiggle(); expect(jiggle.impact(1)).toBe(true);
  const squash = { ...jiggle.update(90) }; expect(squash.scaleX).toBeCloseTo(1.12, 10); expect(squash.scaleY).toBeCloseTo(0.86, 10);
  const stretch = { ...jiggle.update(120) }; expect(stretch.scaleX).toBeCloseTo(0.95, 10); expect(stretch.scaleY).toBeCloseTo(1.08, 10);
  const first = { ...jiggle.update(45) }, second = { ...jiggle.update(85) };
  expect(first.scaleY).toBeLessThan(1); expect(second.scaleY).toBeGreaterThan(1);
  expect(Math.abs(first.scaleY - 1)).toBeLessThan(0.04); expect(Math.abs(second.scaleY - 1)).toBeLessThan(Math.abs(first.scaleY - 1));
  expect(Math.abs(first.tilt)).toBeLessThanOrEqual(0.012);
  expect(jiggle.update(JIGGLE_DURATION - 340)).toEqual({ scaleX: 1, scaleY: 1, tilt: 0 }); expect(jiggle.active).toBe(false);
});

test('掉落拉伸隨速度平滑變化，靜止時恢復比例', () => {
  const gentle = new Jiggle(), fast = new Jiggle();
  expect(gentle.update(100, 4).scaleY).toBeGreaterThan(1);
  expect(fast.update(100, 12).scaleY).toBeGreaterThan(gentle.pose.scaleY);
  expect(fast.pose.scaleY).toBeLessThanOrEqual(1 + JIGGLE.maxFallStretch);
  expect(fast.pose.scaleX).toBeGreaterThan(0.98);
  expect(fast.update(2000, 0)).toEqual({ scaleX: 1, scaleY: 1, tilt: 0 });
});

test('冷卻、較強撞擊覆蓋、弱接觸忽略及 reset 不累積倍率', () => {
  const jiggle = new Jiggle(); jiggle.impact(1); jiggle.update(90); expect(jiggle.impact(1)).toBe(false);
  jiggle.update(130); expect(jiggle.impact(0.2)).toBe(false);
  const before = { ...jiggle.pose }; expect(jiggle.impact(0.95)).toBe(true); expect(jiggle.update(0)).toEqual(before);
  for (let i = 0; i < 100; i++) {
    for (let time = 0; time < 240; time += 8) {
      const pose = jiggle.update(8); expect(pose.scaleX).toBeGreaterThan(0.93); expect(pose.scaleX).toBeLessThanOrEqual(1.121); expect(pose.scaleY).toBeGreaterThanOrEqual(0.859); expect(pose.scaleY).toBeLessThan(1.11);
    }
    jiggle.impact(1);
  }
  jiggle.reset(); expect(jiggle.pose).toEqual({ scaleX: 1, scaleY: 1, tilt: 0 }); expect(jiggle.active).toBe(false);
});

test('相同動畫時間在 60Hz 與 120Hz 更新下得到相同比例', () => {
  const sixty = new Jiggle(), oneTwenty = new Jiggle(); sixty.impact(0.8); oneTwenty.impact(0.8);
  for (let i = 0; i < 18; i++) sixty.update(1000 / 60);
  for (let i = 0; i < 36; i++) oneTwenty.update(1000 / 120);
  expect(sixty.pose.scaleX).toBeCloseTo(oneTwenty.pose.scaleX, 10); expect(sixty.pose.scaleY).toBeCloseTo(oneTwenty.pose.scaleY, 10);
});

for (const style of ['cute', 'weird', 'pixel', 'soft3d']) test(`十種 ${style} 的落地 Q 彈、底部支點與剛體尺寸不變`, async ({ page }, testInfo) => {
  for (const shape of ['classic', 'tall', 'flat', 'tilted', 'double', 'mushroom', 'longface', 'burst', 'platform', 'oddball']) {
    await page.goto(`http://127.0.0.1:5173/?e2e&shape=${shape}&style=${style}`); await page.waitForFunction(() => !!window.__PUDDING_TEST__);
    await page.getByRole('button', { name: /開始遊戲/ }).click(); await page.locator('canvas').tap({ position: { x: 195, y: 420 } });
    const frames = await page.evaluate(() => {
      const bridge = window.__PUDDING_TEST__!, frames = []; let collisionAt = -1;
      for (let i = 0; i < 900; i++) {
        bridge.advance(1000 / 120); const data = bridge.inspect(), p = data.bodies[0]; frames.push({ ...p, clock: data.clock });
        if (collisionAt < 0 && p.visualScaleY < 0.99) collisionAt = data.clock;
        if (collisionAt > 0 && data.clock - collisionAt > 800 && data.score === 1) break;
      }
      return frames;
    });
    expect(frames.some(p => p.visualScaleY > 1.01), shape).toBe(true);
    expect(Math.min(...frames.map(p => p.visualScaleY)), shape).toBeLessThan(0.92);
    expect(Math.max(...frames.map(p => p.visualScaleY)), shape).toBeGreaterThan(1.05);
    const last = frames[frames.length - 1]; expect(last.visualScaleX, shape).toBe(1); expect(last.visualScaleY, shape).toBe(1);
    for (const p of frames) {
      expect(p.area).toBe(frames[0].area); expect(p.mass).toBe(frames[0].mass); expect(p.inertia).toBe(frames[0].inertia);
      const anchor = p.height / 2;
      const physicalX = p.x + Math.cos(p.angle) * p.offsetX - Math.sin(p.angle) * (p.offsetY + anchor);
      const physicalY = p.y + Math.sin(p.angle) * p.offsetX + Math.cos(p.angle) * (p.offsetY + anchor);
      const visualX = p.visualX - Math.sin(p.visualAngle) * anchor * p.visualScaleY;
      const visualY = p.visualY + Math.cos(p.visualAngle) * anchor * p.visualScaleY;
      expect(visualX, shape).toBeCloseTo(physicalX, 7); expect(visualY, shape).toBeCloseTo(physicalY, 7);
    }
    if (shape === 'classic') await page.screenshot({ path: testInfo.outputPath(`${style}-settled.png`) });
  }
});

test('新布丁主撞擊與直接承重鄰居的弱連鎖有明顯強弱差', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/?e2e'); await page.waitForFunction(() => !!window.__PUDDING_TEST__); await page.getByRole('button', { name: /開始遊戲/ }).click();
  await page.locator('canvas').tap({ position: { x: 195, y: 420 } });
  await page.evaluate(() => { const b = window.__PUDDING_TEST__!; for (let i = 0; i < 900; i++) { b.advance(1000 / 120); if (b.inspect().score === 1) break; } for (let i = 0; i < 220; i++) { if (Math.abs(b.inspect().pending!.x - 195) < 0.05) break; b.advance(1000 / 120); } });
  await page.locator('canvas').tap({ position: { x: 195, y: 420 } });
  const frames = await page.evaluate(() => {
    const b = window.__PUDDING_TEST__!, frames = []; for (let i = 0; i < 400; i++) { b.advance(1000 / 120); frames.push(b.inspect().bodies); } return frames;
  });
  const baseMin = Math.min(...frames.map(f => f[0].visualScaleY)), topMin = Math.min(...frames.map(f => f[1].visualScaleY));
  expect(baseMin).toBeGreaterThanOrEqual(0.953); expect(baseMin).toBeLessThan(0.995); expect(topMin).toBeLessThan(baseMin - 0.025);
  expect(frames[frames.length - 1].every(p => p.visualScaleX === 1 && p.visualScaleY === 1)).toBe(true);
});

test('結算清除視覺餘震，重新開始不保留舊動畫', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/?e2e'); await page.waitForFunction(() => !!window.__PUDDING_TEST__); await page.getByRole('button', { name: /開始遊戲/ }).click();
  await page.evaluate(() => window.__PUDDING_TEST__!.advance(450)); await page.locator('canvas').tap({ position: { x: 195, y: 420 } });
  await page.evaluate(() => { const b = window.__PUDDING_TEST__!; for (let i = 0; i < 2400; i++) { b.advance(1000 / 120); if (b.inspect().state === 'GAME_OVER') return; } });
  const ended = await page.evaluate(() => window.__PUDDING_TEST__!.inspect()); expect(ended.state).toBe('GAME_OVER');
  for (const p of ended.bodies) { expect(p.visualScaleX).toBe(1); expect(p.visualScaleY).toBe(1); expect(Math.sin(p.visualAngle - p.angle)).toBeCloseTo(0, 10); }
  await page.getByRole('button', { name: /再玩一次/ }).click(); const restarted = await page.evaluate(() => window.__PUDDING_TEST__!.inspect()); expect(restarted.bodies).toHaveLength(0); expect(restarted.score).toBe(0);
});
test.describe('桌機滑鼠操作', () => {
  test.use({ hasTouch: false, viewport: { width: 1280, height: 900 } });
  test('實際渲染壓縮、回彈、餘震與復原畫面', async ({ page }, testInfo) => {
    await page.goto('http://127.0.0.1:5173/?e2e'); await page.waitForFunction(() => !!window.__PUDDING_TEST__);
    await page.getByRole('button', { name: /開始遊戲/ }).click(); await page.locator('canvas').click({ position: { x: 195, y: 420 } });
    const squash = await page.evaluate(() => {
      const b = window.__PUDDING_TEST__!; for (let i = 0; i < 1000; i++) { b.advance(1000 / 120); const p = b.inspect().bodies[0]; if (p.visualScaleY < 0.87) return p; } throw new Error('No squash');
    });
    expect(squash.visualScaleX).toBeGreaterThan(1.1); await page.locator('#stage').screenshot({ path: testInfo.outputPath('squash.png') });
    await page.evaluate(() => { const b = window.__PUDDING_TEST__!; for (let i = 0; i < 100; i++) { b.advance(1000 / 120); if (b.inspect().bodies[0].visualScaleY > 1.07) return; } throw new Error('No stretch'); });
    await page.locator('#stage').screenshot({ path: testInfo.outputPath('stretch.png') });
    await page.evaluate(() => window.__PUDDING_TEST__!.advance(110)); await page.locator('#stage').screenshot({ path: testInfo.outputPath('jiggle.png') });
    await page.evaluate(() => window.__PUDDING_TEST__!.advance(650)); const restored = await page.evaluate(() => window.__PUDDING_TEST__!.inspect().bodies[0]);
    expect(restored.visualScaleX).toBe(1); expect(restored.visualScaleY).toBe(1); await page.locator('#stage').screenshot({ path: testInfo.outputPath('restored.png') });
  });
});