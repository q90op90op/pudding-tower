import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PUDDINGS, STYLES, STYLE_WEIGHTS, EXPRESSIONS, chooseStyle, chooseExpression, seededRandom, weightedPick } from '../src/game/data/puddingDefinitions';
import type {} from '../src/game/scenes/GameScene';
const base = 'http://127.0.0.1:5173/';
const inspect = (page: Page) => page.evaluate(() => window.__PUDDING_TEST__!.inspect());
async function boot(page: Page, query = '') {
  await page.goto(`${base}?e2e${query}`); await page.waitForFunction(() => !!window.__PUDDING_TEST__);
  await page.getByRole('button', { name: /開始遊戲/ }).click();
}
async function tap(page: Page) { await page.locator('canvas').tap({ position: { x: 195, y: 420 } }); }
async function settle(page: Page) {
  return page.evaluate(() => {
    const bridge = window.__PUDDING_TEST__!;
    for (let i = 0; i < 2400; i++) { bridge.advance(1000 / 120); const data = bridge.inspect(); if (data.state === 'READY' || data.state === 'GAME_OVER') return data; }
    throw new Error('Drop never settled');
  });
}
async function finishOneLayer(page: Page) {
  await tap(page); expect((await settle(page)).score).toBe(1);
  await page.evaluate(() => {
    const bridge = window.__PUDDING_TEST__!;
    for (let i = 0; i < 220; i++) { if (bridge.inspect().pending!.x > 318) return; bridge.advance(1000 / 120); }
  });
  await tap(page); const result = await settle(page);
  expect(result.state).toBe('GAME_OVER'); expect(result.snapshot?.score).toBe(1);
  await expect(page.getByRole('button', { name: /分享成績/ })).toBeEnabled();
  return result;
}

for (const style of STYLES) test(`十種 ${style} 正式素材均可真實落地，質量不隨美術改變`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (const d of PUDDINGS) {
    await boot(page, `&shape=${d.shapeId}&style=${style}`);
    const ready = await inspect(page); expect(ready.pending?.shapeId).toBe(d.shapeId); expect(ready.pending?.styleId).toBe(style);
    await tap(page);
    const dropped = await inspect(page); expect(dropped.bodies[0].mass).toBeCloseTo(d.mass, 4);
    if (d.hulls.length > 1) expect(dropped.bodies[0].partCount).toBe(d.hulls.length + 1);
    const result = await settle(page);
    expect(result.state, `${d.shapeId}: ${JSON.stringify(result)}`).toBe('READY'); expect(result.score).toBe(1);
    expect(result.snapshot!.puddings[0].styleId).toBe(style);
    expect(result.snapshot!.puddings[0].shapeId).toBe(d.shapeId);
    expect(result.bodies[0].y).toBeLessThan(750);
  }
  expect(errors).toEqual([]);
});

test('風格 45/25/15/15、十造型與六表情可重現抽樣', () => {
  const random = seededRandom(20261028), count = { cute: 0, weird: 0, pixel: 0, soft3d: 0 };
  for (let i = 0; i < 40000; i++) count[chooseStyle(random)]++;
  for (const style of STYLES) expect(Math.abs(count[style] / 40000 - STYLE_WEIGHTS[style] / 100)).toBeLessThan(0.012);
  const shapes = new Set<string>(), expressions = new Set<string>();
  for (let i = 0; i < 3000; i++) { shapes.add(weightedPick(PUDDINGS, d => d.weight, random).shapeId); expressions.add(chooseExpression(random)); }
  expect(shapes.size).toBe(10); expect([...expressions].sort()).toEqual([...EXPRESSIONS].sort());
});

