import {
  calculateReferenceProtein,
  calculateSummary,
  createId,
  isValidDateKey,
  validateEntry,
  validateFood,
  validateReferenceFood,
  validateTarget,
  type EntryInput,
  type FoodInput,
  type ReferenceFoodInput,
  type Summary,
} from '../domain/protein'
import { FOOD_CATEGORIES, SYSTEM_FOODS, type FoodCategory, type SystemFoodRecord } from '../data/system-foods'

export const STORAGE_KEY = 'proteinCalculatorStateV1'
const VERSION = 2

export interface StoredCustomFood {
  id: string
  name: string
  nameEn: string
  category: string
  state: string
  baseAmount: number
  baseUnit: string
  unit: string
  systemProtein: number
  proteinPerUnit: number
  notes: string
  sourceName: string
  sourceId: string
  sourceUrl: string
  queriedAt: string
  isSystem: false
  isCustom: true
  imageLocalPath: string
  imageSource: string
  imageLicense: string
  createdAt: number
  updatedAt: number
}

export interface CatalogFood {
  id: string
  name: string
  nameEn: string
  category: string
  state: string
  baseAmount: number
  baseUnit: string
  unit: string
  systemProtein: number
  userProtein?: number
  effectiveProtein: number
  proteinPerUnit: number
  notes: string
  sourceName: string
  sourceId: string
  sourceUrl: string
  queriedAt: string
  isSystem: boolean
  isCustom: boolean
  userModified: boolean
  imageLocalPath: string
  imageSource: string
  imageLicense: string
  favorite: boolean
  recentRank: number
  createdAt?: number
  updatedAt?: number
}

export type Food = CatalogFood

export interface DailyEntry {
  id: string
  sourceFoodId: string
  name: string
  unit: string
  proteinPerUnit: number
  quantity: number
  protein: number
  snapshotBaseAmount: number
  snapshotBaseUnit: string
  snapshotProteinAmount: number
  snapshotSource: string
  snapshotSourceId: string
  snapshotState: string
  recordedDate: string
  createdAt: number
  updatedAt: number
}

export interface DayRecord {
  date: string
  target: number
  entries: DailyEntry[]
  updatedAt: number
}

export interface AppState {
  version: number
  lastTarget: number
  foods: StoredCustomFood[]
  systemOverrides: Record<string, number>
  favoriteFoodIds: string[]
  recentFoodIds: string[]
  days: Record<string, DayRecord>
}

export interface HistoryItem extends Summary {
  date: string
  entryCount: number
}

export interface StorageAdapter {
  get(key: string): unknown
  set(key: string, value: unknown): void
}

export interface CustomFoodInput extends ReferenceFoodInput {
  id?: string
  state?: unknown
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function freshState(): AppState {
  return {
    version: VERSION,
    lastTarget: 70,
    foods: [],
    systemOverrides: {},
    favoriteFoodIds: [],
    recentFoodIds: [],
    days: {},
  }
}

function safeTarget(value: unknown, fallback = 70): number {
  try {
    return validateTarget(value)
  } catch {
    return fallback
  }
}

function safePositive(value: unknown): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function normalizeCustomFood(raw: unknown): StoredCustomFood | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const food = raw as Partial<StoredCustomFood> & { unit?: unknown; proteinPerUnit?: unknown }
  if (typeof food.id !== 'string') return undefined
  const now = Date.now()
  try {
    if (food.baseAmount !== undefined || food.baseUnit !== undefined || food.systemProtein !== undefined) {
      const data = validateReferenceFood({
        name: food.name,
        baseAmount: food.baseAmount,
        baseUnit: food.baseUnit,
        proteinAmount: food.systemProtein,
        category: food.category ?? '我的食品',
        notes: food.notes ?? '',
      })
      return {
        id: food.id,
        name: data.name,
        nameEn: String(food.nameEn ?? ''),
        category: data.category,
        state: String(food.state ?? '自定义'),
        baseAmount: data.baseAmount,
        baseUnit: data.baseUnit,
        unit: data.baseUnit,
        systemProtein: data.proteinAmount,
        proteinPerUnit: data.proteinAmount / data.baseAmount,
        notes: data.notes,
        sourceName: String(food.sourceName ?? '用户根据包装营养成分表录入'),
        sourceId: String(food.sourceId ?? ''),
        sourceUrl: String(food.sourceUrl ?? ''),
        queriedAt: String(food.queriedAt ?? ''),
        isSystem: false,
        isCustom: true,
        imageLocalPath: String(food.imageLocalPath ?? '/static/food-icons/processed.svg'),
        imageSource: String(food.imageSource ?? '项目自制分类图标'),
        imageLicense: String(food.imageLicense ?? '项目原创，可随本项目使用'),
        createdAt: Number(food.createdAt) || now,
        updatedAt: Number(food.updatedAt) || now,
      }
    }

    const legacy = validateFood({ name: food.name, unit: food.unit, proteinPerUnit: food.proteinPerUnit })
    return {
      id: food.id,
      name: legacy.name,
      nameEn: '',
      category: '我的食品',
      state: '从 v1 迁移',
      baseAmount: 1,
      baseUnit: legacy.unit,
      unit: legacy.unit,
      systemProtein: legacy.proteinPerUnit,
      proteinPerUnit: legacy.proteinPerUnit,
      notes: '由第一阶段自定义食品自动迁移。',
      sourceName: '用户输入',
      sourceId: '',
      sourceUrl: '',
      queriedAt: '',
      isSystem: false,
      isCustom: true,
      imageLocalPath: '/static/food-icons/processed.svg',
      imageSource: '项目自制分类图标',
      imageLicense: '项目原创，可随本项目使用',
      createdAt: Number(food.createdAt) || now,
      updatedAt: Number(food.updatedAt) || now,
    }
  } catch {
    return undefined
  }
}

