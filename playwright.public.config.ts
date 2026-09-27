import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/public',
  timeout: 60_000,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://mina426w-ux.github.io/protein-calculator/',
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
})
