<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ACTIVITY_FACTORS, type HealthProfile } from '../../domain/health'
import { calculateReferenceProtein, calculateSummary, formatLocalDate, isValidDateKey, roundProtein } from '../../domain/protein'
import {
  FOOD_CATEGORIES,
  ProteinStore,
  type AppState,
  type CalorieSummary,
  type CatalogFood,
  type DailyEntry,
  type DayRecord,
  type HistoryItem,
  type TrendSummary,
} from '../../services/storage'

type TabName = 'today' | 'foods' | 'custom' | 'history' | 'settings'

const store = new ProteinStore()
const activeTab = ref<TabName>('today')
const selectedDate = ref(formatLocalDate())
const dateInput = ref(selectedDate.value)
const day = ref<DayRecord>({
  date: selectedDate.value, schemaVersion: 3, target: 70, calorieTarget: null, entries: [],
  completedAt: null, createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null,
})
const appState = ref<AppState>(store.load())
const proteinSummary = computed(() => calculateSummary(day.value.target, day.value.entries))
const calorieSummary = ref<CalorieSummary>({ target: null, consumed: 0, remaining: null, exceeded: 0, overTarget: false, percent: 0, unknownEntryCount: 0 })
const trends = ref<TrendSummary>({ averageWeight: null, averageProteinPercent: null, averageCalories: null, streak: 0 })
const history = ref<HistoryItem[]>([])
const catalog = ref<CatalogFood[]>([])
const selectedHistoryDate = ref('')
const profileFormLoaded = ref(false)
const notice = ref('')
const noticeKind = ref<'success' | 'error'>('success')
let noticeTimer: ReturnType<typeof setTimeout> | undefined
const AD_SLOT_HOME_BOTTOM_ENABLED = false

const searchInput = ref('')
const categoryFilter = ref('常用')
const selectedFoodId = ref('')
const quantityInput = ref('')
const overrideInput = ref('')
const overrideCaloriesInput = ref('')
const editingEntryId = ref('')
const editingQuantityInput = ref('')

const editingCustomId = ref('')
const customName = ref('')
const customBaseAmount = ref('30')
const customUnit = ref('g')
const customProtein = ref('')
const customCalories = ref('')
const customCategory = ref('蛋白粉及加工食品')
const customNotes = ref('')

const weightInput = ref('')
const targetInput = ref('70')

const profileAge = ref('')
const profileSex = ref<'male' | 'female'>('male')
const profileHeight = ref('')
const profileWeight = ref('')
const profileTargetWeight = ref('')
const profileActivity = ref<keyof typeof ACTIVITY_FACTORS>('light')
const profileGoal = ref<'maintain' | 'lose'>('maintain')
const profileDeficit = ref<250 | 500 | 750>(500)
const calorieMode = ref<'estimate' | 'custom' | 'doctor'>('estimate')
const customCalorieTarget = ref('')
const doctorCalorieTarget = ref('')
const proteinMode = ref<'current' | 'target' | 'custom' | 'doctor'>('current')
const customProteinTarget = ref('')
const doctorProteinTarget = ref('')
const profileWaist = ref('')
const profileBodyFat = ref('')
const profileAncestry = ref('不填写')
const pregnancyStatus = ref<'none' | 'pregnant' | 'breastfeeding'>('none')
const dairyTolerance = ref('不确定')
const dietPattern = ref('普通饮食')
const exclusions = ref('')

const navigationCategories = ['常用', ...FOOD_CATEGORIES, '我的食品']
const customUnits = ['g', 'mL', '个', '根', '份', '盒', '杯', '勺']
const ancestryOptions = ['不填写', '东亚', '东南亚', '南亚', '欧洲', '中东', '北非', '撒哈拉以南非洲', '拉丁美洲 / 加勒比', '太平洋岛民', '混合祖源', '其他']
const dairyOptions = ['正常耐受', '喝牛奶容易腹胀/腹泻', '已知乳糖不耐受', '不喝乳制品', '不确定']
const dietOptions = ['普通饮食', '素食', '蛋奶素', '不吃肉', '不吃蛋', '不吃奶', '不吃大豆']
const activityLabels: Record<keyof typeof ACTIVITY_FACTORS, string> = {
  sedentary: '久坐', light: '轻度活动', moderate: '中等活动', high: '高活动', veryHigh: '非常高',
}
const resolveAssetPath = (path: string) => /^(?:data:|blob:|https?:\/\/)/i.test(path)
  ? path : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

const profile = computed(() => appState.value.profile)
const healthTargets = computed(() => profile.value ? store.getHealthTargets() : null)
const selectedFood = computed(() => catalog.value.find((food) => food.id === selectedFoodId.value))
const customFoods = computed(() => catalog.value.filter((food) => food.isCustom))
const selectedHistoryDay = computed(() => selectedHistoryDate.value ? appState.value.days[selectedHistoryDate.value] : undefined)
const currentWeight = computed(() => appState.value.weights[selectedDate.value]?.weightKg ?? profile.value?.currentWeightKg ?? null)
const targetWeightDifference = computed(() => currentWeight.value === null || !profile.value
  ? null : roundProtein(currentWeight.value - profile.value.targetWeightKg))
const intakePreview = computed(() => {
  if (!selectedFood.value) return { protein: 0, calories: null as number | null }
  try {
    const protein = calculateReferenceProtein({ baseAmount: selectedFood.value.baseAmount, proteinAmount: selectedFood.value.effectiveProtein }, quantityInput.value)
    const quantity = Number(quantityInput.value)
    const calories = selectedFood.value.effectiveCalories === null
      ? null : roundProtein(selectedFood.value.effectiveCalories * quantity / selectedFood.value.baseAmount)
    return { protein, calories }
  } catch { return { protein: 0, calories: selectedFood.value.effectiveCalories === null ? null : 0 } }
})

function foodAllowed(food: CatalogFood) {
  const current = profile.value
  if (!current) return true
  const noMeat = ['素食', '蛋奶素', '不吃肉'].includes(current.dietPattern)
  if (noMeat && ['肉禽', '鱼虾水产'].includes(food.category)) return false
  if (current.dietPattern === '不吃蛋' && food.category === '蛋类') return false
  if ((current.dietPattern === '不吃奶' || current.dairyTolerance === '不喝乳制品') && food.category === '奶制品') return false
  if (current.dietPattern === '不吃大豆' && food.category === '豆制品') return false
  const blocked = current.exclusions.split(/[，,、;；\s]+/).map((item) => item.trim()).filter(Boolean)
  return !blocked.some((item) => food.name.includes(item) || food.nameEn.toLocaleLowerCase().includes(item.toLocaleLowerCase()))
}

