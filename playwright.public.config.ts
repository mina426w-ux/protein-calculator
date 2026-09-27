import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/public',
  timeout: 60_000,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://mina426w-ux.github.io/protein-calculator/',
    channel: 'chrome',
    headless: true,
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
