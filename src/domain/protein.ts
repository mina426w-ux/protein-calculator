export const MAX_TARGET = 1000
export const MAX_QUANTITY = 100000
export const MAX_PROTEIN_PER_UNIT = 10000
export const MAX_BASE_AMOUNT = 100000

export interface FoodInput {
  name: unknown
  unit: unknown
  proteinPerUnit: unknown
}

export interface EntryInput extends FoodInput {
  quantity: unknown
}

export interface ReferenceFoodInput {
  name: unknown
  baseAmount: unknown
  baseUnit: unknown
  proteinAmount: unknown
  category?: unknown
  notes?: unknown
}

export interface Summary {
  target: number
  consumed: number
  remaining: number
  exceeded: number
  overTarget: boolean
  percent: number
}

export function roundProtein(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function positiveNumber(value: unknown, label: string, max: number): number {
  if (value === '' || value === null || value === undefined) {
    throw new Error(`请填写${label}`)
  }
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`${label}必须是数字`)
  if (number <= 0) throw new Error(`${label}必须大于 0`)
  if (number > max) throw new Error(`${label}不能大于 ${max}`)
  return roundProtein(number)
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`请填写${label}`)
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字`)
  return text
}

export function validateTarget(value: unknown): number {
  return positiveNumber(value, '每日目标', MAX_TARGET)
}

export function validateFood(input: FoodInput) {
  return {
    name: requiredText(input.name, '食物名称', 40),
    unit: requiredText(input.unit, '计算单位', 12),
    proteinPerUnit: positiveNumber(input.proteinPerUnit, '每单位蛋白质', MAX_PROTEIN_PER_UNIT),
  }
}

export function validateEntry(input: EntryInput) {
  const food = validateFood(input)
  const quantity = positiveNumber(input.quantity, '数量', MAX_QUANTITY)
  return {
    ...food,
    quantity,
    protein: roundProtein(quantity * food.proteinPerUnit),
  }
}

export function validateReferenceFood(input: ReferenceFoodInput) {
  return {
    name: requiredText(input.name, '食品名称', 40),
    baseAmount: positiveNumber(input.baseAmount, '基准份量', MAX_BASE_AMOUNT),
    baseUnit: requiredText(input.baseUnit, '基准单位', 12),
    proteinAmount: positiveNumber(input.proteinAmount, '蛋白质含量', MAX_PROTEIN_PER_UNIT),
    category: requiredText(input.category ?? '我的食品', '分类', 20),
    notes: String(input.notes ?? '').trim().slice(0, 200),
  }
}

export function calculateReferenceProtein(
  reference: { baseAmount: unknown; proteinAmount: unknown },
  quantity: unknown,
): number {
  const baseAmount = positiveNumber(reference.baseAmount, '基准份量', MAX_BASE_AMOUNT)
  const proteinAmount = positiveNumber(reference.proteinAmount, '蛋白质含量', MAX_PROTEIN_PER_UNIT)
  const actualQuantity = positiveNumber(quantity, '摄入数量', MAX_QUANTITY)
  return roundProtein((proteinAmount * actualQuantity) / baseAmount)
}

export function calculateSummary(target: unknown, entries: Array<{ protein?: unknown }> = []): Summary {
  const safeTarget = Number.isFinite(Number(target)) && Number(target) > 0 ? Number(target) : 0
  const consumed = roundProtein(entries.reduce((sum, entry) => {
    const protein = Number(entry.protein)
    return sum + (Number.isFinite(protein) && protein > 0 ? protein : 0)
  }, 0))
  const difference = roundProtein(safeTarget - consumed)
  return {
    target: roundProtein(safeTarget),
    consumed,
    remaining: difference > 0 ? difference : 0,
    exceeded: difference < 0 ? roundProtein(Math.abs(difference)) : 0,
    overTarget: difference < 0,
    percent: safeTarget > 0 ? Math.round((consumed / safeTarget) * 100) : 0,
  }
}

export function isValidDateKey(value: unknown): value is string {
  const dateKey = String(value ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false
  const date = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return false
  const [year, month, day] = dateKey.split('-').map(Number)
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day
}

export function formatLocalDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
