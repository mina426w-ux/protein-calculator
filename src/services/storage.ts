import {
  calculateReferenceProtein,
  calculateSummary,
  createId,
  formatLocalDate,
  isValidDateKey,
  roundProtein,
  validateEntry,
  validateFood,
  validateReferenceFood,
  validateTarget,
  type EntryInput,
  type FoodInput,
  type ReferenceFoodInput,
  type Summary,
} from '../domain/protein'
import {
  calculateHealthTargets,
  validateProfileInput,
  type HealthProfile,
  type HealthTargets,
} from '../domain/health'
import { FOOD_CATEGORIES, SYSTEM_FOODS, type FoodCategory, type SystemFoodRecord } from '../data/system-foods'

export const STORAGE_KEY = 'proteinCalculatorStateV1'
const VERSION = 3

export interface StoredCustomFood {
  id: string
  schemaVersion: 3
  name: string
  nameEn: string
  category: string
  state: string
  baseAmount: number
  baseUnit: string
  unit: string
  systemProtein: number
  proteinPerUnit: number
  systemCalories: number | null
  caloriesPerUnit: number | null
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
  deletedAt: null
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
  systemCalories: number | null
  userCalories?: number
  effectiveCalories: number | null
  caloriesPerUnit: number | null
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
  schemaVersion: 3
  sourceFoodId: string
  name: string
  unit: string
  proteinPerUnit: number
  caloriesPerUnit: number | null
  quantity: number
  protein: number
  calories: number | null
  snapshotBaseAmount: number
  snapshotBaseUnit: string
  snapshotProteinAmount: number
  snapshotCaloriesAmount: number | null
  snapshotSource: string
  snapshotSourceId: string
  snapshotState: string
  recordedDate: string
  createdAt: number
  updatedAt: number
  deletedAt: null
}

export interface DayRecord {
  date: string
  schemaVersion: 3
  target: number
  calorieTarget: number | null
  entries: DailyEntry[]
  completedAt: number | null
  createdAt: number
  updatedAt: number
  deletedAt: null
}

export interface WeightRecord {
  id: string
  schemaVersion: 3
  date: string
  weightKg: number
  createdAt: number
  updatedAt: number
  deletedAt: null
}

export interface AppState {
  version: number
  lastTarget: number
  profile?: HealthProfile
  foods: StoredCustomFood[]
  systemOverrides: Record<string, number>
  systemCalorieOverrides: Record<string, number>
  favoriteFoodIds: string[]
  recentFoodIds: string[]
  days: Record<string, DayRecord>
  weights: Record<string, WeightRecord>
}

export interface CalorieSummary {
  target: number | null
  consumed: number
  remaining: number | null
  exceeded: number
  overTarget: boolean
  percent: number
  unknownEntryCount: number
}

export interface HistoryItem extends Summary {
  date: string
  entryCount: number
  calories: number
  calorieTarget: number | null
  completed: boolean
}

export interface TrendSummary {
  averageWeight: number | null
  averageProteinPercent: number | null
  averageCalories: number | null
  streak: number
}

export interface StorageAdapter {
  get(key: string): unknown
  set(key: string, value: unknown): void
}

export interface CustomFoodInput extends ReferenceFoodInput {
  id?: string
  state?: unknown
  calorieAmount?: unknown
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
    systemCalorieOverrides: {},
    favoriteFoodIds: [],
    recentFoodIds: [],
    days: {},
    weights: {},
  }
}

function safeTarget(value: unknown, fallback = 70): number {
  try { return validateTarget(value) } catch { return fallback }
}

function safePositive(value: unknown): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function optionalCalories(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 100000) throw new Error('热量必须是 0–100000 之间的数字')
  return roundProtein(number)
}

