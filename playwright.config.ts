import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  // Hosted Windows runners render more slowly than a local GPU.
  timeout: process.env.CI ? 180000 : 45000,
  use: { browserName: 'chromium', channel: 'msedge', headless: true,
    viewport: { width: 390, height: 844 }, hasTouch: true, screenshot: 'only-on-failure' },
  webServer: { command: 'npm.cmd run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});