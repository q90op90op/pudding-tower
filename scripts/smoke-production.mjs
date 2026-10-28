import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const targetUrl = process.env.PUDDING_SMOKE_URL || 'http://127.0.0.1:4173/pudding-tower/';
const server = process.env.PUDDING_SMOKE_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { windowsHide: true, stdio: 'pipe' });
let output = '';
server?.stdout.on('data', chunk => { output += chunk; });
server?.stderr.on('data', chunk => { output += chunk; });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server && server.exitCode !== null) throw new Error(`Preview failed: ${output}`);
    try { ready = (await fetch(targetUrl)).ok; } catch { /* Server is starting. */ }
    if (ready) break;
    await delay(100);
  }
  assert(ready, `Preview did not start: ${output}`);
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url() + ': ' + response.status()); });
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto(targetUrl + '?e2e');
  await page.getByRole('button', { name: /開始遊戲/ }).waitFor();
  assert.equal(await page.evaluate(() => window.__PUDDING_TEST__), undefined);
  await mkdir('test-results/production', { recursive: true });
  await page.screenshot({ path: 'test-results/production/menu.png' });
  await page.getByRole('button', { name: /開始遊戲/ }).click();
  await page.locator('canvas').tap({ position: { x: 195, y: 420 } });
  await page.waitForFunction(() => document.querySelector('#score')?.textContent === '1', undefined, { timeout: 10000 });
  await page.screenshot({ path: 'test-results/production/gameplay.png' });
  // Continue real input until a natural loss; a fixed wall-clock delay cannot
  // predict the swing phase on a software-rendered or throttled browser.
  for (let attempt = 0; attempt < 8; attempt++) {
    if (await page.getByRole('button', { name: /再玩一次/ }).isVisible()) break;
    const previousScore = Number(await page.locator('#score').textContent());
    await page.waitForTimeout(450 + attempt * 90);
    await page.locator('canvas').tap({ position: { x: 195, y: 420 } });
    await page.waitForFunction(score =>
      Number(document.querySelector('#score')?.textContent) > score ||
      !!document.querySelector('#restart'), previousScore, { timeout: 45000 });
  }
  await page.getByRole('button', { name: /再玩一次/ }).waitFor({ timeout: 45000 });
  const preview = page.getByRole('button', { name: '預覽分享卡' });
  await page.waitForFunction(() => !document.querySelector('#preview-card')?.disabled);
  await page.screenshot({ path: 'test-results/production/result.png' });
  await preview.click();
  const sharedUrl = await page.locator('#game-url').inputValue();
  assert.equal(new URL(sharedUrl).pathname, '/pudding-tower/');
  if (process.env.PUDDING_SMOKE_URL) assert.equal(sharedUrl, targetUrl);
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載 PNG', exact: true }).click();
  await (await pendingDownload).saveAs('test-results/production/share-card.png');
  const png = await readFile('test-results/production/share-card.png');
  assert.equal(png.readUInt32BE(16), 1080); assert.equal(png.readUInt32BE(20), 1350);
  await page.screenshot({ path: 'test-results/production/share-preview.png' });
  assert.deepEqual(errors, []);
  console.log('Production smoke passed: real-time scoring, result, actual PNG download, no test hooks, no runtime or asset errors.');
} finally {
  await browser?.close();
  server?.kill();
}