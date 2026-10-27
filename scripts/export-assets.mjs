import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174', '--strictPort'], { windowsHide: true, stdio: 'pipe' });
let output = ''; server.stdout.on('data', b => { output += b; }); server.stderr.on('data', b => { output += b; });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { ready = (await fetch('http://127.0.0.1:5174/tools/asset-studio.html')).ok; } catch {}
    if (ready) break; await delay(100);
  }
  if (!ready) throw new Error('Art server unavailable');
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5174/tools/asset-studio.html');
  await page.waitForFunction(() => !!window.__ART_EXPORT__);
  const assets = await page.evaluate(() => window.__ART_EXPORT__);
  for (const asset of assets) {
    if (!asset.path.startsWith('public/assets/') && asset.path !== 'docs/mvp-character-catalog.png') throw new Error('Unexpected asset path');
    const path = resolve(asset.path); await mkdir(dirname(path), { recursive: true }); await writeFile(path, Buffer.from(asset.data, 'base64'));
  }
  await writeFile('public/assets/manifest.json', JSON.stringify({ generator: 'src/game/art/', resolution: 3, files: assets.filter(a => a.path.startsWith('public/')).map(a => a.path.replace('public/', '')) }, null, 2));
  console.log(`Exported ${assets.length} original PNG assets and preview; transparent characters, no reference image crops.`);
} finally { await browser?.close(); server.kill(); }