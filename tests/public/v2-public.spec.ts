import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.dcloud.net.cn/img/shadow-grey.png', (route) => route.fulfill({
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  }))
})

async function fillUniInput(page: Page, id: string, value: string) {
  const input = page.locator(`${id} input`)
  await expect(input).toBeVisible()
  await input.tap()
  await expect(input).toBeFocused()
  await input.fill(value)
  await expect(input).toHaveValue(value)
}

test('GitHub Pages V2 公网闭环与刷新持久化', async ({ page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedResponses: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${message.text()} @ ${message.location().url}`) })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`) })

  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.locator('body')).toContainText('个人资料与目标')

  await fillUniInput(page, '#profile-age', '35')
  await fillUniInput(page, '#profile-height', '180')
  await fillUniInput(page, '#profile-weight', '82.4')
  await fillUniInput(page, '#profile-target-weight', '75')
  await fillUniInput(page, '#profile-body-fat', '22.5')
  await page.locator('#activity-moderate').click()
  await page.locator('#goal-lose').click()
  await page.locator('#protein-custom').click()
  await fillUniInput(page, '#custom-protein-target', '100')
  await page.locator('#save-profile').click()
  await expect(page.locator('#target-value')).toHaveText('100g')

  await page.locator('#tab-foods').click()
  await fillUniInput(page, '#search-input', '鸡胸肉')
  await page.locator('[data-food-name="鸡胸肉"]').filter({ hasText: '熟／烤' }).first().click()
  await fillUniInput(page, '#food-quantity', '100')
  await expect(page.locator('#food-preview')).toHaveText('31g')
  await expect(page.locator('#calorie-preview')).toHaveText('165 kcal')
  await page.locator('#add-selected-food').click()
  await page.locator('.close-button').click()
  await page.locator('#tab-today').click()
  await fillUniInput(page, '#weight-input', '82.4')
  await page.locator('#save-weight').click()
  await page.locator('#complete-day').click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.resolve('evidence/v2-public-pages-mobile.png'), fullPage: true })

  await page.reload()
  await expect(page.locator('#consumed-value')).toHaveText('31g')
  await expect(page.locator('#calorie-consumed-value')).toHaveText('165 kcal')
  await expect(page.locator('#current-weight')).toHaveText('82.4 kg')
  await expect(page.locator('#complete-day')).toHaveText('今日完成 ✓')
  expect(pageErrors).toEqual([])
  expect(failedResponses).toEqual([])
  expect(consoleErrors).toEqual([])
})
