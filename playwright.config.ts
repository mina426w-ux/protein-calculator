import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chrome-mobile',
      use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: 'webkit-iphone',
      use: { browserName: 'webkit', ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4173 --outDir dist/build/h5',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