function normalizeCustomFood(raw: unknown): StoredCustomFood | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const food = raw as Partial<StoredCustomFood> & { unit?: unknown; proteinPerUnit?: unknown }
  if (typeof food.id !== 'string') return undefined
  const now = Date.now()
  try {
    if (food.baseAmount !== undefined || food.baseUnit !== undefined || food.systemProtein !== undefined) {
      const data = validateReferenceFood({
        name: food.name, baseAmount: food.baseAmount, baseUnit: food.baseUnit,
        proteinAmount: food.systemProtein, category: food.category ?? '我的食品', notes: food.notes ?? '',
      })
      const calories = optionalCalories(food.systemCalories)
      return {
        id: food.id, schemaVersion: 3, name: data.name, nameEn: String(food.nameEn ?? ''),
        category: data.category, state: String(food.state ?? '自定义'), baseAmount: data.baseAmount,
        baseUnit: data.baseUnit, unit: data.baseUnit, systemProtein: data.proteinAmount,
        proteinPerUnit: data.proteinAmount / data.baseAmount, systemCalories: calories,
        caloriesPerUnit: calories === null ? null : calories / data.baseAmount, notes: data.notes,
        sourceName: String(food.sourceName ?? '用户根据包装营养成分表录入'),
        sourceId: String(food.sourceId ?? ''), sourceUrl: String(food.sourceUrl ?? ''),
        queriedAt: String(food.queriedAt ?? ''), isSystem: false, isCustom: true,
        imageLocalPath: String(food.imageLocalPath ?? '/static/food-icons/processed.svg'),
        imageSource: String(food.imageSource ?? '项目自制分类图标'),
        imageLicense: String(food.imageLicense ?? '项目原创，可随本项目使用'),
        createdAt: Number(food.createdAt) || now, updatedAt: Number(food.updatedAt) || now, deletedAt: null,
      }
    }
    const legacy = validateFood({ name: food.name, unit: food.unit, proteinPerUnit: food.proteinPerUnit })
    return {
      id: food.id, schemaVersion: 3, name: legacy.name, nameEn: '', category: '我的食品',
      state: '从 v1 迁移', baseAmount: 1, baseUnit: legacy.unit, unit: legacy.unit,
      systemProtein: legacy.proteinPerUnit, proteinPerUnit: legacy.proteinPerUnit,
      systemCalories: null, caloriesPerUnit: null, notes: '由第一阶段自定义食品自动迁移；热量未填写。',
      sourceName: '用户输入', sourceId: '', sourceUrl: '', queriedAt: '', isSystem: false, isCustom: true,
      imageLocalPath: '/static/food-icons/processed.svg', imageSource: '项目自制分类图标',
      imageLicense: '项目原创，可随本项目使用', createdAt: Number(food.createdAt) || now,
      updatedAt: Number(food.updatedAt) || now, deletedAt: null,
    }
  } catch { return undefined }
}

function normalizeEntry(raw: unknown, date: string): DailyEntry | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const entry = raw as Partial<DailyEntry>
  if (typeof entry.id !== 'string') return undefined
  try {
    const legacy = validateEntry({ name: entry.name, unit: entry.unit, proteinPerUnit: entry.proteinPerUnit, quantity: entry.quantity })
    const baseAmount = safePositive(entry.snapshotBaseAmount) ?? 1
    const proteinAmount = safePositive(entry.snapshotProteinAmount) ?? legacy.proteinPerUnit * baseAmount
    const caloriesAmount = optionalCalories(entry.snapshotCaloriesAmount)
    const calories = optionalCalories(entry.calories)
    const now = Date.now()
    return {
      id: entry.id, schemaVersion: 3, sourceFoodId: String(entry.sourceFoodId ?? ''), name: legacy.name,
      unit: String(entry.snapshotBaseUnit ?? legacy.unit), proteinPerUnit: legacy.proteinPerUnit,
      caloriesPerUnit: caloriesAmount === null ? null : caloriesAmount / baseAmount,
      quantity: legacy.quantity, protein: safePositive(entry.protein) ?? legacy.protein, calories,
      snapshotBaseAmount: baseAmount, snapshotBaseUnit: String(entry.snapshotBaseUnit ?? legacy.unit),
      snapshotProteinAmount: proteinAmount, snapshotCaloriesAmount: caloriesAmount,
      snapshotSource: String(entry.snapshotSource ?? '历史记录'), snapshotSourceId: String(entry.snapshotSourceId ?? ''),
      snapshotState: String(entry.snapshotState ?? ''), recordedDate: String(entry.recordedDate ?? date),
      createdAt: Number(entry.createdAt) || now, updatedAt: Number(entry.updatedAt) || now, deletedAt: null,
    }
  } catch { return undefined }
}

function normalizeProfile(raw: unknown): HealthProfile | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  try { return validateProfileInput(raw as Partial<HealthProfile>, raw as HealthProfile) } catch { return undefined }
}

