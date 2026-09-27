import { roundProtein } from './protein'

export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  veryHigh: 1.9,
} as const

export type ActivityLevel = keyof typeof ACTIVITY_FACTORS
export type BiologicalSex = 'male' | 'female'
export type GoalMode = 'maintain' | 'lose'
export type ProteinMode = 'current' | 'target' | 'custom' | 'doctor'
export type CalorieMode = 'estimate' | 'custom' | 'doctor'
export type PregnancyStatus = 'none' | 'pregnant' | 'breastfeeding'

export interface HealthProfile {
  id: 'profile_primary'
  schemaVersion: 3
  age: number
  sex: BiologicalSex
  heightCm: number
  currentWeightKg: number
  targetWeightKg: number
  activityLevel: ActivityLevel
  goalMode: GoalMode
  calorieDeficit: 250 | 500 | 750
  calorieMode: CalorieMode
  customCalorieTarget?: number
  doctorCalorieTarget?: number
  proteinMode: ProteinMode
  customProteinTarget?: number
  doctorProteinTarget?: number
  waistCm?: number
  bodyFatPercent?: number
  ancestry: string
  pregnancyStatus: PregnancyStatus
  dairyTolerance: string
  dietPattern: string
  exclusions: string
  createdAt: number
  updatedAt: number
  deletedAt: null
}

export interface HealthTargets {
  bmi: number
  bmr: number | null
  tdee: number | null
  proteinTarget: number
  calorieTarget: number | null
  proteinSource: string
  calorieSource: string
  calorieWarning: string
}

function finiteNumber(value: unknown, label: string, min: number, max: number): number {
  if (value === '' || value === null || value === undefined) throw new Error(`请填写${label}`)
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`${label}必须是数字`)
  if (number < min || number > max) throw new Error(`${label}必须在 ${min}–${max} 之间`)
  return roundProtein(number)
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  return roundProtein(weightKg / ((heightCm / 100) ** 2))
}

export function calculateBmr(sex: BiologicalSex, weightKg: number, heightCm: number, age: number): number {
  const sexOffset = sex === 'male' ? 5 : -161
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset)
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel])
}

export function calculateProteinTarget(profile: Pick<HealthProfile,
  'proteinMode' | 'currentWeightKg' | 'targetWeightKg' | 'customProteinTarget' | 'doctorProteinTarget'>) {
  if (profile.proteinMode === 'doctor') {
    return { value: finiteNumber(profile.doctorProteinTarget, '医生/营养师蛋白质目标', 1, 1000), source: '医生/营养师定量' }
  }
  if (profile.proteinMode === 'custom') {
    return { value: finiteNumber(profile.customProteinTarget, '自定义蛋白质目标', 1, 1000), source: '自定义目标' }
  }
  const referenceWeight = profile.proteinMode === 'target' ? profile.targetWeightKg : profile.currentWeightKg
  return {
    value: roundProtein(referenceWeight * 0.8),
    source: profile.proteinMode === 'target' ? '目标体重 × 0.8g/kg' : '当前体重 × 0.8g/kg',
  }
}

export function calculateHealthTargets(profile: HealthProfile): HealthTargets {
  const bmi = calculateBmi(profile.currentWeightKg, profile.heightCm)
  const adult = profile.age >= 18
  const bmr = adult ? calculateBmr(profile.sex, profile.currentWeightKg, profile.heightCm, profile.age) : null
  const tdee = bmr === null ? null : calculateTdee(bmr, profile.activityLevel)
  const protein = calculateProteinTarget(profile)

  if (profile.calorieMode === 'doctor') {
    return {
      bmi, bmr, tdee, proteinTarget: protein.value,
      calorieTarget: finiteNumber(profile.doctorCalorieTarget, '医生/营养师热量目标', 100, 10000),
      proteinSource: protein.source, calorieSource: '医生/营养师定量', calorieWarning: '',
    }
  }
  if (profile.calorieMode === 'custom') {
    return {
      bmi, bmr, tdee, proteinTarget: protein.value,
      calorieTarget: finiteNumber(profile.customCalorieTarget, '自定义热量目标', 100, 10000),
      proteinSource: protein.source, calorieSource: '自定义目标', calorieWarning: '',
    }
  }

  let calorieWarning = ''
  if (!adult) calorieWarning = '未成年人不自动生成热量目标，请由监护人与专业人员确认。'
  else if (profile.pregnancyStatus !== 'none') calorieWarning = '孕期或哺乳期不自动生成减重热量目标，请咨询专业人员。'
  else if (bmi < 18.5) calorieWarning = '当前 BMI 低于 18.5，不自动建议热量缺口。'

  if (profile.goalMode === 'maintain' && tdee !== null) {
    return {
      bmi, bmr, tdee, proteinTarget: protein.value, calorieTarget: tdee,
      proteinSource: protein.source, calorieSource: '预计每日维持热量', calorieWarning: adult ? '' : calorieWarning,
    }
  }
  if (calorieWarning || tdee === null) {
    return {
      bmi, bmr, tdee, proteinTarget: protein.value, calorieTarget: null,
      proteinSource: protein.source, calorieSource: '未自动生成', calorieWarning,
    }
  }
  return {
    bmi, bmr, tdee, proteinTarget: protein.value,
    calorieTarget: Math.max(0, tdee - profile.calorieDeficit),
    proteinSource: protein.source,
    calorieSource: `预计维持热量 − ${profile.calorieDeficit} kcal`,
    calorieWarning: '',
  }
}

