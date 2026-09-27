import { describe, expect, it } from 'vitest'
import { calculateSummary, isValidDateKey, validateEntry, validateFood, validateTarget } from '../../src/domain/protein'
import { ProteinStore, STORAGE_KEY, type StorageAdapter } from '../../src/services/storage'

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

describe('蛋白质计算核心', () => {
  it('按 70g 目标正确计算 12g + 10g', () => {
    expect(calculateSummary(70, [{ protein: 12 }, { protein: 10 }])).toEqual({
      target: 70,
      consumed: 22,
      remaining: 48,
      exceeded: 0,
      overTarget: false,
      percent: 31,
    })
  })

  it('超出目标时保留记录并给出超出量', () => {
    expect(calculateSummary(70, [{ protein: 75 }])).toMatchObject({
      consumed: 75,
      remaining: 0,
      exceeded: 5,
      overTarget: true,
    })
  })

  it.each(['', 0, -1, 'abc', Number.NaN])('拒绝非法目标 %p', (value) => {
    expect(() => validateTarget(value)).toThrow()
  })

  it.each(['', 0, -1, 'abc', Number.NaN])('拒绝非法数量 %p', (value) => {
    expect(() => validateEntry({ name: 'A', unit: '份', proteinPerUnit: 6, quantity: value })).toThrow()
  })

  it('拒绝空食物字段和非法日期', () => {
    expect(() => validateFood({ name: '', unit: '份', proteinPerUnit: 6 })).toThrow('食物名称')
    expect(isValidDateKey('2026-02-30')).toBe(false)
    expect(isValidDateKey('2026-09-27')).toBe(true)
  })
})

describe('本地数据闭环', () => {
  it('保存目标、食物和按日期隔离的记录，并在重载后恢复', () => {
    const adapter = new MemoryAdapter()
    let store = new ProteinStore(adapter)
    store.setTarget('2026-09-27', 70)
    store.upsertFood({ name: '测试食物 A', unit: '份', proteinPerUnit: 6 })
    let state = store.load()
    const foodA = state.foods[0]
    store.addEntry('2026-09-27', { ...foodA, sourceFoodId: foodA.id, quantity: 2 })
    store.upsertFood({ name: '测试食物 B', unit: '份', proteinPerUnit: 10 })
    state = store.load()
    const foodB = state.foods[0]
    store.addEntry('2026-09-27', { ...foodB, sourceFoodId: foodB.id, quantity: 1 })

    expect(store.getDashboard('2026-09-27').summary).toMatchObject({ consumed: 22, remaining: 48 })
    store.addEntry('2026-09-28', { ...foodB, sourceFoodId: foodB.id, quantity: 2 })
    expect(store.getDashboard('2026-09-28').summary.consumed).toBe(20)
    expect(store.getDashboard('2026-09-27').summary.consumed).toBe(22)

    store = new ProteinStore(adapter)
    expect(store.getDashboard('2026-09-27').summary).toMatchObject({ target: 70, consumed: 22, remaining: 48 })
    expect(adapter.disk.has(STORAGE_KEY)).toBe(true)
  })

  it('食物和摄入项目增改删后正确重算，删除食物不损坏历史快照', () => {
    const store = new ProteinStore(new MemoryAdapter())
    const date = '2026-09-27'
    store.setTarget(date, 70)
    store.upsertFood({ name: '食物', unit: '份', proteinPerUnit: 6 })
    let food = store.load().foods[0]
    store.upsertFood({ ...food, proteinPerUnit: 7 })
    food = store.load().foods[0]
    expect(food.proteinPerUnit).toBe(7)
    store.addEntry(date, { ...food, sourceFoodId: food.id, quantity: 2 })
    const entry = store.getDashboard(date).day.entries[0]
    expect(entry.protein).toBe(14)
    store.deleteFood(food.id)
    expect(store.getDashboard(date).day.entries[0].protein).toBe(14)
    store.updateEntry(date, entry.id, 3)
    expect(store.getDashboard(date).summary.consumed).toBe(21)
    store.deleteEntry(date, entry.id)
    expect(store.getDashboard(date).summary.consumed).toBe(0)
  })
})