export function normalizeState(raw: unknown): AppState {
  const next = freshState()
  if (!raw || typeof raw !== 'object') return next
  const value = raw as Partial<AppState>
  next.lastTarget = safeTarget(value.lastTarget)
  next.profile = normalizeProfile(value.profile)
  if (Array.isArray(value.foods)) next.foods = value.foods.map(normalizeCustomFood).filter((food): food is StoredCustomFood => Boolean(food))

  for (const [target, source] of [
    [next.systemOverrides, value.systemOverrides],
    [next.systemCalorieOverrides, value.systemCalorieOverrides],
  ] as const) {
    if (!source || typeof source !== 'object') continue
    for (const [id, amount] of Object.entries(source)) {
      if (!SYSTEM_FOODS.some((food) => food.id === id)) continue
      const number = safePositive(amount)
      if (number && number <= 100000) target[id] = number
    }
  }

  const knownIds = new Set([...SYSTEM_FOODS.map((food) => food.id), ...next.foods.map((food) => food.id)])
  next.favoriteFoodIds = Array.from(new Set(Array.isArray(value.favoriteFoodIds) ? value.favoriteFoodIds : []))
    .filter((id): id is string => typeof id === 'string' && knownIds.has(id))
  next.recentFoodIds = Array.from(new Set(Array.isArray(value.recentFoodIds) ? value.recentFoodIds : []))
    .filter((id): id is string => typeof id === 'string' && knownIds.has(id)).slice(0, 20)

  if (value.days && typeof value.days === 'object') {
    for (const [date, candidate] of Object.entries(value.days)) {
      if (!isValidDateKey(date) || !candidate || typeof candidate !== 'object') continue
      const day = candidate as Partial<DayRecord>
      const now = Date.now()
      next.days[date] = {
        date, schemaVersion: 3, target: safeTarget(day.target, next.lastTarget),
        calorieTarget: optionalCalories(day.calorieTarget),
        entries: Array.isArray(day.entries) ? day.entries.map((entry) => normalizeEntry(entry, date)).filter((entry): entry is DailyEntry => Boolean(entry)) : [],
        completedAt: Number(day.completedAt) || null, createdAt: Number(day.createdAt) || Number(day.updatedAt) || now,
        updatedAt: Number(day.updatedAt) || now, deletedAt: null,
      }
    }
  }

  if (value.weights && typeof value.weights === 'object') {
    for (const [date, candidate] of Object.entries(value.weights)) {
      if (!isValidDateKey(date) || !candidate || typeof candidate !== 'object') continue
      const item = candidate as Partial<WeightRecord>
      const weightKg = safePositive(item.weightKg)
      if (!weightKg || weightKg < 20 || weightKg > 500) continue
      const now = Date.now()
      next.weights[date] = {
        id: typeof item.id === 'string' ? item.id : createId('weight'), schemaVersion: 3, date,
        weightKg: roundProtein(weightKg), createdAt: Number(item.createdAt) || now,
        updatedAt: Number(item.updatedAt) || now, deletedAt: null,
      }
    }
  }
  return next
}

const uniAdapter: StorageAdapter = {
  get(key) { return uni.getStorageSync(key) },
  set(key, value) { uni.setStorageSync(key, value) },
}

function systemToCatalog(food: SystemFoodRecord, state: AppState): CatalogFood {
  const userProtein = state.systemOverrides[food.id]
  const userCalories = state.systemCalorieOverrides[food.id]
  const effectiveProtein = userProtein ?? food.systemProtein
  const effectiveCalories = userCalories ?? food.systemCalories
  return {
    ...clone(food), userProtein, effectiveProtein, proteinPerUnit: effectiveProtein / food.baseAmount,
    userCalories, effectiveCalories, caloriesPerUnit: effectiveCalories === null ? null : effectiveCalories / food.baseAmount,
    unit: food.baseUnit, userModified: userProtein !== undefined || userCalories !== undefined,
    favorite: state.favoriteFoodIds.includes(food.id), recentRank: state.recentFoodIds.indexOf(food.id),
  }
}

function customToCatalog(food: StoredCustomFood, state: AppState): CatalogFood {
  return {
    ...clone(food), effectiveProtein: food.systemProtein, effectiveCalories: food.systemCalories,
    userModified: false, favorite: state.favoriteFoodIds.includes(food.id), recentRank: state.recentFoodIds.indexOf(food.id),
  }
}

