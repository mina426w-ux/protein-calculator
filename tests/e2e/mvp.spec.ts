import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const testDate = '2026-09-27'

async function fillUniInput(page: Page, id: string, value: string) {
  await page.locator(`${id} input`).fill(value)
}

async function setDate(page: Page, value: string) {
  await fillUniInput(page, '#date-input', value)
  await page.locator('#apply-date').click()
}

async function createCustom(page: Page, name: string, base: string, unit: string, protein: string) {
  await page.locator('#tab-custom').click()
  await fillUniInput(page, '#custom-name', name)
  await fillUniInput(page, '#custom-base', base)
  await page.locator(`#custom-unit-${unit}`).click()
  await fillUniInput(page, '#custom-protein', protein)
  await page.locator('#save-custom').click()
  await expect(page.locator(`[data-custom-name="${name}"]`)).toBeVisible()
}

async function addBySearch(page: Page, name: string, quantity: string) {
  await page.locator('#tab-foods').click()
  await fillUniInput(page, '#search-input', name)
  await page.locator(`[data-food-name="${name}"]`).click()
  await fillUniInput(page, '#food-quantity', quantity)
  await page.locator('#add-selected-food').click()
  await page.locator('.close-button').click()
}

test('第一阶段 70g / 22g / 48g 回归与持久化', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await setDate(page, testDate)
  await fillUniInput(page, '#goal-input', '70')
  await page.locator('#save-goal').click()

  await createCustom(page, '测试食物 A', '1', '份', '6')
  await createCustom(page, '测试食物 B', '1', '份', '10')
  await addBySearch(page, '测试食物 A', '2')
  await addBySearch(page, '测试食物 B', '1')
  await page.locator('#tab-today').click()
  await expect(page.locator('#consumed-value')).toHaveText('22g')
  await expect(page.locator('#remaining-value')).toHaveText('48g')
  await expect(page.locator('#target-value')).toHaveText('70g')

  await page.reload()
  await expect(page.locator('#consumed-value')).toHaveText('22g')
  await expect(page.locator('#remaining-value')).toHaveText('48g')
  await expect(page.locator('[data-entry-name="测试食物 A"]')).toContainText('12g')
  await expect(page.locator('[data-entry-name="测试食物 B"]')).toContainText('10g')
  await page.screenshot({ path: path.resolve('evidence/phase1-regression-22g.png'), fullPage: true })
})