function normalizeEntry(raw: unknown, date: string): DailyEntry | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const entry = raw as Partial<DailyEntry>
  if (typeof entry.id !== 'string') return undefined
  try {
    const legacy = validateEntry({
      name: entry.name,
      unit: entry.unit,
      proteinPerUnit: entry.proteinPerUnit,
      quantity: entry.quantity,
    })
    const snapshotBaseAmount = safePositive(entry.snapshotBaseAmount) ?? 1
    const snapshotProteinAmount = safePositive(entry.snapshotProteinAmount) ?? legacy.proteinPerUnit * snapshotBaseAmount
    return {
      id: entry.id,
      sourceFoodId: String(entry.sourceFoodId ?? ''),
      name: legacy.name,
      unit: String(entry.snapshotBaseUnit ?? legacy.unit),
      proteinPerUnit: legacy.proteinPerUnit,
      quantity: legacy.quantity,
      protein: safePositive(entry.protein) ?? legacy.protein,
      snapshotBaseAmount,
      snapshotBaseUnit: String(entry.snapshotBaseUnit ?? legacy.unit),
      snapshotProteinAmount,
      snapshotSource: String(entry.snapshotSource ?? '历史记录'),
      snapshotSourceId: String(entry.snapshotSourceId ?? ''),
      snapshotState: String(entry.snapshotState ?? ''),
      recordedDate: String(entry.recordedDate ?? date),
      createdAt: Number(entry.createdAt) || Date.now(),
      updatedAt: Number(entry.updatedAt) || Date.now(),
    }
  } catch {
    return undefined
  }
}

export function normalizeState(raw: unknown): AppState {
  const next = freshState()
  if (!raw || typeof raw !== 'object') return next
  const value = raw as Partial<AppState>
  next.lastTarget = safeTarget(value.lastTarget)

  if (Array.isArray(value.foods)) {
    next.foods = value.foods.map(normalizeCustomFood).filter((food): food is StoredCustomFood => Boolean(food))
  }

  if (value.systemOverrides && typeof value.systemOverrides === 'object') {
    for (const [id, amount] of Object.entries(value.systemOverrides)) {
      if (!SYSTEM_FOODS.some((food) => food.id === id)) continue
      const protein = safePositive(amount)
      if (protein && protein <= 10000) next.systemOverrides[id] = protein
    }
  }

  const knownIds = new Set([...SYSTEM_FOODS.map((food) => food.id), ...next.foods.map((food) => food.id)])
  next.favoriteFoodIds = Array.from(new Set(Array.isArray(value.favoriteFoodIds) ? value.favoriteFoodIds : []))
    .filter((id): id is string => typeof id === 'string' && knownIds.has(id))
  next.recentFoodIds = Array.from(new Set(Array.isArray(value.recentFoodIds) ? value.recentFoodIds : []))
    .filter((id): id is string => typeof id === 'string' && knownIds.has(id))
    .slice(0, 20)

  if (value.days && typeof value.days === 'object') {
    for (const [date, candidate] of Object.entries(value.days)) {
      if (!isValidDateKey(date) || !candidate || typeof candidate !== 'object') continue
      const day = candidate as DayRecord
      const entries = Array.isArray(day.entries)
        ? day.entries.map((entry) => normalizeEntry(entry, date)).filter((entry): entry is DailyEntry => Boolean(entry))
        : []
      next.days[date] = {
        date,
        target: safeTarget(day.target, next.lastTarget),
        entries,
        updatedAt: Number(day.updatedAt) || Date.now(),
      }
    }
  }
  return next
}