const filteredFoods = computed(() => {
  const query = searchInput.value.trim().toLocaleLowerCase()
  if (query) return catalog.value.filter((food) => [food.name, food.nameEn, food.state, food.category]
    .some((value) => value.toLocaleLowerCase().includes(query)))
  let foods = catalog.value.filter(foodAllowed)
  if (categoryFilter.value === '我的食品') foods = foods.filter((food) => food.isCustom)
  else if (categoryFilter.value === '常用') {
    const frequent = foods.filter((food) => food.favorite || food.recentRank >= 0)
    foods = frequent.length ? frequent.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
      return (a.recentRank < 0 ? 999 : a.recentRank) - (b.recentRank < 0 ? 999 : b.recentRank)
    }) : foods.filter((food) => [
      'system-chicken-breast-cooked', 'system-egg-whole-boiled-piece', 'system-milk-whole',
      'system-salmon-atlantic-farmed-cooked', 'system-shrimp-cooked', 'system-tofu-firm-nigari',
      'system-yogurt-greek-nonfat', 'system-lentils-cooked',
    ].includes(food.id))
  } else foods = foods.filter((food) => food.category === categoryFilter.value)
  return foods
})

function showNotice(message: string, kind: 'success' | 'error' = 'success') {
  notice.value = message
  noticeKind.value = kind
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 2400)
}

function loadProfileForm(value?: HealthProfile) {
  if (!value) {
    const hasLegacyData = Object.values(appState.value.days).some((day) => day.entries.length > 0)
      || appState.value.foods.length > 0
      || Object.keys(appState.value.systemOverrides).length > 0
      || appState.value.lastTarget !== 70
    if (hasLegacyData) { proteinMode.value = 'doctor'; doctorProteinTarget.value = String(appState.value.lastTarget) }
    profileFormLoaded.value = true
    return
  }
  profileAge.value = String(value.age); profileSex.value = value.sex; profileHeight.value = String(value.heightCm)
  profileWeight.value = String(value.currentWeightKg); profileTargetWeight.value = String(value.targetWeightKg)
  profileActivity.value = value.activityLevel; profileGoal.value = value.goalMode; profileDeficit.value = value.calorieDeficit
  calorieMode.value = value.calorieMode; customCalorieTarget.value = String(value.customCalorieTarget ?? '')
  doctorCalorieTarget.value = String(value.doctorCalorieTarget ?? '')
  proteinMode.value = value.proteinMode; customProteinTarget.value = String(value.customProteinTarget ?? '')
  doctorProteinTarget.value = String(value.doctorProteinTarget ?? '')
  profileWaist.value = String(value.waistCm ?? ''); profileBodyFat.value = String(value.bodyFatPercent ?? '')
  profileAncestry.value = value.ancestry; pregnancyStatus.value = value.pregnancyStatus
  dairyTolerance.value = value.dairyTolerance; dietPattern.value = value.dietPattern; exclusions.value = value.exclusions
  profileFormLoaded.value = true
}

function refresh() {
  const dashboard = store.getDashboard(selectedDate.value)
  appState.value = dashboard.state
  day.value = dashboard.day
  targetInput.value = String(dashboard.day.target)
  calorieSummary.value = dashboard.calorieSummary
  history.value = store.getHistory()
  trends.value = store.getTrends(selectedDate.value)
  catalog.value = store.getCatalog()
  weightInput.value = String(appState.value.weights[selectedDate.value]?.weightKg ?? '')
  if (!profileFormLoaded.value) loadProfileForm(appState.value.profile)
  if (selectedFoodId.value && !catalog.value.some((food) => food.id === selectedFoodId.value)) selectedFoodId.value = ''
  if (!selectedHistoryDate.value && history.value.length) selectedHistoryDate.value = history.value[0].date
}

function run(action: () => void, successMessage: string) {
  try { action(); refresh(); showNotice(successMessage) }
  catch (error) { showNotice(error instanceof Error ? error.message : '操作失败，请检查输入', 'error') }
}

function switchTab(tab: TabName) {
  activeTab.value = tab; refresh()
  if (tab === 'history' && history.value.length) selectedHistoryDate.value = history.value[0].date
}
function goAddFood() { activeTab.value = 'foods'; categoryFilter.value = '常用'; searchInput.value = ''; selectedFoodId.value = ''; refresh() }
function applyDate() {
  const candidate = dateInput.value.trim()
  if (!isValidDateKey(candidate)) { showNotice('日期格式必须为 YYYY-MM-DD，且日期真实存在', 'error'); dateInput.value = selectedDate.value; return }
  selectedDate.value = candidate; refresh(); showNotice(`已切换到 ${candidate}`)
}
function saveTarget() { run(() => store.setTarget(selectedDate.value, targetInput.value), '医生/营养师蛋白质目标已保存') }

function saveProfile() {
  run(() => store.saveProfile({
    age: Number(profileAge.value), sex: profileSex.value, heightCm: Number(profileHeight.value),
    currentWeightKg: Number(profileWeight.value), targetWeightKg: Number(profileTargetWeight.value),
    activityLevel: profileActivity.value, goalMode: profileGoal.value, calorieDeficit: profileDeficit.value,
    calorieMode: calorieMode.value, customCalorieTarget: customCalorieTarget.value === '' ? undefined : Number(customCalorieTarget.value),
    doctorCalorieTarget: doctorCalorieTarget.value === '' ? undefined : Number(doctorCalorieTarget.value),
    proteinMode: proteinMode.value, customProteinTarget: customProteinTarget.value === '' ? undefined : Number(customProteinTarget.value),
    doctorProteinTarget: doctorProteinTarget.value === '' ? undefined : Number(doctorProteinTarget.value),
    waistCm: profileWaist.value === '' ? undefined : Number(profileWaist.value),
    bodyFatPercent: profileBodyFat.value === '' ? undefined : Number(profileBodyFat.value),
    ancestry: profileAncestry.value, pregnancyStatus: pregnancyStatus.value,
    dairyTolerance: dairyTolerance.value, dietPattern: dietPattern.value, exclusions: exclusions.value,
  }, formatLocalDate()), '个人资料与目标已保存')
  if (store.getProfile()) activeTab.value = 'today'
}

