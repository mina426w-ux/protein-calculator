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

async function setupProfile(page: Page) {
  await fillUniInput(page, '#profile-age', '35')
  await fillUniInput(page, '#profile-height', '180')
  await fillUniInput(page, '#profile-weight', '82.4')
  await fillUniInput(page, '#profile-target-weight', '75')
  await page.locator('#activity-moderate').click()
  await page.locator('#goal-lose').click()
  await page.locator('#deficit-500').click()
  await page.locator('#protein-current').click()
  await page.locator('#save-profile').click()
  await expect(page.locator('#current-weight')).toHaveText('82.4 kg')
}

test('V2 新用户完整闭环：资料、目标、食物、体重、完成、刷新与趋势', async ({ page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedResponses: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${message.text()} @ ${message.location().url}`) })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`) })

  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await test.step('首次资料计算成人减重目标', async () => {
    await setupProfile(page)
    await page.locator('#tab-settings').click()
    await expect(page.locator('#bmr-value')).toHaveText('1779')
    await expect(page.locator('#tdee-value')).toHaveText('2757')
    await expect(page.locator('#protein-target-result')).toHaveText('65.92')
    await expect(page.locator('#calorie-target-result')).toHaveText('2257')
  })

  await test.step('添加鸡胸肉后蛋白质与热量同步累计', async () => {
    await page.locator('#tab-foods').click()
    await fillUniInput(page, '#search-input', '鸡胸肉')
    await page.locator('[data-food-name="鸡胸肉"]').filter({ hasText: '熟／烤' }).first().click()
    await fillUniInput(page, '#food-quantity', '150')
    await expect(page.locator('#food-preview')).toHaveText('46.5g')
    await expect(page.locator('#calorie-preview')).toHaveText('247.5 kcal')
    await page.locator('#add-selected-food').click()
    await page.locator('.close-button').click()
    await page.locator('#tab-today').click()
    await expect(page.locator('#consumed-value')).toHaveText('46.5g')
    await expect(page.locator('#remaining-value')).toHaveText('剩余 19.42g')
    await expect(page.locator('#calorie-consumed-value')).toHaveText('247.5 kcal')
    await expect(page.locator('#calorie-remaining-value')).toHaveText('剩余 2009.5 kcal')
  })

  await test.step('记录体重并完成今日记录', async () => {
    await fillUniInput(page, '#weight-input', '82.4')
    await page.locator('#save-weight').click()
    await page.locator('#complete-day').click()
    await expect(page.locator('#complete-day')).toHaveText('今日完成 ✓')
    await expect(page.locator('#trend-weight')).toHaveText('82.4')
    await expect(page.locator('#trend-protein')).toHaveText('71%')
    await expect(page.locator('#trend-calories')).toHaveText('247.5')
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.resolve('evidence/v2-complete-flow-mobile.png'), fullPage: true })
  })

  await test.step('刷新后所有核心数据仍存在', async () => {
    await page.reload()
    await expect(page.locator('#current-weight')).toHaveText('82.4 kg')
    await expect(page.locator('#consumed-value')).toHaveText('46.5g')
    await expect(page.locator('#calorie-consumed-value')).toHaveText('247.5 kcal')
    await expect(page.locator('[data-entry-name="鸡胸肉"]')).toContainText('46.5g')
    await expect(page.locator('#complete-day')).toHaveText('今日完成 ✓')
  })

  expect(pageErrors).toEqual([])
  expect(failedResponses).toEqual([])
  expect(consoleErrors).toEqual([])
})