export function calculateCalorieSummary(target: number | null, entries: DailyEntry[]): CalorieSummary {
  const known = entries.filter((entry) => entry.calories !== null)
  const consumed = roundProtein(known.reduce((sum, entry) => sum + (entry.calories ?? 0), 0))
  const difference = target === null ? null : roundProtein(target - consumed)
  return {
    target, consumed, remaining: difference === null ? null : Math.max(0, difference),
    exceeded: difference !== null && difference < 0 ? Math.abs(difference) : 0,
    overTarget: difference !== null && difference < 0,
    percent: target && target > 0 ? Math.round((consumed / target) * 100) : 0,
    unknownEntryCount: entries.length - known.length,
  }
}

function dateOffset(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + offset)
  return formatLocalDate(value)
}

export class ProteinStore {
  constructor(private readonly adapter: StorageAdapter = uniAdapter) {}

  load(): AppState { return normalizeState(this.adapter.get(STORAGE_KEY)) }
  save(state: AppState): AppState {
    const normalized = normalizeState(state)
    this.adapter.set(STORAGE_KEY, normalized)
    return clone(normalized)
  }
  getCatalog(): CatalogFood[] {
    const state = this.load()
    return [...SYSTEM_FOODS.map((food) => systemToCatalog(food, state)), ...state.foods.map((food) => customToCatalog(food, state))]
  }
  getFood(foodId: string) { return this.getCatalog().find((food) => food.id === foodId) }
  getProfile() { return this.load().profile }
  getHealthTargets(): HealthTargets | null {
    const profile = this.getProfile()
    return profile ? calculateHealthTargets(profile) : null
  }

  private ensureDay(state: AppState, date: string): DayRecord {
    if (!isValidDateKey(date)) throw new Error('日期格式必须为 YYYY-MM-DD')
    if (!state.days[date]) {
      const now = Date.now()
      const targets = state.profile ? calculateHealthTargets(state.profile) : null
      state.days[date] = {
        date, schemaVersion: 3, target: targets?.proteinTarget ?? state.lastTarget,
        calorieTarget: targets?.calorieTarget ?? null, entries: [], completedAt: null,
        createdAt: now, updatedAt: now, deletedAt: null,
      }
    }
    return state.days[date]
  }

  getDashboard(date: string) {
    const state = this.load()
    const day = this.ensureDay(state, date)
    this.save(state)
    return {
      state: clone(state), day: clone(day), summary: calculateSummary(day.target, day.entries),
      calorieSummary: calculateCalorieSummary(day.calorieTarget, day.entries),
      targets: state.profile ? calculateHealthTargets(state.profile) : null,
    }
  }

  saveProfile(input: Partial<HealthProfile>, applyDate = formatLocalDate()): AppState {
    const state = this.load()
    state.profile = validateProfileInput(input, state.profile)
    const targets = calculateHealthTargets(state.profile)
    state.lastTarget = targets.proteinTarget
    const day = this.ensureDay(state, applyDate)
    day.target = targets.proteinTarget
    day.calorieTarget = targets.calorieTarget
    day.updatedAt = Date.now()
    return this.save(state)
  }

  setTarget(date: string, value: unknown): AppState {
    const target = validateTarget(value)
    const state = this.load()
    const day = this.ensureDay(state, date)
    day.target = target; day.updatedAt = Date.now(); state.lastTarget = target
    if (state.profile) {
      state.profile.proteinMode = 'doctor'; state.profile.doctorProteinTarget = target; state.profile.updatedAt = Date.now()
    }
    return this.save(state)
  }

  upsertCustomFood(input: CustomFoodInput): AppState {
    const data = validateReferenceFood(input)
    const calories = optionalCalories(input.calorieAmount)
    const state = this.load()
    const now = Date.now()
    const common = {
      schemaVersion: 3 as const, name: data.name, nameEn: '', category: data.category,
      state: String(input.state ?? '自定义'), baseAmount: data.baseAmount, baseUnit: data.baseUnit,
      unit: data.baseUnit, systemProtein: data.proteinAmount, proteinPerUnit: data.proteinAmount / data.baseAmount,
      systemCalories: calories, caloriesPerUnit: calories === null ? null : calories / data.baseAmount,
      notes: data.notes, sourceName: '用户根据包装营养成分表录入', sourceId: '', sourceUrl: '', queriedAt: '',
      isSystem: false as const, isCustom: true as const, imageLocalPath: '/static/food-icons/processed.svg',
      imageSource: '项目自制分类图标', imageLicense: '项目原创，可随本项目使用', updatedAt: now, deletedAt: null,
    }
    if (input.id) {
      const index = state.foods.findIndex((food) => food.id === input.id)
      if (index < 0) throw new Error('没有找到要修改的自定义食品')
      state.foods[index] = { ...state.foods[index], ...common }
    } else state.foods.unshift({ id: createId('food'), ...common, createdAt: now })
    return this.save(state)
  }

