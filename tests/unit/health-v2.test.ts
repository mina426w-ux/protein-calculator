import { describe, expect, it } from 'vitest'
import {
  calculateBmi,
  calculateBmr,
  calculateHealthTargets,
  calculateProteinTarget,
  calculateTdee,
  validateProfileInput,
  type HealthProfile,
} from '../../src/domain/health'
import { ProteinStore, SYSTEM_FOODS, normalizeState, type StorageAdapter } from '../../src/services/storage'

class MemoryAdapter implements StorageAdapter {
  disk = new Map<string, string>()
  get(key: string) { const value = this.disk.get(key); return value ? JSON.parse(value) : undefined }
  set(key: string, value: unknown) { this.disk.set(key, JSON.stringify(value)) }
}

const profile = (overrides: Partial<HealthProfile> = {}) => validateProfileInput({
  age: 35, sex: 'male', heightCm: 180, currentWeightKg: 82.4, targetWeightKg: 75,
  activityLevel: 'moderate', goalMode: 'lose', calorieDeficit: 500, calorieMode: 'estimate',
  proteinMode: 'current', pregnancyStatus: 'none', ancestry: '不填写', dairyTolerance: '正常耐受',
  dietPattern: '普通饮食', exclusions: '', ...overrides,
})

describe('V2 个体目标计算', () => {
  it('Mifflin–St Jeor 男性计算正确', () => expect(calculateBmr('male', 82.4, 180, 35)).toBe(1779))
  it('Mifflin–St Jeor 女性计算正确', () => expect(calculateBmr('female', 82.4, 180, 35)).toBe(1613))
  it('活动系数与 TDEE 计算正确', () => expect(calculateTdee(1779, 'moderate')).toBe(2757))
  it('标准 500 kcal 缺口正确应用', () => expect(calculateHealthTargets(profile()).calorieTarget).toBe(2257))
  it('蛋白质可明确按当前体重或目标体重计算', () => {
    expect(calculateProteinTarget(profile({ proteinMode: 'current' })).value).toBe(65.92)
    expect(calculateProteinTarget(profile({ proteinMode: 'target' })).value).toBe(60)
  })
  it('医生蛋白质目标覆盖自动值', () => expect(calculateProteinTarget(profile({ proteinMode: 'doctor', doctorProteinTarget: 70 })).value).toBe(70))
  it('自定义蛋白质与热量目标覆盖估算', () => {
    const result = calculateHealthTargets(profile({
      proteinMode: 'custom', customProteinTarget: 105, calorieMode: 'custom', customCalorieTarget: 1900,
    }))
    expect(result).toMatchObject({ proteinTarget: 105, calorieTarget: 1900, proteinSource: '自定义目标', calorieSource: '自定义目标' })
  })
  it('未成年人、孕哺期与 BMI<18.5 不自动给减重目标', () => {
    expect(calculateHealthTargets(profile({ age: 17 })).calorieTarget).toBeNull()
    expect(calculateHealthTargets(profile({ pregnancyStatus: 'pregnant' })).calorieTarget).toBeNull()
    expect(calculateHealthTargets(profile({ currentWeightKg: 50, heightCm: 180 })).calorieTarget).toBeNull()
    expect(calculateBmi(50, 180)).toBeLessThan(18.5)
  })
})