function recordWeight() { run(() => store.upsertWeight(selectedDate.value, weightInput.value), '体重已记录') }
function removeWeight() { run(() => store.deleteWeight(selectedDate.value), '当天体重记录已删除') }
function completeToday() {
  run(() => day.value.completedAt ? store.reopenDay(selectedDate.value) : store.completeDay(selectedDate.value),
    day.value.completedAt ? '已恢复为未完成' : '今日记录已完成')
}

function openFood(food: CatalogFood) {
  selectedFoodId.value = food.id; quantityInput.value = ''
  overrideInput.value = String(food.userProtein ?? food.systemProtein)
  overrideCaloriesInput.value = food.userCalories !== undefined ? String(food.userCalories) : String(food.systemCalories ?? '')
}
function closeFood() { selectedFoodId.value = ''; quantityInput.value = '' }
function toggleFavorite(food: CatalogFood) { run(() => store.toggleFavorite(food.id), food.favorite ? '已取消收藏' : '已收藏') }
function addSelectedFood() {
  if (!selectedFood.value) return showNotice('请先选择食品', 'error')
  run(() => store.addFoodEntry(selectedDate.value, selectedFood.value!.id, quantityInput.value), '已加入当天记录')
  quantityInput.value = ''
}
function saveOverride() {
  if (!selectedFood.value?.isSystem) return
  run(() => store.setSystemFoodNutritionOverride(selectedFood.value!.id, overrideInput.value, overrideCaloriesInput.value), '“我的数值”已保存，只影响以后新增记录')
  const refreshed = store.getFood(selectedFood.value.id)
  overrideInput.value = String(refreshed?.userProtein ?? '')
  overrideCaloriesInput.value = String(refreshed?.userCalories ?? '')
}
function restoreReference() {
  if (!selectedFood.value?.isSystem) return
  run(() => store.restoreSystemFoodReference(selectedFood.value!.id), '已恢复系统参考值')
  const refreshed = store.getFood(selectedFood.value.id)
  overrideInput.value = String(refreshed?.systemProtein ?? '')
  overrideCaloriesInput.value = String(refreshed?.systemCalories ?? '')
}

function startEntryEdit(entry: DailyEntry) { editingEntryId.value = entry.id; editingQuantityInput.value = String(entry.quantity) }
function saveEntryEdit(entry: DailyEntry) {
  run(() => { store.updateEntry(selectedDate.value, entry.id, editingQuantityInput.value); editingEntryId.value = '' }, '数量已修改，蛋白质与热量仍使用记录时快照')
}
function removeEntry(entry: DailyEntry) { run(() => store.deleteEntry(selectedDate.value, entry.id), '摄入记录已删除') }

function resetCustomForm() {
  editingCustomId.value = ''; customName.value = ''; customBaseAmount.value = '30'; customUnit.value = 'g'
  customProtein.value = ''; customCalories.value = ''; customCategory.value = '蛋白粉及加工食品'; customNotes.value = ''
}
function saveCustomFood() {
  const editing = Boolean(editingCustomId.value)
  run(() => {
    store.upsertCustomFood({
      id: editingCustomId.value || undefined, name: customName.value, baseAmount: customBaseAmount.value,
      baseUnit: customUnit.value, proteinAmount: customProtein.value, calorieAmount: customCalories.value,
      category: customCategory.value, notes: customNotes.value, state: '按包装录入',
    }); resetCustomForm()
  }, editing ? '自定义食品已修改' : '自定义食品已创建')
}
function editCustomFood(food: CatalogFood) {
  editingCustomId.value = food.id; customName.value = food.name; customBaseAmount.value = String(food.baseAmount)
  customUnit.value = food.baseUnit; customProtein.value = String(food.systemProtein)
  customCalories.value = String(food.systemCalories ?? ''); customCategory.value = food.category; customNotes.value = food.notes
  activeTab.value = 'custom'; showNotice(`正在修改：${food.name}`)
}
function removeCustomFood(food: CatalogFood) { run(() => store.deleteFood(food.id), '自定义食品已删除，历史快照仍保留') }
function viewHistory(date: string) { selectedHistoryDate.value = date }

async function shareApp() {
  const shareData = { title: '蛋白质 + 热量记录', text: '一个本地优先的蛋白质与热量记录工具', url: window.location.href }
  try {
    if (navigator.share) await navigator.share(shareData)
    else { await navigator.clipboard.writeText(window.location.href); showNotice('链接已复制') }
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') showNotice('当前浏览器无法分享，请复制地址栏链接', 'error')
  }
}

onLoad(() => {
  refresh()
  if (!store.getProfile()) activeTab.value = 'settings'
})
</script>