export function validateProfileInput(input: Partial<HealthProfile>, existing?: HealthProfile): HealthProfile {
  const now = Date.now()
  const activityLevel = String(input.activityLevel) as ActivityLevel
  if (!(activityLevel in ACTIVITY_FACTORS)) throw new Error('请选择活动水平')
  if (input.sex !== 'male' && input.sex !== 'female') throw new Error('请选择生理性别')
  if (input.goalMode !== 'maintain' && input.goalMode !== 'lose') throw new Error('请选择当前目标')
  if (![250, 500, 750].includes(Number(input.calorieDeficit))) throw new Error('请选择有效热量缺口')
  if (!['estimate', 'custom', 'doctor'].includes(String(input.calorieMode))) throw new Error('请选择热量目标模式')
  if (!['current', 'target', 'custom', 'doctor'].includes(String(input.proteinMode))) throw new Error('请选择蛋白质目标模式')
  if (!['none', 'pregnant', 'breastfeeding'].includes(String(input.pregnancyStatus))) throw new Error('请选择孕期/哺乳状态')

  const profile: HealthProfile = {
    id: 'profile_primary', schemaVersion: 3,
    age: finiteNumber(input.age, '年龄', 13, 120),
    sex: input.sex,
    heightCm: finiteNumber(input.heightCm, '身高', 80, 250),
    currentWeightKg: finiteNumber(input.currentWeightKg, '当前体重', 20, 500),
    targetWeightKg: finiteNumber(input.targetWeightKg, '目标体重', 20, 500),
    activityLevel,
    goalMode: input.goalMode,
    calorieDeficit: Number(input.calorieDeficit) as 250 | 500 | 750,
    calorieMode: input.calorieMode as CalorieMode,
    proteinMode: input.proteinMode as ProteinMode,
    ancestry: String(input.ancestry ?? '不填写').slice(0, 40),
    pregnancyStatus: input.pregnancyStatus as PregnancyStatus,
    dairyTolerance: String(input.dairyTolerance ?? '不确定').slice(0, 40),
    dietPattern: String(input.dietPattern ?? '普通饮食').slice(0, 40),
    exclusions: String(input.exclusions ?? '').trim().slice(0, 300),
    createdAt: existing?.createdAt ?? now, updatedAt: now, deletedAt: null,
  }
  const optional = (value: unknown, label: string, min: number, max: number) =>
    value === '' || value === null || value === undefined ? undefined : finiteNumber(value, label, min, max)
  profile.waistCm = optional(input.waistCm, '腰围', 30, 300)
  profile.bodyFatPercent = optional(input.bodyFatPercent, '体脂率', 1, 80)
  profile.customCalorieTarget = optional(input.customCalorieTarget, '自定义热量目标', 100, 10000)
  profile.doctorCalorieTarget = optional(input.doctorCalorieTarget, '医生/营养师热量目标', 100, 10000)
  profile.customProteinTarget = optional(input.customProteinTarget, '自定义蛋白质目标', 1, 1000)
  profile.doctorProteinTarget = optional(input.doctorProteinTarget, '医生/营养师蛋白质目标', 1, 1000)
  calculateHealthTargets(profile)
  return profile
}
