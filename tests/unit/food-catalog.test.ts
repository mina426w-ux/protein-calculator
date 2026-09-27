import { describe, expect, it } from 'vitest'
import { calculateReferenceProtein } from '../../src/domain/protein'
import { FOOD_CATEGORIES, ProteinStore, STORAGE_KEY, SYSTEM_FOODS, normalizeState, type StorageAdapter } from '../../src/services/storage'

class MemoryAdapter implements StorageAdapter {
  disk = new Map<string, string>()
  get(key: string) {
    const value = this.disk.get(key)
    return value ? JSON.parse(value) : undefined
  }
  set(key: string, value: unknown) {
    this.disk.set(key, JSON.stringify(value))
  }
}

const date = '2026-09-27'
const milkId = 'system-milk-whole'
const chickenId = 'system-chicken-breast-cooked'

describe('第二阶段系统食品库', () => {
  it('内置食品数量在 80–120 之间且当前为 106', () => {
    expect(SYSTEM_FOODS).toHaveLength(106)
  })

  it('覆盖 7 个正式分类且每类都有数据', () => {
    expect(FOOD_CATEGORIES).toHaveLength(7)
    for (const category of FOOD_CATEGORIES) {
      expect(SYSTEM_FOODS.filter((food) => food.category === category).length).toBeGreaterThan(0)
    }
  })

  it('所有食品都有中文名、英文记录、状态、基准和蛋白质', () => {
    for (const food of SYSTEM_FOODS) {
      expect(food.name.length).toBeGreaterThan(0)
      expect(food.nameEn.length).toBeGreaterThan(0)
      expect(food.state.length).toBeGreaterThan(0)
      expect(food.baseAmount).toBeGreaterThan(0)
      expect(food.baseUnit.length).toBeGreaterThan(0)
      expect(food.systemProtein).toBeGreaterThan(0)
    }
  })

  it('所有食品都带可追溯 FDC ID、查询日期和来源 URL，UNKNOWN 为 0', () => {
    for (const food of SYSTEM_FOODS) {
      expect(food.sourceName).toContain('USDA')
      expect(food.sourceId).toMatch(/^\d+$/)
      expect(food.sourceUrl).toContain(food.sourceId)
      expect(food.queriedAt).toBe('2026-09-27')
      expect(Number.isFinite(food.systemProtein)).toBe(true)
    }
  })

  it('所有食品都使用本地图标并保存授权信息', () => {
    for (const food of SYSTEM_FOODS) {
      expect(food.imageLocalPath).toMatch(/^\/static\/food-icons\/.+\.svg$/)
      expect(food.imageSource).toContain('项目自制')
      expect(food.imageLicense).toContain('项目原创')
    }
  })
})