const uniAdapter: StorageAdapter = {
  get(key) {
    return uni.getStorageSync(key)
  },
  set(key, value) {
    uni.setStorageSync(key, value)
  },
}

function systemToCatalog(food: SystemFoodRecord, state: AppState): CatalogFood {
  const userProtein = state.systemOverrides[food.id]
  const effectiveProtein = userProtein ?? food.systemProtein
  return {
    ...clone(food),
    userProtein,
    effectiveProtein,
    proteinPerUnit: effectiveProtein / food.baseAmount,
    unit: food.baseUnit,
    userModified: userProtein !== undefined,
    favorite: state.favoriteFoodIds.includes(food.id),
    recentRank: state.recentFoodIds.indexOf(food.id),
  }
}

function customToCatalog(food: StoredCustomFood, state: AppState): CatalogFood {
  return {
    ...clone(food),
    effectiveProtein: food.systemProtein,
    userModified: false,
    favorite: state.favoriteFoodIds.includes(food.id),
    recentRank: state.recentFoodIds.indexOf(food.id),
  }
}

export class ProteinStore {
  constructor(private readonly adapter: StorageAdapter = uniAdapter) {}

  load(): AppState {
    return normalizeState(this.adapter.get(STORAGE_KEY))
  }

  save(state: AppState): AppState {
    const normalized = normalizeState(state)
    this.adapter.set(STORAGE_KEY, normalized)
    return clone(normalized)
  }

  getCatalog(): CatalogFood[] {
    const state = this.load()
    return [
      ...SYSTEM_FOODS.map((food) => systemToCatalog(food, state)),
      ...state.foods.map((food) => customToCatalog(food, state)),
    ]
  }

  getFood(foodId: string): CatalogFood | undefined {
    return this.getCatalog().find((food) => food.id === foodId)
  }

  private ensureDay(state: AppState, date: string): DayRecord {
    if (!isValidDateKey(date)) throw new Error('日期格式必须为 YYYY-MM-DD')
    if (!state.days[date]) state.days[date] = { date, target: state.lastTarget, entries: [], updatedAt: Date.now() }
    return state.days[date]
  }

  getDashboard(date: string) {
    const state = this.load()
    const day = this.ensureDay(state, date)
    this.save(state)
    return { state: clone(state), day: clone(day), summary: calculateSummary(day.target, day.entries) }
  }

  setTarget(date: string, value: unknown): AppState {
    const target = validateTarget(value)
    const state = this.load()
    const day = this.ensureDay(state, date)
    day.target = target
    day.updatedAt = Date.now()
    state.lastTarget = target
    return this.save(state)
  }

  upsertCustomFood(input: CustomFoodInput): AppState {
    const data = validateReferenceFood(input)
    const state = this.load()
    const now = Date.now()
    const common = {
      name: data.name,
      nameEn: '',
      category: data.category,
      state: String(input.state ?? '自定义'),
      baseAmount: data.baseAmount,
      baseUnit: data.baseUnit,
      unit: data.baseUnit,
      systemProtein: data.proteinAmount,
      proteinPerUnit: data.proteinAmount / data.baseAmount,
      notes: data.notes,
      sourceName: '用户根据包装营养成分表录入',
      sourceId: '', sourceUrl: '', queriedAt: '',
      isSystem: false as const,
      isCustom: true as const,
      imageLocalPath: '/static/food-icons/processed.svg',
      imageSource: '项目自制分类图标',
      imageLicense: '项目原创，可随本项目使用',
      updatedAt: now,
    }
    if (input.id) {
      const index = state.foods.findIndex((food) => food.id === input.id)
      if (index < 0) throw new Error('没有找到要修改的自定义食品')
      state.foods[index] = { ...state.foods[index], ...common }
    } else {
      state.foods.unshift({ id: createId('food'), ...common, createdAt: now })
    }
    return this.save(state)
  }

  upsertFood(input: FoodInput & { id?: string }): AppState {
    const data = validateFood(input)
    return this.upsertCustomFood({
      id: input.id, name: data.name, baseAmount: 1, baseUnit: data.unit,
      proteinAmount: data.proteinPerUnit, category: '我的食品',
      notes: '兼容第一阶段的每单位录入方式。',
    })
  }

