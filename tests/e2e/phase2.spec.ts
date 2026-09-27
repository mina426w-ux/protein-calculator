import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

async function fillUniInput(page: Page, id: string, value: string) {
  await page.locator(`${id} input`).fill(value, { force: true })
}

async function setupProfile(page: Page) {
  await fillUniInput(page, '#profile-age', '40')
  await page.locator('#sex-female').click()
  await fillUniInput(page, '#profile-height', '165')
  await fillUniInput(page, '#profile-weight', '68')
  await fillUniInput(page, '#profile-target-weight', '62')
  await page.locator('#protein-doctor').click()
  await fillUniInput(page, '#doctor-protein-target', '70')
  await page.locator('#calorie-custom').click()
  await fillUniInput(page, '#custom-calorie-target', '1900')
  await page.locator('#save-profile').click()
}

async function openFood(page: Page, query: string, name: string) {
  await page.locator('#tab-foods').click()
  await fillUniInput(page, '#search-input', query)
  await page.locator(`[data-food-name="${name}"]`).first().click()
  await expect(page.locator('#food-detail')).toBeVisible()
}

test('V2 自定义营养、覆盖快照、收藏与持久化', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await setupProfile(page)

  await test.step('自定义蛋白粉同时记录蛋白质与热量', async () => {
    await page.locator('#tab-custom').click()
    await fillUniInput(page, '#custom-name', '验收蛋白粉')
    await fillUniInput(page, '#custom-base', '30')
    await fillUniInput(page, '#custom-protein', '24')
    await fillUniInput(page, '#custom-calories', '120')
    await page.locator('#save-custom').click()
    await openFood(page, '验收蛋白粉', '验收蛋白粉')
    await fillUniInput(page, '#food-quantity', '45')
    await expect(page.locator('#food-preview')).toHaveText('36g')
    await expect(page.locator('#calorie-preview')).toHaveText('180 kcal')
    await page.locator('#add-selected-food').click()
    await page.locator('.close-button').click()
  })

  await test.step('系统牛奶可覆盖蛋白质与热量，历史使用快照', async () => {
    await openFood(page, '纯牛奶', '纯牛奶（全脂参考）')
    await fillUniInput(page, '#override-input', '4.1')
    await fillUniInput(page, '#override-calories-input', '70')
    await page.locator('#save-override').click()
    await fillUniInput(page, '#food-quantity', '200')
    await expect(page.locator('#food-preview')).toHaveText('8.2g')
    await expect(page.locator('#calorie-preview')).toHaveText('140 kcal')
    await page.locator('#add-selected-food').click()
    await page.locator('.close-button').click()

    await openFood(page, '纯牛奶', '纯牛奶（全脂参考）')
    await fillUniInput(page, '#override-input', '5')
    await fillUniInput(page, '#override-calories-input', '80')
    await page.locator('#save-override').click()
    await page.locator('.close-button').click()

    await page.locator('#tab-history').click()
    const milk = page.locator('[data-history-entry="纯牛奶（全脂参考）"]')
    await expect(milk).toContainText('8.2g')
    await expect(milk).toContainText('140 kcal')
    await expect(milk).toContainText('当时 4.1g')
  })

  await test.step('收藏和刷新持久化', async () => {
    await page.locator('#tab-foods').click()
    await fillUniInput(page, '#search-input', '鸡胸肉')
    const chicken = page.locator('[data-food-name="鸡胸肉"]').filter({ hasText: '熟／烤' }).first()
    await chicken.locator('.favorite-button').click()
    await page.reload()
    await page.locator('#tab-foods').click()
    await fillUniInput(page, '#search-input', '鸡胸肉')
    await expect(page.locator('[data-food-name="鸡胸肉"]').filter({ hasText: '熟／烤' }).first()).toContainText('★')
    await page.locator('#tab-custom').click()
    await expect(page.locator('[data-custom-name="验收蛋白粉"]')).toContainText('120 kcal')
    await page.locator('#tab-today').click()
    await expect(page.locator('#consumed-value')).toHaveText('44.2g')
    await expect(page.locator('#calorie-consumed-value')).toHaveText('320 kcal')
    await page.screenshot({ path: path.resolve('evidence/v2-custom-snapshot.png'), fullPage: true })
  })
})
