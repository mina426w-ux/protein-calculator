import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const date = '2026-09-27'

async function fillUniInput(page: Page, id: string, value: string) {
  await page.locator(`${id} input`).fill(value)
}

async function openFoodBySearch(page: Page, query: string, exactName: string, hasText?: string) {
  await page.locator('#tab-foods').click()
  await fillUniInput(page, '#search-input', query)
  let card = page.locator(`[data-food-name="${exactName}"]`)
  if (hasText) card = card.filter({ hasText })
  await card.first().click()
  await expect(page.locator('#food-detail')).toBeVisible()
}

async function createCustom(page: Page, name: string, base: string, unit: string, protein: string, notes: string) {
  await page.locator('#tab-custom').click()
  await fillUniInput(page, '#custom-name', name)
  await fillUniInput(page, '#custom-base', base)
  await page.locator(`#custom-unit-${unit}`).click()
  await fillUniInput(page, '#custom-protein', protein)
  await fillUniInput(page, '#custom-notes', notes)
  await page.locator('#save-custom').click()
  await expect(page.locator(`[data-custom-name="${name}"]`)).toContainText(protein)
}

test('第二阶段食品库、覆盖、自定义、快照、收藏和持久化验收', async ({ page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await fillUniInput(page, '#date-input', date)
  await page.locator('#apply-date').click()

  await test.step('测试1：搜索熟鸡胸肉，150g 计算 46.5g', async () => {
    await openFoodBySearch(page, '鸡胸肉', '鸡胸肉', '熟／烤')
    await expect(page.locator('#system-reference-value')).toHaveText('31g / 100g')
    await fillUniInput(page, '#food-quantity', '150')
    await expect(page.locator('#food-preview')).toHaveText('46.5g')
    await page.screenshot({ path: path.resolve('evidence/phase2-chicken-150g.png'), fullPage: true })
    await page.locator('#add-selected-food').click()
    await page.locator('.close-button').click()
  })

  await test.step('测试2：纯牛奶我的数值 4.1g/100mL，200mL 计算 8.2g', async () => {
    await openFoodBySearch(page, '纯牛奶', '纯牛奶（全脂参考）')
    await fillUniInput(page, '#override-input', '4.1')
    await page.locator('#save-override').click()
    await expect(page.locator('#my-reference-value')).toHaveText('4.1g')
    await expect(page.locator('#detail-effective-value')).toContainText('4.1g / 100mL')
    await fillUniInput(page, '#food-quantity', '200')
    await expect(page.locator('#food-preview')).toHaveText('8.2g')
    await page.locator('#add-selected-food').click()
    await page.locator('.close-button').click()
  })

  await test.step('测试3：自定义蛋白粉每30g含24g，45g 计算 36g', async () => {
    await createCustom(page, '验收乳清蛋白粉', '30', 'g', '24', '包装营养成分表')
    await openFoodBySearch(page, '验收乳清蛋白粉', '验收乳清蛋白粉')
    await fillUniInput(page, '#food-quantity', '45')
    await expect(page.locator('#food-preview')).toHaveText('36g')
    await page.locator('#add-selected-food').click()
    await page.locator('.close-button').click()
  })

  await test.step('测试4：自定义蛋白棒每1根含20g，0.5根计算 10g', async () => {
    await createCustom(page, '验收蛋白棒', '1', '根', '20', '包装营养成分表')
    await openFoodBySearch(page, '验收蛋白棒', '验收蛋白棒')
    await fillUniInput(page, '#food-quantity', '0.5')
    await expect(page.locator('#food-preview')).toHaveText('10g')
    await page.locator('.detail-sheet').evaluate((element) => {
      const sheet = element as HTMLElement
      sheet.scrollTop = sheet.scrollHeight
    })
    await page.screenshot({ path: path.resolve('evidence/phase2-custom-foods.png') })
    await page.locator('#add-selected-food').click()
    await page.locator('.close-button').click()
  })

  await test.step('测试5：修改食品参考值后旧历史快照保持 4.1 / 8.2', async () => {
    await openFoodBySearch(page, '纯牛奶', '纯牛奶（全脂参考）')
    await fillUniInput(page, '#override-input', '5')
    await page.locator('#save-override').click()
    await page.locator('.close-button').click()
    await page.locator('#tab-history').click()
    await page.locator(`[data-history-date="${date}"]`).click()
    const milkHistory = page.locator('[data-history-entry="纯牛奶（全脂参考）"]')
    await expect(milkHistory).toContainText('当时 4.1g/100mL')
    await expect(milkHistory).toContainText('8.2g')
  })

  await test.step('测试6：收藏、最近使用、搜索和分类筛选正常', async () => {
    await page.locator('#tab-foods').click()
    await fillUniInput(page, '#search-input', '鸡胸肉')
    const cookedChicken = page.locator('[data-food-name="鸡胸肉"]').filter({ hasText: '熟／烤' }).first()
    await cookedChicken.locator('.favorite-button').click()
    await page.locator('[data-category="肉禽"]').click()
    await fillUniInput(page, '#search-input', '')
    await expect(page.locator('[data-food-name="鸡胸肉"]').first()).toBeVisible()
    await page.locator('[data-category="常用"]').click()
    await expect(page.locator('[data-food-name="鸡胸肉"]').filter({ hasText: '熟／烤' }).first()).toContainText('★')
    await expect(page.locator('[data-food-name="纯牛奶（全脂参考）"]')).toBeVisible()
    await expect(page.locator('[data-food-name="验收乳清蛋白粉"]')).toBeVisible()
  })

  await test.step('测试7：刷新后覆盖值、自定义食品、收藏、最近使用和历史仍存在', async () => {
    await page.reload()
    await page.locator('#tab-foods').click()
    await fillUniInput(page, '#search-input', '纯牛奶')
    await page.locator('[data-food-name="纯牛奶（全脂参考）"]').click()
    await expect(page.locator('#my-reference-value')).toHaveText('5g')
    await page.locator('.close-button').click()
    await page.locator('#tab-custom').click()
    await expect(page.locator('[data-custom-name="验收乳清蛋白粉"]')).toBeVisible()
    await expect(page.locator('[data-custom-name="验收蛋白棒"]')).toBeVisible()
    await page.locator('#tab-foods').click()
    await fillUniInput(page, '#search-input', '')
    await page.locator('[data-category="常用"]').click()
    await expect(page.locator('[data-food-name="鸡胸肉"]').filter({ hasText: '熟／烤' }).first()).toContainText('★')
    await page.locator('#tab-history').click()
    await expect(page.locator('[data-history-entry="纯牛奶（全脂参考）"]')).toContainText('8.2g')
  })

  await test.step('测试10：无控制台致命错误', async () => {
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})
