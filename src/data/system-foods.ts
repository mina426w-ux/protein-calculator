import rawFoods from './system-foods.json'

export const FOOD_CATEGORIES = [
  '肉禽',
  '鱼虾水产',
  '蛋类',
  '奶制品',
  '豆制品',
  '植物蛋白',
  '蛋白粉及加工食品',
] as const

export type FoodCategory = typeof FOOD_CATEGORIES[number]

export interface SystemFoodRecord {
  id: string
  stableKey: string
  name: string
  nameEn: string
  category: FoodCategory
  state: string
  baseAmount: number
  baseUnit: string
  systemProtein: number
  sourceProteinPer100g: number
  sourceName: string
  sourceId: string
  sourceDataType: string
  sourceRelease: string
  sourceUrl: string
  queriedAt: string
  isSystem: true
  isCustom: false
  userModified: false
  imageLocalPath: string
  imageSource: string
  imageLicense: string
  notes: string
}

export const SYSTEM_FOODS = rawFoods as SystemFoodRecord[]