<template>
  <view class="app-shell">
    <view class="app-header">
      <view>
        <text class="brand">衡量</text>
        <text class="brand-sub">蛋白质 + 热量</text>
      </view>
      <button id="share-button" class="icon-button" @click="shareApp">分享</button>
    </view>

    <view v-if="notice" :class="['notice', noticeKind]" @click="notice = ''">{{ notice }}</view>

    <view v-if="activeTab === 'today'" class="page-section">
      <view v-if="!profile" class="empty-card">
        <text class="section-title">先完成一次个人设置</text>
        <text class="muted">无需注册。数据只保存在当前浏览器。</text>
        <button class="primary-button" @click="switchTab('settings')">开始设置</button>
      </view>
      <template v-else>
        <view class="today-heading">
          <view><text class="eyebrow">今日</text><text class="date-label">{{ selectedDate }}</text></view>
          <view class="streak">连续 {{ trends.streak }} 天</view>
        </view>

        <view class="date-switcher compact-control">
          <input id="date-input" v-model="dateInput" placeholder="YYYY-MM-DD" />
          <button id="apply-date" class="secondary-button" @click="applyDate">切换</button>
        </view>

        <view class="weight-line">
          <view><text class="muted">当前体重</text><text id="current-weight" class="weight-number">{{ currentWeight ?? '—' }} kg</text></view>
          <view class="align-right"><text class="muted">目标</text><text class="target-weight">{{ profile.targetWeightKg }} kg</text></view>
        </view>

        <view class="metric-card protein-card">
          <view class="metric-heading"><text>蛋白质</text><text id="protein-percent">{{ proteinSummary.percent }}%</text></view>
          <view class="metric-value"><text id="consumed-value">{{ proteinSummary.consumed }}g</text><text> / </text><text id="target-value">{{ proteinSummary.target }}g</text></view>
          <view class="progress-track"><view class="progress protein-progress" :style="{ width: `${Math.min(100, proteinSummary.percent)}%` }" /></view>
          <text id="remaining-value" class="remaining">{{ proteinSummary.overTarget ? `超出 ${proteinSummary.exceeded}g` : `剩余 ${proteinSummary.remaining}g` }}</text>
        </view>

        <view class="metric-card calorie-card">
          <view class="metric-heading"><text>热量</text><text>{{ calorieSummary.target === null ? '未设目标' : `${calorieSummary.percent}%` }}</text></view>
          <view class="metric-value"><text id="calorie-consumed-value">{{ calorieSummary.consumed }} kcal</text><text v-if="calorieSummary.target !== null"> / {{ calorieSummary.target }} kcal</text></view>
          <view class="progress-track"><view class="progress calorie-progress" :style="{ width: `${Math.min(100, calorieSummary.percent)}%` }" /></view>
          <text id="calorie-remaining-value" class="remaining">{{ calorieSummary.remaining === null ? '请在资料中设置热量目标' : calorieSummary.overTarget ? `超出 ${calorieSummary.exceeded} kcal` : `剩余 ${calorieSummary.remaining} kcal` }}</text>
          <text v-if="calorieSummary.unknownEntryCount" class="data-warning">{{ calorieSummary.unknownEntryCount }} 项旧食品未填写热量，未计入热量合计</text>
        </view>

        <view class="quick-actions">
          <button id="add-food-home" class="primary-button" @click="goAddFood">＋ 添加食物</button>
          <button id="record-weight-home" class="secondary-button" @click="weightInput = String(currentWeight ?? '')">＋ 记录体重</button>
        </view>

        <view class="card weight-entry-card">
          <view class="card-title-row"><text class="section-title">记录体重</text><text v-if="targetWeightDifference !== null" class="muted">距目标 {{ Math.abs(targetWeightDifference) }} kg</text></view>
          <view class="inline-input"><input id="weight-input" v-model="weightInput" type="digit" placeholder="例如 82.4" /><text>kg</text><button id="save-weight" class="small-button" @click="recordWeight">保存</button></view>
          <button v-if="appState.weights[selectedDate]" id="delete-weight" class="text-button danger" @click="removeWeight">删除当天体重</button>
        </view>

        <view class="card records-card">
          <view class="card-title-row"><text class="section-title">今日记录</text><text class="muted">{{ day.entries.length }} 项</text></view>
          <view v-if="!day.entries.length" class="empty-inline">还没有记录食物</view>
          <view v-for="entry in day.entries" :key="entry.id" class="entry-row" :data-entry-name="entry.name">
            <view class="entry-main"><text class="entry-name">{{ entry.name }}</text><text class="entry-meta">{{ entry.quantity }}{{ entry.unit }} · 当时 {{ entry.snapshotProteinAmount }}g / {{ entry.snapshotBaseAmount }}{{ entry.snapshotBaseUnit }}</text></view>
            <view class="entry-numbers"><text>{{ entry.protein }}g</text><text>{{ entry.calories === null ? '热量未填' : `${entry.calories} kcal` }}</text></view>
            <view v-if="editingEntryId === entry.id" class="edit-entry"><input v-model="editingQuantityInput" type="digit" /><button @click="saveEntryEdit(entry)">保存</button></view>
            <view class="entry-actions"><button @click="startEntryEdit(entry)">修改</button><button class="danger" @click="removeEntry(entry)">删除</button></view>
          </view>
          <button id="complete-day" :class="['complete-button', { completed: day.completedAt }]" @click="completeToday">{{ day.completedAt ? '今日完成 ✓' : '完成今日记录' }}</button>
        </view>

        <view v-if="AD_SLOT_HOME_BOTTOM_ENABLED" id="AD_SLOT_HOME_BOTTOM" />

        <view class="card trends-card">
          <text class="section-title">近 7 日</text>
          <view class="trend-grid">
            <view><text id="trend-weight" class="trend-value">{{ trends.averageWeight ?? '—' }}</text><text class="trend-label">平均体重 kg</text></view>
            <view><text id="trend-protein" class="trend-value">{{ trends.averageProteinPercent === null ? '—' : `${trends.averageProteinPercent}%` }}</text><text class="trend-label">蛋白质达成率</text></view>
            <view><text id="trend-calories" class="trend-value">{{ trends.averageCalories ?? '—' }}</text><text class="trend-label">平均热量 kcal</text></view>
          </view>
        </view>
      </template>
    </view>

    <view v-else-if="activeTab === 'foods'" class="page-section">
      <view class="page-title-row"><view><text class="eyebrow">快速记录</text><text class="page-title">添加食物</text></view><button class="small-button" @click="switchTab('custom')">＋ 自定义</button></view>
      <view class="search-box"><text>⌕</text><input id="search-input" v-model="searchInput" placeholder="搜索食物名称" /></view>
      <scroll-view scroll-x class="category-scroll">
        <view class="category-row">
          <button v-for="category in navigationCategories" :key="category" :data-category="category" :class="['category-chip', { active: categoryFilter === category }]" @click="categoryFilter = category">{{ category }}</button>
        </view>
      </scroll-view>
      <text v-if="profile" class="filter-note">常用列表已按饮食设置筛选；主动搜索仍显示完整数据库。</text>
      <view class="food-list">
        <view v-for="food in filteredFoods" :key="food.id" class="food-card" :data-food-name="food.name" @click="openFood(food)">
          <image class="food-icon" :src="resolveAssetPath(food.imageLocalPath)" />
          <view class="food-info"><text class="food-name">{{ food.name }}</text><text class="food-state">{{ food.state }} · {{ food.effectiveProtein }}g 蛋白质 / {{ food.baseAmount }}{{ food.baseUnit }}</text><text class="food-state">{{ food.effectiveCalories === null ? '热量未填写' : `${food.effectiveCalories} kcal / ${food.baseAmount}${food.baseUnit}` }}</text></view>
          <button class="favorite-button" @click.stop="toggleFavorite(food)">{{ food.favorite ? '★' : '☆' }}</button>
        </view>
      </view>
    </view>

    <view v-else-if="activeTab === 'custom'" class="page-section">
      <text class="eyebrow">包装营养成分表</text><text class="page-title">{{ editingCustomId ? '修改我的食品' : '添加自定义食品' }}</text>
      <view class="card form-card">
        <label>食品名称<input id="custom-name" v-model="customName" placeholder="例如：某品牌乳清蛋白粉" /></label>
        <view class="two-column"><label>每多少<input id="custom-base" v-model="customBaseAmount" type="digit" /></label><label>单位<view class="unit-row"><button v-for="unit in customUnits" :id="`custom-unit-${unit}`" :key="unit" :class="['unit-chip', { active: customUnit === unit }]" @click="customUnit = unit">{{ unit }}</button></view></label></view>
        <view class="two-column"><label>含蛋白质（g）<input id="custom-protein" v-model="customProtein" type="digit" /></label><label>含热量（kcal，可空）<input id="custom-calories" v-model="customCalories" type="digit" /></label></view>
        <label>分类<view class="unit-row"><button v-for="category in [...FOOD_CATEGORIES, '我的食品']" :key="category" :class="['unit-chip', { active: customCategory === category }]" @click="customCategory = category">{{ category }}</button></view></label>
        <label>备注<textarea id="custom-notes" v-model="customNotes" placeholder="品牌、口味或包装说明" /></label>
        <button id="save-custom" class="primary-button" @click="saveCustomFood">{{ editingCustomId ? '保存修改' : '创建食品' }}</button>
        <button v-if="editingCustomId" class="text-button" @click="resetCustomForm">取消修改</button>
      </view>
      <text class="section-title">我的食品</text>
      <view v-if="!customFoods.length" class="empty-inline">还没有自定义食品</view>
      <view v-for="food in customFoods" :key="food.id" class="custom-row" :data-custom-name="food.name">
        <view><text class="food-name">{{ food.name }}</text><text class="food-state">每 {{ food.baseAmount }}{{ food.baseUnit }}：蛋白质 {{ food.systemProtein }}g · {{ food.systemCalories === null ? '热量未填写' : `${food.systemCalories} kcal` }}</text></view>
        <view class="entry-actions"><button @click="editCustomFood(food)">修改</button><button class="danger" @click="removeCustomFood(food)">删除</button></view>
      </view>
    </view>

    <view v-else-if="activeTab === 'history'" class="page-section">
      <text class="eyebrow">按日期保存</text><text class="page-title">历史记录</text>
      <view class="history-layout">
        <view class="history-list">
          <button v-for="item in history" :key="item.date" :data-history-date="item.date" :class="['history-button', { active: selectedHistoryDate === item.date }]" @click="viewHistory(item.date)">
            <text>{{ item.date }} {{ item.completed ? '✓' : '' }}</text><text>{{ item.consumed }}g · {{ item.calories }} kcal</text>
          </button>
        </view>
        <view v-if="selectedHistoryDay" class="card history-detail">
          <text class="section-title">{{ selectedHistoryDay.date }}</text>
          <text class="muted">目标：{{ selectedHistoryDay.target }}g · {{ selectedHistoryDay.calorieTarget ?? '未设置' }} kcal</text>
          <view v-for="entry in selectedHistoryDay.entries" :key="entry.id" class="history-entry" :data-history-entry="entry.name">
            <text class="entry-name">{{ entry.name }}</text><text>{{ entry.quantity }}{{ entry.unit }} → {{ entry.protein }}g · {{ entry.calories === null ? '热量未填' : `${entry.calories} kcal` }}</text>
            <text class="food-state">当时 {{ entry.snapshotProteinAmount }}g / {{ entry.snapshotBaseAmount }}{{ entry.snapshotBaseUnit }} · {{ entry.snapshotCaloriesAmount === null ? '热量未填' : `${entry.snapshotCaloriesAmount} kcal` }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="page-section settings-page">
      <text class="eyebrow">{{ profile ? '随时可修改' : '首次设置' }}</text><text class="page-title">个人资料与目标</text>
      <text class="intro-copy">不注册、不登录。所有资料默认只保存在此浏览器。</text>
      <view class="card form-card">
        <text class="form-section-title">基础资料</text>
        <view class="two-column"><label>年龄<input id="profile-age" v-model="profileAge" type="number" placeholder="岁" /></label><label>生理性别<view class="segmented"><button id="sex-male" :class="{ active: profileSex === 'male' }" @click="profileSex = 'male'">男</button><button id="sex-female" :class="{ active: profileSex === 'female' }" @click="profileSex = 'female'">女</button></view></label></view>
        <view class="two-column"><label>身高 cm<input id="profile-height" v-model="profileHeight" type="digit" /></label><label>当前体重 kg<input id="profile-weight" v-model="profileWeight" type="digit" /></label></view>
        <view class="two-column"><label>目标体重 kg<input id="profile-target-weight" v-model="profileTargetWeight" type="digit" /></label><label>腰围 cm（可选）<input id="profile-waist" v-model="profileWaist" type="digit" /></label></view>
        <label>体脂率 %（可选）<input id="profile-body-fat" v-model="profileBodyFat" type="digit" /></label>
        <label>活动水平<view class="choice-grid"><button v-for="(factor, key) in ACTIVITY_FACTORS" :id="`activity-${key}`" :key="key" :class="['choice-button', { active: profileActivity === key }]" @click="profileActivity = key">{{ activityLabels[key] }}<small>×{{ factor }}</small></button></view></label>

        <text class="form-section-title">热量目标</text>
        <view class="segmented"><button id="goal-maintain" :class="{ active: profileGoal === 'maintain' }" @click="profileGoal = 'maintain'">维持体重</button><button id="goal-lose" :class="{ active: profileGoal === 'lose' }" @click="profileGoal = 'lose'">减重</button></view>
        <view v-if="profileGoal === 'lose'" class="choice-grid three"><button v-for="deficit in [250, 500, 750]" :id="`deficit-${deficit}`" :key="deficit" :class="['choice-button', { active: profileDeficit === deficit }]" @click="profileDeficit = deficit as 250 | 500 | 750">缺口 {{ deficit }}</button></view>
        <label>热量目标来源<view class="segmented three"><button id="calorie-estimate" :class="{ active: calorieMode === 'estimate' }" @click="calorieMode = 'estimate'">系统估算</button><button id="calorie-custom" :class="{ active: calorieMode === 'custom' }" @click="calorieMode = 'custom'">自定义</button><button id="calorie-doctor" :class="{ active: calorieMode === 'doctor' }" @click="calorieMode = 'doctor'">医生/营养师</button></view></label>
        <label v-if="calorieMode === 'custom'">自定义 kcal/天<input id="custom-calorie-target" v-model="customCalorieTarget" type="digit" /></label>
        <label v-if="calorieMode === 'doctor'">医生/营养师 kcal/天<input id="doctor-calorie-target" v-model="doctorCalorieTarget" type="digit" /></label>

        <text class="form-section-title">蛋白质目标</text>
        <view class="choice-grid two"><button id="protein-current" :class="['choice-button', { active: proteinMode === 'current' }]" @click="proteinMode = 'current'">当前体重 × 0.8</button><button id="protein-target" :class="['choice-button', { active: proteinMode === 'target' }]" @click="proteinMode = 'target'">目标体重 × 0.8</button><button id="protein-custom" :class="['choice-button', { active: proteinMode === 'custom' }]" @click="proteinMode = 'custom'">自定义目标</button><button id="protein-doctor" :class="['choice-button', { active: proteinMode === 'doctor' }]" @click="proteinMode = 'doctor'">医生定量</button></view>
        <label v-if="proteinMode === 'custom'">自定义 g/天<input id="custom-protein-target" v-model="customProteinTarget" type="digit" /></label>
        <label v-if="proteinMode === 'doctor'">医生/营养师 g/天<input id="doctor-protein-target" v-model="doctorProteinTarget" type="digit" /></label>

        <text class="form-section-title">适用保护</text>
        <label>孕期 / 哺乳期<view class="segmented three"><button id="pregnancy-none" :class="{ active: pregnancyStatus === 'none' }" @click="pregnancyStatus = 'none'">否</button><button id="pregnancy-pregnant" :class="{ active: pregnancyStatus === 'pregnant' }" @click="pregnancyStatus = 'pregnant'">孕期</button><button id="pregnancy-breastfeeding" :class="{ active: pregnancyStatus === 'breastfeeding' }" @click="pregnancyStatus = 'breastfeeding'">哺乳期</button></view></label>

        <text class="form-section-title">饮食与耐受（不参与代谢公式）</text>
        <label>祖源 / 地区背景（可选）<view class="unit-row"><button v-for="item in ancestryOptions" :key="item" :class="['unit-chip', { active: profileAncestry === item }]" @click="profileAncestry = item">{{ item }}</button></view></label>
        <label>乳制品<view class="unit-row"><button v-for="item in dairyOptions" :key="item" :class="['unit-chip', { active: dairyTolerance === item }]" @click="dairyTolerance = item">{{ item }}</button></view></label>
        <label>饮食习惯<view class="unit-row"><button v-for="item in dietOptions" :key="item" :class="['unit-chip', { active: dietPattern === item }]" @click="dietPattern = item">{{ item }}</button></view></label>
        <label>过敏 / 不耐受 / 不吃的食物<textarea id="profile-exclusions" v-model="exclusions" placeholder="用逗号分隔，例如：花生，虾" /></label>
        <button id="save-profile" class="primary-button" @click="saveProfile">保存资料并计算目标</button>
      </view>

      <view v-if="healthTargets" id="estimate-results" class="card estimate-card">
        <text class="section-title">当前估算</text>
        <view class="estimate-grid"><view><text id="bmr-value">{{ healthTargets.bmr ?? '—' }}</text><small>预计静息消耗 kcal</small></view><view><text id="tdee-value">{{ healthTargets.tdee ?? '—' }}</text><small>预计维持热量 kcal</small></view><view><text id="protein-target-result">{{ healthTargets.proteinTarget }}</text><small>蛋白质目标 g</small></view><view><text id="calorie-target-result">{{ healthTargets.calorieTarget ?? '—' }}</text><small>热量目标 kcal</small></view></view>
        <text class="muted">BMI {{ healthTargets.bmi }} · {{ healthTargets.proteinSource }} · {{ healthTargets.calorieSource }}</text>
        <text v-if="healthTargets.calorieWarning" id="calorie-warning" class="data-warning">{{ healthTargets.calorieWarning }}</text>
        <text class="disclaimer">以上均为一般成人参考估算，不是精确代谢测量或医疗处方；医生/营养师给出的目标优先。</text>
      </view>

      <view v-if="profile" class="card legacy-goal-card">
        <text class="section-title">快速设置医生蛋白质目标</text>
        <view class="inline-input"><input id="goal-input" v-model="targetInput" type="digit" /><text>g/天</text><button id="save-goal" class="small-button" @click="saveTarget">保存</button></view>
      </view>
    </view>

    <view v-if="selectedFood" id="food-detail" class="sheet-backdrop" @click.self="closeFood">
      <view class="detail-sheet">
        <button class="close-button" @click="closeFood">×</button>
        <image class="detail-icon" :src="resolveAssetPath(selectedFood.imageLocalPath)" />
        <text class="page-title">{{ selectedFood.name }}</text><text class="muted">{{ selectedFood.state }}</text>
        <view class="nutrition-row"><view><small>蛋白质参考</small><text id="system-reference-value">{{ selectedFood.systemProtein }}g / {{ selectedFood.baseAmount }}{{ selectedFood.baseUnit }}</text></view><view><small>热量参考</small><text>{{ selectedFood.systemCalories === null ? '未填写' : `${selectedFood.systemCalories} kcal / ${selectedFood.baseAmount}${selectedFood.baseUnit}` }}</text></view></view>
        <view v-if="selectedFood.userModified" class="my-value"><small>我的数值</small><text id="my-reference-value">{{ selectedFood.userProtein ?? selectedFood.systemProtein }}g</text><text>{{ selectedFood.userCalories ?? selectedFood.systemCalories ?? '热量未填' }}{{ (selectedFood.userCalories ?? selectedFood.systemCalories) !== null ? ' kcal' : '' }}</text></view>
        <text id="detail-effective-value" class="effective-value">本次采用：{{ selectedFood.effectiveProtein }}g / {{ selectedFood.baseAmount }}{{ selectedFood.baseUnit }} · {{ selectedFood.effectiveCalories === null ? '热量未填' : `${selectedFood.effectiveCalories} kcal` }}</text>
        <label>实际吃了多少 {{ selectedFood.baseUnit }}<input id="food-quantity" v-model="quantityInput" type="digit" placeholder="输入数量" /></label>
        <view class="preview-box"><text>此次摄入</text><strong id="food-preview">{{ intakePreview.protein }}g</strong><strong id="calorie-preview">{{ intakePreview.calories === null ? '热量未填写' : `${intakePreview.calories} kcal` }}</strong></view>
        <button id="add-selected-food" class="primary-button" @click="addSelectedFood">加入 {{ selectedDate }}</button>
        <template v-if="selectedFood.isSystem">
          <view class="divider" /><text class="section-title">按包装修改我的数值</text>
          <view class="two-column"><label>蛋白质 g<input id="override-input" v-model="overrideInput" type="digit" /></label><label>热量 kcal<input id="override-calories-input" v-model="overrideCaloriesInput" type="digit" /></label></view>
          <view class="quick-actions"><button id="save-override" class="secondary-button" @click="saveOverride">保存我的数值</button><button id="restore-reference" class="text-button" @click="restoreReference">恢复系统值</button></view>
        </template>
        <view class="source-block"><text>来源：{{ selectedFood.sourceName }}</text><text v-if="selectedFood.sourceId">FDC ID {{ selectedFood.sourceId }}</text><text>{{ selectedFood.notes }}</text></view>
      </view>
    </view>

    <view class="bottom-nav">
      <button id="tab-today" :class="{ active: activeTab === 'today' }" @click="switchTab('today')"><text>○</text>今日</button>
      <button id="tab-foods" :class="{ active: activeTab === 'foods' }" @click="switchTab('foods')"><text>＋</text>食物</button>
      <button id="tab-custom" :class="{ active: activeTab === 'custom' }" @click="switchTab('custom')"><text>◇</text>我的</button>
      <button id="tab-history" :class="{ active: activeTab === 'history' }" @click="switchTab('history')"><text>▤</text>记录</button>
      <button id="tab-settings" :class="{ active: activeTab === 'settings' }" @click="switchTab('settings')"><text>⚙</text>设置</button>
    </view>
  </view>
</template>

<style scoped>
:global(body) { margin: 0; background: #e9f0f4; color: #16324a; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }
:global(button), :global(input), :global(textarea) { font: inherit; }
.app-shell { min-height: 100vh; background: linear-gradient(180deg, #e9f0f4 0%, #f6f8f9 240px); padding-bottom: 92px; }
.app-header { position: sticky; top: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; padding: 14px max(18px, calc((100vw - 720px) / 2)); background: rgba(22, 50, 74, .96); color: white; backdrop-filter: blur(12px); }
.brand { display: block; font-size: 23px; font-weight: 800; letter-spacing: .12em; }.brand-sub { display: block; color: #cbd9e1; font-size: 11px; margin-top: 2px; }
button { border: 0; margin: 0; line-height: 1.2; }.icon-button { background: #294c65; color: white; border-radius: 999px; padding: 9px 15px; font-size: 13px; }
.page-section { width: min(100% - 28px, 690px); margin: 0 auto; padding: 24px 0 16px; }.page-title { display: block; font-size: 27px; font-weight: 800; margin: 3px 0 18px; }.eyebrow { display: block; color: #4e718a; font-size: 13px; font-weight: 700; letter-spacing: .12em; }
.today-heading,.page-title-row,.card-title-row,.weight-line,.metric-heading,.nutrition-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }.date-label { display: block; font-size: 24px; font-weight: 800; }.streak { background: #dbe8ef; color: #345d77; padding: 8px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; }
.compact-control { margin: 14px 0 18px; }.date-switcher,.inline-input,.quick-actions { display: flex; align-items: center; gap: 10px; }.date-switcher input { flex: 1; }
input,textarea { box-sizing: border-box; width: 100%; border: 1px solid #c8d7df; border-radius: 12px; background: #fff; color: #16324a; padding: 12px 13px; outline: 0; }input { min-height: 48px; }input:focus,textarea:focus { border-color: #4e718a; box-shadow: 0 0 0 3px rgba(78,113,138,.12); }textarea { min-height: 84px; }
.muted,.food-state,.entry-meta,.filter-note,.intro-copy { color: #6b8292; font-size: 13px; }.weight-number,.target-weight { display: block; font-weight: 800; font-size: 24px; margin-top: 2px; }.align-right { text-align: right; }
.metric-card,.card,.empty-card { background: rgba(255,255,255,.92); border: 1px solid #d6e1e7; border-radius: 18px; padding: 18px; box-shadow: 0 10px 30px rgba(22,50,74,.06); }.metric-card { margin-top: 14px; }.metric-heading { font-weight: 700; }.metric-value { margin: 12px 0 10px; font-size: 23px; font-weight: 800; }.metric-value text+text { font-weight: 500; color: #7890a0; }.progress-track { height: 8px; background: #e1e9ed; border-radius: 999px; overflow: hidden; }.progress { height: 100%; border-radius: 999px; }.protein-progress { background: #4e718a; }.calorie-progress { background: #7896a9; }.remaining { display: block; margin-top: 9px; color: #4e718a; font-size: 14px; }.data-warning { display: block; margin-top: 9px; color: #9a5b43; font-size: 13px; line-height: 1.5; }
.quick-actions { margin: 16px 0; }.quick-actions button { flex: 1; }.primary-button,.secondary-button,.small-button,.complete-button { border-radius: 12px; font-weight: 750; padding: 13px 16px; }.primary-button { background: #16324a; color: white; }.secondary-button { background: #dce8ee; color: #244c66; }.small-button { background: #4e718a; color: white; padding: 10px 13px; }.text-button { background: transparent; color: #4e718a; padding: 8px; }.danger { color: #a44f4f !important; }.section-title { display: block; font-size: 18px; font-weight: 800; }.weight-entry-card,.records-card,.trends-card,.estimate-card,.legacy-goal-card { margin-top: 14px; }.inline-input input { flex: 1; }.inline-input text { white-space: nowrap; color: #6b8292; }.entry-row { display: grid; grid-template-columns: 1fr auto; gap: 9px; padding: 15px 0; border-bottom: 1px solid #e2eaee; }.entry-main text,.entry-numbers text { display: block; }.entry-name,.food-name { font-weight: 750; }.entry-numbers { text-align: right; font-weight: 750; }.entry-numbers text+text { margin-top: 4px; color: #6b8292; font-size: 12px; }.entry-actions { display: flex; gap: 7px; grid-column: 1 / -1; justify-content: flex-end; }.entry-actions button { background: #edf3f6; color: #4e718a; padding: 7px 11px; border-radius: 9px; font-size: 12px; }.edit-entry { grid-column: 1 / -1; display: flex; gap: 8px; }.edit-entry input { flex: 1; }.edit-entry button { background: #4e718a; color: white; border-radius: 10px; padding: 0 15px; }.complete-button { width: 100%; margin-top: 16px; background: #dce8ee; color: #16324a; }.complete-button.completed { background: #4e718a; color: white; }.empty-inline { padding: 22px 0; color: #8499a7; text-align: center; }.trend-grid,.estimate-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 14px; }.trend-grid>view,.estimate-grid>view { padding: 13px 8px; background: #edf3f6; border-radius: 12px; text-align: center; }.trend-value,.estimate-grid text { display: block; font-size: 19px; font-weight: 800; }.trend-label,.estimate-grid small { display: block; color: #708898; font-size: 10px; margin-top: 5px; }
.search-box { display: flex; gap: 8px; align-items: center; background: white; border: 1px solid #cfdae1; border-radius: 14px; padding: 0 12px; }.search-box input { border: 0; box-shadow: none; padding-left: 2px; }.category-scroll { white-space: nowrap; margin: 14px 0 8px; }.category-row,.unit-row { display: flex; flex-wrap: nowrap; gap: 7px; }.category-chip,.unit-chip { flex: 0 0 auto; background: #e0eaef; color: #4e718a; border-radius: 999px; padding: 9px 12px; font-size: 12px; }.category-chip.active,.unit-chip.active { background: #16324a; color: white; }.filter-note { display: block; margin: 5px 2px 13px; }.food-card,.custom-row { display: flex; align-items: center; gap: 12px; background: white; border: 1px solid #d8e2e7; border-radius: 15px; padding: 12px; margin-bottom: 9px; }.food-icon { width: 48px; height: 48px; padding: 7px; box-sizing: border-box; background: #edf3f6; border-radius: 13px; }.food-info,.custom-row>view:first-child { min-width: 0; flex: 1; }.food-info text,.custom-row text { display: block; }.food-state { margin-top: 3px; white-space: normal; }.favorite-button { background: transparent; color: #4e718a; font-size: 24px; padding: 6px; }
.form-card { display: grid; gap: 15px; }.form-card label { display: grid; gap: 7px; color: #345369; font-size: 13px; font-weight: 700; }.two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.unit-row { flex-wrap: wrap; }.form-section-title { display: block; margin-top: 9px; padding-top: 12px; border-top: 1px solid #e1e9ed; font-size: 16px; font-weight: 800; }.form-section-title:first-child { border-top: 0; margin-top: 0; padding-top: 0; }.segmented { display: grid; grid-template-columns: repeat(2,1fr); gap: 7px; }.segmented.three { grid-template-columns: repeat(3,1fr); }.segmented button,.choice-button { background: #e8f0f4; color: #4e718a; border-radius: 11px; padding: 11px 8px; }.segmented button.active,.choice-button.active { background: #16324a; color: white; }.choice-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 7px; }.choice-grid.two { grid-template-columns: repeat(2,1fr); }.choice-grid.three { grid-template-columns: repeat(3,1fr); }.choice-button small { display: block; margin-top: 4px; opacity: .75; }.intro-copy { display: block; margin: -11px 0 15px; }.estimate-grid { grid-template-columns: repeat(2,1fr); }.disclaimer { display: block; margin-top: 13px; color: #6b8292; font-size: 12px; line-height: 1.55; }
.history-layout { display: grid; grid-template-columns: 180px 1fr; gap: 12px; }.history-list { display: grid; gap: 7px; align-content: start; }.history-button { display: grid; gap: 4px; text-align: left; background: #dfe9ee; color: #4e718a; padding: 11px; border-radius: 11px; font-size: 12px; }.history-button.active { background: #16324a; color: white; }.history-entry { display: grid; gap: 5px; padding: 13px 0; border-bottom: 1px solid #e2eaee; }
.sheet-backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; background: rgba(10,29,42,.55); }.detail-sheet { position: relative; box-sizing: border-box; width: min(100%,720px); max-height: 91vh; overflow: auto; background: #f6f8f9; border-radius: 24px 24px 0 0; padding: 24px 20px 30px; }.close-button { position: absolute; right: 16px; top: 13px; width: 36px; height: 36px; border-radius: 50%; background: #dfe9ee; color: #16324a; font-size: 24px; }.detail-icon { width: 58px; height: 58px; padding: 9px; background: #e4edf1; border-radius: 15px; }.detail-sheet label { display: grid; gap: 7px; margin: 15px 0; font-size: 13px; font-weight: 700; }.nutrition-row { align-items: stretch; margin-top: 15px; }.nutrition-row>view,.my-value,.preview-box { flex: 1; display: grid; gap: 5px; background: #e7eff3; padding: 13px; border-radius: 12px; }.nutrition-row small,.my-value small { color: #6b8292; }.my-value { margin-top: 9px; grid-template-columns: 1fr auto auto; }.effective-value { display: block; margin-top: 10px; color: #4e718a; font-size: 13px; }.preview-box { margin-bottom: 12px; grid-template-columns: 1fr auto auto; align-items: center; }.divider { height: 1px; background: #d7e1e6; margin: 20px 0; }.source-block { display: grid; gap: 4px; margin-top: 16px; color: #718897; font-size: 11px; line-height: 1.45; }
.notice { position: fixed; z-index: 100; top: 72px; left: 50%; transform: translateX(-50%); width: min(calc(100% - 40px),580px); box-sizing: border-box; padding: 12px 15px; border-radius: 12px; color: white; box-shadow: 0 8px 24px rgba(0,0,0,.18); pointer-events: none; }.notice.success { background: #345f78; }.notice.error { background: #9a4f4f; }
.bottom-nav { position: fixed; z-index: 30; left: 50%; bottom: 0; transform: translateX(-50%); display: grid; grid-template-columns: repeat(5,1fr); width: min(100%,720px); background: rgba(246,248,249,.96); border-top: 1px solid #d3dfe5; padding: 7px 8px max(7px, env(safe-area-inset-bottom)); box-sizing: border-box; backdrop-filter: blur(16px); }.bottom-nav button { display: grid; gap: 2px; justify-items: center; background: transparent; color: #8094a1; font-size: 11px; padding: 5px 2px; }.bottom-nav button text:first-child { font-size: 18px; }.bottom-nav button.active { color: #16324a; font-weight: 800; }
@media (max-width:560px) { .choice-grid { grid-template-columns: repeat(2,1fr); }.history-layout { grid-template-columns: 1fr; }.history-list { grid-template-columns: repeat(2,1fr); }.two-column { grid-template-columns: 1fr; }.trend-grid { grid-template-columns: 1fr 1fr 1fr; }.nutrition-row { align-items: stretch; }.preview-box { grid-template-columns: 1fr; }.my-value { grid-template-columns: 1fr 1fr; }.quick-actions { align-items: stretch; }.page-section { width: min(100% - 24px,690px); } }
</style>
