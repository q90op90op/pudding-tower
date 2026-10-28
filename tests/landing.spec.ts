import { test, expect } from '@playwright/test';
import { LandingConfirmation } from '../src/game/systems/LandingConfirmation';
import { TUNING } from '../src/game/config';
import type {} from '../src/game/scenes/GameScene';

test('短暫微晃暫停確認，累積足夠穩定時間才產生下一顆', () => {
  const confirmation = new LandingConfirmation(550, 100);
  expect(confirmation.update(true, 400)).toBe(false);
  expect(confirmation.update(false, 75)).toBe(false);
  expect(confirmation.pending).toBe(true);
  expect(confirmation.update(true, 149)).toBe(false);
  expect(confirmation.update(true, 1)).toBe(true);
});

test('持續滾動或失去支撐必須重新確認，寬限期間不能計分', () => {
  const confirmation = new LandingConfirmation(550, 100);
  confirmation.update(true, 540);
  expect(confirmation.update(false, 100)).toBe(false);
  expect(confirmation.update(false, 1)).toBe(false);
  expect(confirmation.pending).toBe(false);
  expect(confirmation.update(true, 549)).toBe(false);
  expect(confirmation.update(false, 50)).toBe(false);
  expect(confirmation.update(true, 1)).toBe(true);
  confirmation.reset();
  expect(confirmation.pending).toBe(false);
  expect(confirmation.update(false, 5000)).toBe(false);
  expect(confirmation.update(true, 1)).toBe(false);
  expect(TUNING.maxFallingMs).toBeLessThanOrEqual(5000);
});

for (const [name, targets] of [
  ['兩顆並排及第三顆跨接', [140, 250, 195]],
  ['三顆並排在盤子上', [285, 195, 110]],
] as const) test(`${name}不會等待到逾時或錯誤結算`, async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173/?e2e&shape=classic');
  await page.waitForFunction(() => !!window.__PUDDING_TEST__);
  await page.locator('#start').click();
  const timings: number[] = [];
  for (let index = 0; index < targets.length; index++) {
    await page.evaluate(target => {
      const bridge = window.__PUDDING_TEST__!;
      for (let i = 0; i < 230; i++) {
        if (Math.abs(bridge.inspect().pending!.x - target) < 2) return;
        bridge.advance(1000 / 120);
      }
      throw new Error('No target crossing');
    }, targets[index]);
    await page.locator('canvas').tap({ position: { x: 195, y: 420 } });
    const result = await page.evaluate(() => {
      const bridge = window.__PUDDING_TEST__!, start = bridge.inspect().clock;
      for (let i = 0; i < 360; i++) {
        bridge.advance(1000 / 120);
        const data = bridge.inspect();
        if (data.state === 'READY' || data.state === 'GAME_OVER') return { ...data, elapsed: data.clock - start };
      }
      return { ...bridge.inspect(), elapsed: bridge.inspect().clock - start };
    });
    timings.push(result.elapsed);
    expect(result.state, JSON.stringify(result)).toBe('READY');
    expect(result.elapsed).toBeLessThan(2500);
    expect(result.score).toBe(index + 1);
    expect(result.snapshot!.puddings).toHaveLength(index + 1);
    expect(result.pending).not.toBeNull();
  }
  console.info(name, timings.map(ms => Math.round(ms)));
  const before = await page.evaluate(() => window.__PUDDING_TEST__!.inspect());
  expect(Math.abs(before.bodies[0].y - before.bodies[1].y)).toBeLessThan(3);
  await page.evaluate(() => window.__PUDDING_TEST__!.advance(1000));
  expect((await page.evaluate(() => window.__PUDDING_TEST__!.inspect())).score).toBe(3);
  await page.screenshot({ path: testInfo.outputPath('parallel-puddings.png') });
});
test('接觸資料持續無法確認時，六秒內結算且不把靜止角色誤計分', async ({ page }) => {
  // Simulate a resting body whose contact never becomes a valid support chain.
  await page.route('**/src/game/systems/contacts.ts', route => route.fulfill({
    contentType: 'application/javascript', body: 'export function physicalContacts() { return []; }',
  }));
  await page.goto('http://127.0.0.1:5173/?e2e&shape=classic');
  await page.waitForFunction(() => !!window.__PUDDING_TEST__);
  await page.locator('#start').click();
  await page.locator('canvas').tap({ position: { x: 195, y: 420 } });
  const result = await page.evaluate(() => {
    const bridge = window.__PUDDING_TEST__!;
    bridge.advance(4900);
    const before = bridge.inspect();
    bridge.advance(1100);
    return { before, after: bridge.inspect() };
  });
  expect(result.before.state).toBe('FALLING');
  expect(result.before.bodies[0].speed).toBe(0);
  expect(result.after.state).toBe('GAME_OVER');
  expect(result.after.score).toBe(0);
  expect(result.after.snapshot).toBeNull();
  await page.locator('#restart').click();
  const restarted = await page.evaluate(() => window.__PUDDING_TEST__!.inspect());
  expect(restarted.state).toBe('READY');
  expect(restarted.bodies).toHaveLength(0);
});