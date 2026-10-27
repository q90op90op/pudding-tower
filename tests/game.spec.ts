import { test, expect, type Page } from '@playwright/test';
import type {} from '../src/game/scenes/GameScene';

type Inspection = ReturnType<NonNullable<Window['__PUDDING_TEST__']>['inspect']>;
const inspect = (page: Page): Promise<Inspection> => page.evaluate(() => window.__PUDDING_TEST__!.inspect());
const advance = (page: Page, ms: number) => page.evaluate(ms => window.__PUDDING_TEST__!.advance(ms), ms);

async function boot(page: Page): Promise<void> {
  await page.goto('http://127.0.0.1:5173/?e2e');
  await expect(page.getByRole('button', { name: /開始遊戲/ })).toBeVisible();
  await page.waitForFunction(() => !!window.__PUDDING_TEST__);
  await page.getByRole('button', { name: /開始遊戲/ }).click();
}
async function tapGame(page: Page): Promise<void> { await page.locator('canvas').tap({ position: { x: 195, y: 420 } }); }
async function aimCenter(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bridge = window.__PUDDING_TEST__!;
    for (let i = 0; i < 220; i++) {
      if (Math.abs(bridge.inspect().pending!.x - 195) < 0.05) return;
      bridge.advance(1000 / 120);
    }
    throw new Error('No center crossing');
  });
}
async function settle(page: Page): Promise<Inspection> {
  return page.evaluate(() => {
    const bridge = window.__PUDDING_TEST__!;
    for (let i = 0; i < 2200; i++) {
      bridge.advance(1000 / 120);
      const data = bridge.inspect();
      if (data.state === 'READY' || data.state === 'GAME_OVER') return data;
    }
    throw new Error('Drop did not resolve');
  });
}

test('真實碰撞連疊22顆、上移鏡頭、快照、最高紀錄與重開', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page);
  expect((await inspect(page)).bodies).toHaveLength(0); // Start UI never drops a body.
  const hud = await page.locator('.scoreboard').boundingBox();
  for (let layer = 1; layer <= 22; layer++) {
    await aimCenter(page);
    await tapGame(page);
    await tapGame(page);
    expect((await inspect(page)).bodies).toHaveLength(layer); // Double taps ignored.
    const result = await settle(page);
    expect(result.state, JSON.stringify(result)).toBe('READY');
    expect(result.score).toBe(layer);
    const pendingHalfHeight = result.pending!.shapeId === 'tall' ? 43 : result.pending!.shapeId === 'flat' ? 17.5 : 27;
    expect(result.pending!.y - pendingHalfHeight - result.scrollY).toBeGreaterThan(225);
    expect(result.snapshot?.score).toBe(layer);
    expect(result.snapshot?.puddings).toHaveLength(layer);
    expect(new Set(result.snapshot!.puddings.map(p => p.id)).size).toBe(layer);
    expect(result.bodies.every(p => Number.isFinite(p.x) && Number.isFinite(p.angle))).toBe(true);
  }
  const tower = await inspect(page);
  expect(tower.scrollY).toBeLessThan(-700);
  expect(tower.plate.y).toBe(750);
  expect(tower.pending!.y - tower.scrollY).toBeGreaterThan(210);
  expect(tower.pending!.y - tower.scrollY).toBeLessThan(350);
  expect(new Set(tower.bodies.map(p => p.shapeId)).size).toBe(3);
  expect(await page.locator('.scoreboard').boundingBox()).toEqual(hud);
  await page.waitForTimeout(700); // Let visual effects expire; manual physics remains paused.
  await page.screenshot({ path: testInfo.outputPath('22-layer-tower.png') });
  await advance(page, 450); // Move waiting pudding to the edge and miss the tower.
  await tapGame(page);
  const failed = await settle(page);
  expect(failed.state).toBe('GAME_OVER');
  expect(failed.score).toBe(22);
  expect(failed.snapshot).toEqual(tower.snapshot); // Collapse never replaces the valid tower.
  await expect(page.getByRole('button', { name: /再玩一次/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '預覽分享卡' })).toBeEnabled();
  await page.getByRole('button', { name: '預覽分享卡' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載 PNG', exact: true }).click();
  await (await downloadPromise).saveAs(testInfo.outputPath('22-layer-share-card.png'));
  await page.getByRole('button', { name: '關閉分享預覽' }).click();
  await page.getByRole('button', { name: /再玩一次/ }).click();
  expect((await inspect(page)).score).toBe(0);
  expect((await inspect(page)).bodies).toHaveLength(0);
  expect((await inspect(page)).scrollY).toBe(0);
  await page.reload();
  await expect(page.locator('#best')).toHaveText('22');
  expect(errors).toEqual([]);
});

test('漏接不計分、儲存被封鎖仍可玩、窄手機與橫向不裁切', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await boot(page);
  await advance(page, 450);
  await tapGame(page);
  const failed = await settle(page);
  expect(failed.state).toBe('GAME_OVER');
  expect(failed.score).toBe(0);
  expect(failed.snapshot).toBeNull();
  await expect(page.getByText('無法永久儲存紀錄，本頁仍可繼續遊玩')).toBeVisible();
  for (const size of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(100);
    const stage = await page.locator('#stage').boundingBox();
    expect(stage!.x).toBeGreaterThanOrEqual(-0.1);
    expect(stage!.y).toBeGreaterThanOrEqual(-0.1);
    expect(stage!.x + stage!.width).toBeLessThanOrEqual(size.width + 0.1);
    expect(stage!.y + stage!.height).toBeLessThanOrEqual(size.height + 0.1);
  }
  await page.getByRole('button', { name: /再玩一次/ }).click();
  await tapGame(page);
  expect((await settle(page)).score).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('storage-fallback.png') });
});

test('一般模式實際時間迴圈可掉落計分，選單可顯示', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('button', { name: /開始遊戲/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('menu.png') });
  expect(await page.evaluate(() => window.__PUDDING_TEST__)).toBeUndefined();
  await page.getByRole('button', { name: /開始遊戲/ }).click();
  await tapGame(page);
  await expect(page.locator('#score')).toHaveText('1', { timeout: 10000 });
  expect(errors).toEqual([]);
});
// Real off-center drops load the edge of the plate until confirmed pieces fall.
test('已計分布丁自然失去支撐後倒塌，結束並保留成功快照', async ({ page }) => {
  await boot(page);
  for (const target of [285, 316, 316, 316, 316, 316]) {
    const before = await inspect(page);
    if (before.state === 'GAME_OVER') break;
    await page.evaluate(target => {
      const bridge = window.__PUDDING_TEST__!;
      for (let i = 0; i < 220; i++) {
        const data = bridge.inspect();
        if (data.state === 'GAME_OVER' || Math.abs(data.pending!.x - target) < 2) return;
        bridge.advance(1000 / 120);
      }
      throw new Error('No target crossing');
    }, target);
    if ((await inspect(page)).state === 'GAME_OVER') break;
    await tapGame(page);
    await settle(page);
  }
  await advance(page, 20000);
  const result = await inspect(page);
  expect(result.state).toBe('GAME_OVER');
  expect(result.score).toBeGreaterThan(0);
  expect(result.bodies.some(p => p.scored && (p.y > 875 || p.x > 480 || p.x < -90))).toBe(true);
  expect(result.snapshot!.puddings).toHaveLength(result.score);
});