  deleteFood(id: string): AppState {
    const state = this.load()
    state.foods = state.foods.filter((food) => food.id !== id)
    state.favoriteFoodIds = state.favoriteFoodIds.filter((foodId) => foodId !== id)
    state.recentFoodIds = state.recentFoodIds.filter((foodId) => foodId !== id)
    return this.save(state)
  }

  setSystemFoodOverride(id: string, value: unknown): AppState {
    const food = SYSTEM_FOODS.find((item) => item.id === id)
    if (!food) throw new Error('没有找到要修改的系统食品')
    const protein = validateReferenceFood({
      name: food.name, baseAmount: food.baseAmount, baseUnit: food.baseUnit,
      proteinAmount: value, category: food.category,
    }).proteinAmount
    const state = this.load()
    state.systemOverrides[id] = protein
    return this.save(state)
  }

  restoreSystemFoodReference(id: string): AppState {
    const state = this.load()
    delete state.systemOverrides[id]
    return this.save(state)
  }

  toggleFavorite(id: string): AppState {
    if (!this.getFood(id)) throw new Error('没有找到该食品')
    const state = this.load()
    state.favoriteFoodIds = state.favoriteFoodIds.includes(id)
      ? state.favoriteFoodIds.filter((foodId) => foodId !== id)
      : [id, ...state.favoriteFoodIds]
    return this.save(state)
  }

  private rememberRecent(state: AppState, id: string) {
    state.recentFoodIds = [id, ...state.recentFoodIds.filter((foodId) => foodId !== id)].slice(0, 20)
  }

  addFoodEntry(date: string, foodId: string, quantity: unknown): AppState {
    const food = this.getFood(foodId)
    if (!food) throw new Error('没有找到要记录的食品')
    const protein = calculateReferenceProtein({ baseAmount: food.baseAmount, proteinAmount: food.effectiveProtein }, quantity)
    const actualQuantity = Number(quantity)
    const state = this.load()
    const day = this.ensureDay(state, date)
    const now = Date.now()
    day.entries.unshift({
      id: createId('entry'), sourceFoodId: food.id, name: food.name, unit: food.baseUnit,
      proteinPerUnit: food.effectiveProtein / food.baseAmount, quantity: actualQuantity, protein,
      snapshotBaseAmount: food.baseAmount, snapshotBaseUnit: food.baseUnit,
      snapshotProteinAmount: food.effectiveProtein,
      snapshotSource: food.userModified ? '我的数值' : food.sourceName,
      snapshotSourceId: food.sourceId, snapshotState: food.state, recordedDate: date,
      createdAt: now, updatedAt: now,
    })
    day.updatedAt = now
    this.rememberRecent(state, food.id)
    return this.save(state)
  }

  addEntry(date: string, input: EntryInput & { sourceFoodId?: string }): AppState {
    const data = validateEntry(input)
    const state = this.load()
    const day = this.ensureDay(state, date)
    const now = Date.now()
    day.entries.unshift({
      id: createId('entry'), sourceFoodId: input.sourceFoodId ?? '', name: data.name,
      unit: data.unit, proteinPerUnit: data.proteinPerUnit, quantity: data.quantity, protein: data.protein,
      snapshotBaseAmount: 1, snapshotBaseUnit: data.unit, snapshotProteinAmount: data.proteinPerUnit,
      snapshotSource: '用户输入（v1兼容）', snapshotSourceId: '', snapshotState: '', recordedDate: date,
      createdAt: now, updatedAt: now,
    })
    day.updatedAt = now
    return this.save(state)
  }

  updateEntry(date: string, entryId: string, quantity: unknown): AppState {
    const state = this.load()
    const day = this.ensureDay(state, date)
    const entry = day.entries.find((item) => item.id === entryId)
    if (!entry) throw new Error('没有找到要修改的摄入记录')
    const data = validateEntry({ ...entry, quantity })
    Object.assign(entry, data, { updatedAt: Date.now() })
    day.updatedAt = Date.now()
    return this.save(state)
  }

  deleteEntry(date: string, entryId: string): AppState {
    const state = this.load()
    const day = this.ensureDay(state, date)
    day.entries = day.entries.filter((entry) => entry.id !== entryId)
    day.updatedAt = Date.now()
    return this.save(state)
  }

  getHistory(): HistoryItem[] {
    const state = this.load()
    return Object.values(state.days).sort((a, b) => b.date.localeCompare(a.date)).map((day) => ({
      date: day.date, entryCount: day.entries.length, ...calculateSummary(day.target, day.entries),
    }))
  }
}

export { FOOD_CATEGORIES, SYSTEM_FOODS, type FoodCategory }