describe('第二阶段计算、覆盖、自定义与快照', () => {
  it('熟鸡胸肉 31g/100g，150g 计算为 46.5g', () => {
    const chicken = SYSTEM_FOODS.find((food) => food.id === chickenId)!
    expect(chicken.systemProtein).toBe(31)
    expect(calculateReferenceProtein({ baseAmount: chicken.baseAmount, proteinAmount: chicken.systemProtein }, 150)).toBe(46.5)
  })

  it('纯牛奶设置我的数值 4.1g/100mL 后，200mL 计算为 8.2g', () => {
    const store = new ProteinStore(new MemoryAdapter())
    store.setSystemFoodOverride(milkId, 4.1)
    store.addFoodEntry(date, milkId, 200)
    expect(store.getDashboard(date).day.entries[0].protein).toBe(8.2)
    expect(store.getFood(milkId)).toMatchObject({ userProtein: 4.1, effectiveProtein: 4.1, userModified: true })
  })

  it('自定义蛋白粉每30g含24g，45g 计算为36g', () => {
    const store = new ProteinStore(new MemoryAdapter())
    store.upsertCustomFood({ name: '测试乳清蛋白粉', baseAmount: 30, baseUnit: 'g', proteinAmount: 24, category: '蛋白粉及加工食品' })
    const food = store.getCatalog().find((item) => item.name === '测试乳清蛋白粉')!
    store.addFoodEntry(date, food.id, 45)
    expect(store.getDashboard(date).day.entries[0].protein).toBe(36)
  })

  it('自定义蛋白棒每1根含20g，0.5根计算为10g', () => {
    const store = new ProteinStore(new MemoryAdapter())
    store.upsertCustomFood({ name: '测试蛋白棒', baseAmount: 1, baseUnit: '根', proteinAmount: 20, category: '蛋白粉及加工食品' })
    const food = store.getCatalog().find((item) => item.name === '测试蛋白棒')!
    store.addFoodEntry(date, food.id, 0.5)
    expect(store.getDashboard(date).day.entries[0].protein).toBe(10)
  })

  it('修改系统参考值只影响新记录，旧历史快照保持不变', () => {
    const store = new ProteinStore(new MemoryAdapter())
    store.addFoodEntry(date, milkId, 200)
    const oldEntry = store.getDashboard(date).day.entries[0]
    expect(oldEntry.protein).toBe(6.3)
    expect(oldEntry.snapshotProteinAmount).toBe(3.15)
    store.setSystemFoodOverride(milkId, 4.1)
    expect(store.getDashboard(date).day.entries[0]).toMatchObject({ protein: 6.3, snapshotProteinAmount: 3.15 })
    store.addFoodEntry('2026-09-28', milkId, 200)
    expect(store.getDashboard('2026-09-28').day.entries[0]).toMatchObject({ protein: 8.2, snapshotProteinAmount: 4.1 })
  })

  it('收藏可切换并在重新实例化后保持', () => {
    const adapter = new MemoryAdapter()
    let store = new ProteinStore(adapter)
    store.toggleFavorite(chickenId)
    expect(store.getFood(chickenId)?.favorite).toBe(true)
    store = new ProteinStore(adapter)
    expect(store.getFood(chickenId)?.favorite).toBe(true)
    store.toggleFavorite(chickenId)
    expect(store.getFood(chickenId)?.favorite).toBe(false)
  })

  it('成功新增摄入后写入最近使用，并按最后使用排序', () => {
    const store = new ProteinStore(new MemoryAdapter())
    store.addFoodEntry(date, chickenId, 100)
    store.addFoodEntry(date, milkId, 100)
    expect(store.load().recentFoodIds.slice(0, 2)).toEqual([milkId, chickenId])
    expect(store.getFood(milkId)?.recentRank).toBe(0)
  })

  it('恢复系统参考值后重新采用系统值', () => {
    const store = new ProteinStore(new MemoryAdapter())
    store.setSystemFoodOverride(milkId, 4.1)
    store.restoreSystemFoodReference(milkId)
    expect(store.getFood(milkId)).toMatchObject({ effectiveProtein: 3.15, userModified: false })
  })

  it('v1 自定义食品与历史记录可迁移到 v2 且不会丢失', () => {
    const migrated = normalizeState({
      version: 1,
      lastTarget: 70,
      foods: [{ id: 'legacy-food', name: '旧食品', unit: '份', proteinPerUnit: 6, createdAt: 1, updatedAt: 1 }],
      days: {
        [date]: {
          date,
          target: 70,
          entries: [{ id: 'legacy-entry', sourceFoodId: 'legacy-food', name: '旧食品', unit: '份', proteinPerUnit: 6, quantity: 2, protein: 12, createdAt: 1, updatedAt: 1 }],
        },
      },
    })
    expect(migrated.version).toBe(2)
    expect(migrated.foods[0]).toMatchObject({ name: '旧食品', baseAmount: 1, baseUnit: '份', systemProtein: 6 })
    expect(migrated.days[date].entries[0]).toMatchObject({ protein: 12, snapshotProteinAmount: 6 })
  })

  it('系统覆盖、自定义食品、收藏、最近使用和历史都写入同一本地键', () => {
    const adapter = new MemoryAdapter()
    const store = new ProteinStore(adapter)
    store.setSystemFoodOverride(milkId, 4.1)
    store.upsertCustomFood({ name: '持久化食品', baseAmount: 1, baseUnit: '份', proteinAmount: 9, category: '我的食品' })
    store.toggleFavorite(chickenId)
    store.addFoodEntry(date, chickenId, 1)
    const reloaded = new ProteinStore(adapter)
    expect(adapter.disk.has(STORAGE_KEY)).toBe(true)
    expect(reloaded.load()).toMatchObject({ systemOverrides: { [milkId]: 4.1 }, favoriteFoodIds: [chickenId] })
    expect(reloaded.getCatalog().some((food) => food.name === '持久化食品')).toBe(true)
    expect(reloaded.getDashboard(date).day.entries).toHaveLength(1)
  })
})