  upsertFood(input: FoodInput & { id?: string }): AppState {
    const data = validateFood(input)
    return this.upsertCustomFood({
      id: input.id, name: data.name, baseAmount: 1, baseUnit: data.unit,
      proteinAmount: data.proteinPerUnit, category: '我的食品', notes: '兼容第一阶段的每单位录入方式。',
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
    const protein = validateReferenceFood({ name: food.name, baseAmount: food.baseAmount, baseUnit: food.baseUnit, proteinAmount: value, category: food.category }).proteinAmount
    const state = this.load(); state.systemOverrides[id] = protein; return this.save(state)
  }
  setSystemFoodNutritionOverride(id: string, proteinValue: unknown, calorieValue: unknown): AppState {
    const food = SYSTEM_FOODS.find((item) => item.id === id)
    if (!food) throw new Error('没有找到要修改的系统食品')
    const protein = validateReferenceFood({ name: food.name, baseAmount: food.baseAmount, baseUnit: food.baseUnit, proteinAmount: proteinValue, category: food.category }).proteinAmount
    const calories = optionalCalories(calorieValue)
    const state = this.load(); state.systemOverrides[id] = protein
    if (calories === null) delete state.systemCalorieOverrides[id]
    else state.systemCalorieOverrides[id] = calories
    return this.save(state)
  }
  restoreSystemFoodReference(id: string): AppState {
    const state = this.load(); delete state.systemOverrides[id]; delete state.systemCalorieOverrides[id]; return this.save(state)
  }
  toggleFavorite(id: string): AppState {
    if (!this.getFood(id)) throw new Error('没有找到该食品')
    const state = this.load()
    state.favoriteFoodIds = state.favoriteFoodIds.includes(id)
      ? state.favoriteFoodIds.filter((foodId) => foodId !== id) : [id, ...state.favoriteFoodIds]
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
    const calories = food.effectiveCalories === null ? null : roundProtein(food.effectiveCalories * actualQuantity / food.baseAmount)
    const state = this.load(); const day = this.ensureDay(state, date); const now = Date.now()
    day.entries.unshift({
      id: createId('entry'), schemaVersion: 3, sourceFoodId: food.id, name: food.name, unit: food.baseUnit,
      proteinPerUnit: food.effectiveProtein / food.baseAmount,
      caloriesPerUnit: food.effectiveCalories === null ? null : food.effectiveCalories / food.baseAmount,
      quantity: actualQuantity, protein, calories, snapshotBaseAmount: food.baseAmount, snapshotBaseUnit: food.baseUnit,
      snapshotProteinAmount: food.effectiveProtein, snapshotCaloriesAmount: food.effectiveCalories,
      snapshotSource: food.userModified ? '我的数值' : food.sourceName, snapshotSourceId: food.sourceId,
      snapshotState: food.state, recordedDate: date, createdAt: now, updatedAt: now, deletedAt: null,
    })
    day.updatedAt = now; day.completedAt = null; this.rememberRecent(state, food.id); return this.save(state)
  }
  addEntry(date: string, input: EntryInput & { sourceFoodId?: string }): AppState {
    const data = validateEntry(input); const state = this.load(); const day = this.ensureDay(state, date); const now = Date.now()
    day.entries.unshift({
      id: createId('entry'), schemaVersion: 3, sourceFoodId: input.sourceFoodId ?? '', name: data.name,
      unit: data.unit, proteinPerUnit: data.proteinPerUnit, caloriesPerUnit: null, quantity: data.quantity,
      protein: data.protein, calories: null, snapshotBaseAmount: 1, snapshotBaseUnit: data.unit,
      snapshotProteinAmount: data.proteinPerUnit, snapshotCaloriesAmount: null, snapshotSource: '用户输入（v1兼容）',
      snapshotSourceId: '', snapshotState: '', recordedDate: date, createdAt: now, updatedAt: now, deletedAt: null,
    })
    day.updatedAt = now; day.completedAt = null; return this.save(state)
  }
  updateEntry(date: string, entryId: string, quantity: unknown): AppState {
    const state = this.load(); const day = this.ensureDay(state, date); const entry = day.entries.find((item) => item.id === entryId)
    if (!entry) throw new Error('没有找到要修改的摄入记录')
    const data = validateEntry({ ...entry, quantity })
    entry.quantity = data.quantity; entry.protein = roundProtein(entry.snapshotProteinAmount * data.quantity / entry.snapshotBaseAmount)
    entry.proteinPerUnit = entry.snapshotProteinAmount / entry.snapshotBaseAmount
    entry.calories = entry.snapshotCaloriesAmount === null ? null : roundProtein(entry.snapshotCaloriesAmount * data.quantity / entry.snapshotBaseAmount)
    entry.updatedAt = Date.now(); day.updatedAt = Date.now(); day.completedAt = null; return this.save(state)
  }
  deleteEntry(date: string, entryId: string): AppState {
    const state = this.load(); const day = this.ensureDay(state, date)
    day.entries = day.entries.filter((entry) => entry.id !== entryId); day.updatedAt = Date.now(); day.completedAt = null
    return this.save(state)
  }
  upsertWeight(date: string, value: unknown): AppState {
    if (!isValidDateKey(date)) throw new Error('日期格式必须为 YYYY-MM-DD')
    const weight = Number(value)
    if (!Number.isFinite(weight) || weight < 20 || weight > 500) throw new Error('体重必须是 20–500 kg 之间的数字')
    const state = this.load(); const now = Date.now(); const existing = state.weights[date]
    state.weights[date] = {
      id: existing?.id ?? createId('weight'), schemaVersion: 3, date, weightKg: roundProtein(weight),
      createdAt: existing?.createdAt ?? now, updatedAt: now, deletedAt: null,
    }
    const latestWeightDate = Object.keys(state.weights).sort().at(-1)
    if (state.profile && latestWeightDate === date) {
      state.profile.currentWeightKg = roundProtein(weight); state.profile.updatedAt = now
      if (date === formatLocalDate()) {
        const targets = calculateHealthTargets(state.profile); const day = this.ensureDay(state, date)
        day.target = targets.proteinTarget; day.calorieTarget = targets.calorieTarget; day.updatedAt = now
      }
    }
    return this.save(state)
  }
  deleteWeight(date: string): AppState {
    const state = this.load(); delete state.weights[date]; return this.save(state)
  }
  completeDay(date: string): AppState {
    const state = this.load(); const day = this.ensureDay(state, date)
    if (!day.entries.length) throw new Error('当天至少添加一条有效食物记录后才能完成')
    day.completedAt = Date.now(); day.updatedAt = Date.now(); return this.save(state)
  }
  reopenDay(date: string): AppState {
    const state = this.load(); const day = this.ensureDay(state, date); day.completedAt = null; day.updatedAt = Date.now(); return this.save(state)
  }
  getHistory(): HistoryItem[] {
    const state = this.load()
    return Object.values(state.days).sort((a, b) => b.date.localeCompare(a.date)).map((day) => ({
      date: day.date, entryCount: day.entries.length, calories: calculateCalorieSummary(day.calorieTarget, day.entries).consumed,
      calorieTarget: day.calorieTarget, completed: Boolean(day.completedAt), ...calculateSummary(day.target, day.entries),
    }))
  }
  getTrends(referenceDate = formatLocalDate()): TrendSummary {
    const state = this.load(); const dates = Array.from({ length: 7 }, (_, index) => dateOffset(referenceDate, index - 6))
    const weights = dates.map((date) => state.weights[date]?.weightKg).filter((value): value is number => Number.isFinite(value))
    const days = dates.map((date) => state.days[date]).filter((day): day is DayRecord => Boolean(day))
    const proteinPercents = days.filter((day) => day.entries.length && day.target > 0).map((day) => calculateSummary(day.target, day.entries).percent)
    const calorieDays = days.filter((day) => day.entries.some((entry) => entry.calories !== null))
    const completed = new Set(Object.values(state.days).filter((day) => day.completedAt).map((day) => day.date))
    let cursor = completed.has(referenceDate) ? referenceDate : dateOffset(referenceDate, -1); let streak = 0
    while (completed.has(cursor)) { streak += 1; cursor = dateOffset(cursor, -1) }
    const average = (values: number[]) => values.length ? roundProtein(values.reduce((sum, value) => sum + value, 0) / values.length) : null
    return {
      averageWeight: average(weights), averageProteinPercent: average(proteinPercents),
      averageCalories: average(calorieDays.map((day) => calculateCalorieSummary(day.calorieTarget, day.entries).consumed)), streak,
    }
  }
}

export { FOOD_CATEGORIES, SYSTEM_FOODS, type FoodCategory }