test('40 張完整角色 PNG 與 24 張表情均透明，四風格明確不同', async ({ page }) => {
  await page.goto(base);
  const result = await page.evaluate(async () => {
    const styles = ['cute', 'weird', 'pixel', 'soft3d']; const shapes = ['classic', 'tall', 'flat', 'tilted', 'double', 'mushroom', 'longface', 'burst', 'platform', 'oddball'];
    const expressions = ['blank', 'nervous', 'crying', 'angry', 'dizzy', 'surprised'];
    const results: { path: string; corner: number; hasPaint: boolean; fingerprint: number }[] = [];
    for (const path of [...shapes.flatMap(shape => styles.map(style => `puddings/${shape}/${style}.png`)), ...styles.flatMap(style => expressions.map(expression => `faces/${style}/${expression}.png`))]) {
      const image = new Image(); image.src = `/assets/${path}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const c = canvas.getContext('2d')!; c.drawImage(image, 0, 0); const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
      let fingerprint = 0, hasPaint = false; for (let i = 3; i < data.length; i += 4) { if (data[i]) hasPaint = true; fingerprint = (Math.imul(fingerprint, 31) + data[i - 1] + data[i]) | 0; }
      results.push({ path, corner: data[3], hasPaint, fingerprint });
    }
    return results;
  });
  expect(result).toHaveLength(64); for (const file of result) { expect(file.corner, file.path).toBe(0); expect(file.hasPaint, file.path).toBe(true); }
  expect(new Set(result.filter(r => r.path.startsWith('puddings/classic/')).map(r => r.fingerprint)).size).toBe(4);
});

test('分享預覽、真實塔 PNG 下載、網址清理、結算畫面與窄螢幕', async ({ page }, testInfo) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); });
  await boot(page); const result = await finishOneLayer(page);
  expect(result.snapshot!.puddings).toHaveLength(1);
  await page.screenshot({ path: testInfo.outputPath('result.png') });
  await page.getByRole('button', { name: /分享成績/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.locator('#game-url')).toHaveValue(base);
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: '下載 PNG', exact: true }).click(); const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('pudding-tower-1.png'); const path = testInfo.outputPath('share-card.png'); await download.saveAs(path);
  const png = await readFile(path); expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]); expect(png.readUInt32BE(16)).toBe(1080); expect(png.readUInt32BE(20)).toBe(1350); expect(png.length).toBeGreaterThan(20000);
  await page.screenshot({ path: testInfo.outputPath('share-preview.png') });
  for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size); await page.waitForTimeout(80); const bounds = await page.locator('.share-panel').boundingBox(); expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height + 0.1);
  }
  await page.getByRole('button', { name: '關閉分享預覽' }).click(); await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: /再玩一次/ }).click(); expect((await inspect(page)).cardReady).toBe(false);
});

test('原生分享收到 PNG 檔案，使用者取消不誤觸下載', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { calls: { name: string; type: string; size: number }[]; cancelShare: boolean };
    w.calls = []; w.cancelShare = false;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => {
      const file = data.files![0]; w.calls.push({ name: file.name, type: file.type, size: file.size }); if (w.cancelShare) throw new DOMException('cancel', 'AbortError');
    } });
  });
  await boot(page); await finishOneLayer(page); const downloads: string[] = []; page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.getByRole('button', { name: /分享成績/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(1);
  const first = await page.evaluate(() => (window as unknown as { calls: { type: string; size: number }[] }).calls[0]); expect(first.type).toBe('image/png'); expect(first.size).toBeGreaterThan(20000);
  await page.evaluate(() => { (window as unknown as { cancelShare: boolean }).cancelShare = true; }); await page.getByRole('button', { name: /分享成績/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(2);
  await expect(page.getByRole('dialog')).toBeHidden(); expect(downloads).toEqual([]);
});

test('音效按鈕不會落下布丁，偏好持久化；倒塌先演出再結算', async ({ page }) => {
  await boot(page); await page.getByRole('button', { name: '音效開關' }).click(); expect((await inspect(page)).soundEnabled).toBe(false); expect((await inspect(page)).bodies).toHaveLength(0);
  await page.reload(); await page.waitForFunction(() => !!window.__PUDDING_TEST__); await expect(page.getByRole('button', { name: '音效開關' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: /開始遊戲/ }).click(); await page.evaluate(() => window.__PUDDING_TEST__!.advance(450)); await tap(page);
  const collapse = await page.evaluate(() => {
    const bridge = window.__PUDDING_TEST__!; for (let i = 0; i < 2000; i++) { bridge.advance(1000 / 120); if (bridge.inspect().state === 'COLLAPSING') return bridge.inspect(); } throw new Error('No collapse state');
  });
  expect(collapse.state).toBe('COLLAPSING'); await expect(page.getByRole('button', { name: /再玩一次/ })).toHaveCount(0);
  await page.evaluate(() => window.__PUDDING_TEST__!.advance(500)); expect((await inspect(page)).state).toBe('COLLAPSING');
  await page.evaluate(() => window.__PUDDING_TEST__!.advance(500)); expect((await inspect(page)).state).toBe('GAME_OVER');
});
test('原生分享失敗改為預覽，剪貼簿受限仍可選取真實網址', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('blocked', 'NotAllowedError'); } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('blocked'); } } });
  });
  await boot(page); await finishOneLayer(page); await page.getByRole('button', { name: /分享成績/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.locator('#share-status')).toContainText('原生分享未能完成');
  await page.getByRole('button', { name: '複製遊戲連結' }).click(); await expect(page.locator('#share-status')).toContainText('請長按已選取的網址');
  await expect(page.locator('#game-url')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
});

test('分享圖由世界快照重繪，位置、旋轉與表情會改變輸出', async ({ page }) => {
  await boot(page); const actual = await finishOneLayer(page);
  const comparisons = await page.evaluate(async snapshot => {
    const { renderShareCard } = await import('/src/game/share/ShareCard.ts');
    const original = renderShareCard(snapshot, 1, 1, 'http://127.0.0.1:5173/').toDataURL();
    const changed = structuredClone(snapshot)!; changed.puddings[0].x += 75; changed.puddings[0].angle += 0.45; changed.puddings[0].expressionId = 'angry';
    const shifted = renderShareCard(changed, 1, 1, 'http://127.0.0.1:5173/').toDataURL();
    const empty = renderShareCard(null, 0, 1, 'http://127.0.0.1:5173/').toDataURL();
    return { same: original === shifted, emptySame: original === empty, inputX: snapshot!.puddings[0].x };
  }, actual.snapshot);
  expect(comparisons.same).toBe(false); expect(comparisons.emptySame).toBe(false); expect(comparisons.inputX).toBe(actual.snapshot!.puddings[0].x);
});

test('Web Audio 實際建立音效，靜音後不再生成音符', async ({ page }) => {
  await page.addInitScript(() => {
    const proto = AudioContext.prototype, original = proto.createOscillator;
    const w = window as unknown as { notes: number }; w.notes = 0;
    proto.createOscillator = function () { w.notes++; return original.call(this); };
  });
  await boot(page); await page.waitForTimeout(100); await tap(page); await settle(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { notes: number }).notes)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '音效開關' }).click();
  const notes = await page.evaluate(() => (window as unknown as { notes: number }).notes);
  await tap(page); await settle(page); expect(await page.evaluate(() => (window as unknown as { notes: number }).notes)).toBe(notes);
});