describe('V2 数据迁移、热量、体重与趋势', () => {
  it('V1 状态迁移到 schema 3，原目标、食品和蛋白质历史完整保留', () => {
    const migrated = normalizeState({
      version: 1, lastTarget: 70,
      foods: [{ id: 'legacy-food', name: '旧食品', unit: '份', proteinPerUnit: 6, createdAt: 1, updatedAt: 1 }],
      days: { '2026-09-27': { date: '2026-09-27', target: 70, entries: [
        { id: 'legacy-entry', name: '旧食品', unit: '份', proteinPerUnit: 6, quantity: 2, protein: 12, createdAt: 1, updatedAt: 1 },
      ] } },
    })
    expect(migrated.version).toBe(3)
    expect(migrated.lastTarget).toBe(70)
    expect(migrated.foods[0]).toMatchObject({ name: '旧食品', systemProtein: 6, systemCalories: null })
    expect(migrated.days['2026-09-27'].entries[0]).toMatchObject({ protein: 12, calories: null })
  })

  it('106 项 USDA 食品都有热量且鸡胸肉 150g 同时累计蛋白质和热量', () => {
    expect(SYSTEM_FOODS.filter((food) => food.systemCalories === null)).toHaveLength(0)
    const store = new ProteinStore(new MemoryAdapter())
    store.addFoodEntry('2026-09-27', 'system-chicken-breast-cooked', 150)
    const dashboard = store.getDashboard('2026-09-27')
    expect(dashboard.day.entries[0]).toMatchObject({ protein: 46.5, calories: 247.5 })
    expect(dashboard.calorieSummary.consumed).toBe(247.5)
  })

  it('自定义食品热量与蛋白质按基准份量计算', () => {
    const store = new ProteinStore(new MemoryAdapter())
    store.upsertCustomFood({ name: 'V2蛋白粉', baseAmount: 30, baseUnit: 'g', proteinAmount: 24, calorieAmount: 120 })
    const food = store.getCatalog().find((item) => item.name === 'V2蛋白粉')!
    store.addFoodEntry('2026-09-27', food.id, 45)
    expect(store.getDashboard('2026-09-27').day.entries[0]).toMatchObject({ protein: 36, calories: 180 })
  })

  it('修改系统蛋白质和热量后只影响新记录，旧快照不变', () => {
    const store = new ProteinStore(new MemoryAdapter())
    store.addFoodEntry('2026-09-27', 'system-milk-whole', 200)
    const original = store.getDashboard('2026-09-27').day.entries[0]
    store.setSystemFoodNutritionOverride('system-milk-whole', 4.1, 70)
    expect(store.getDashboard('2026-09-27').day.entries[0]).toEqual(original)
    store.addFoodEntry('2026-09-28', 'system-milk-whole', 200)
    expect(store.getDashboard('2026-09-28').day.entries[0]).toMatchObject({ protein: 8.2, calories: 140, snapshotProteinAmount: 4.1, snapshotCaloriesAmount: 70 })
  })

  it('资料、体重和页面重载后仍存在', () => {
    const adapter = new MemoryAdapter(); let store = new ProteinStore(adapter)
    store.saveProfile(profile(), '2026-09-27'); store.upsertWeight('2026-09-27', 82.4)
    store = new ProteinStore(adapter)
    expect(store.getProfile()).toMatchObject({ age: 35, currentWeightKg: 82.4, targetWeightKg: 75 })
    expect(store.load().weights['2026-09-27'].weightKg).toBe(82.4)
  })

  it('完成今日记录并计算连续天数', () => {
    const store = new ProteinStore(new MemoryAdapter())
    for (const date of ['2026-09-25', '2026-09-26', '2026-09-27']) {
      store.addFoodEntry(date, 'system-egg-whole-boiled-piece', 1); store.completeDay(date)
    }
    expect(store.getTrends('2026-09-27').streak).toBe(3)
  })

  it('7 日趋势计算平均体重、蛋白质达成率和热量', () => {
    const store = new ProteinStore(new MemoryAdapter())
    store.setTarget('2026-09-26', 10); store.setTarget('2026-09-27', 10)
    store.upsertWeight('2026-09-26', 82); store.upsertWeight('2026-09-27', 80)
    store.addFoodEntry('2026-09-26', 'system-egg-whole-boiled-piece', 1)
    store.addFoodEntry('2026-09-27', 'system-egg-whole-boiled-piece', 2)
    const result = store.getTrends('2026-09-27')
    expect(result.averageWeight).toBe(81)
    expect(result.averageProteinPercent).toBe(94.5)
    expect(result.averageCalories).toBe(116.25)
  })
})
