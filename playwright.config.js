import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  workers: 1,
  reporter: [['line']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:8080',
    ignoreHTTPSErrors: process.env.E2E_IGNORE_HTTPS_ERRORS === 'true',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'firefox-1280', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 }, launchOptions: { env: { MOZ_WEBRENDER: '0', LIBGL_ALWAYS_SOFTWARE: '1' } } } },
    { name: 'webkit-tablet', use: { ...devices['Desktop Safari'], viewport: { width: 768, height: 1024 } } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
});
