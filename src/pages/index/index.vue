<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { calculateReferenceProtein, calculateSummary, formatLocalDate, isValidDateKey } from '../../domain/protein'
import {
  FOOD_CATEGORIES,
  ProteinStore,
  type CatalogFood,
  type DailyEntry,
  type DayRecord,
  type HistoryItem,
} from '../../services/storage'

type TabName = 'today' | 'foods' | 'custom' | 'history'

const store = new ProteinStore()
const activeTab = ref<TabName>('today')
const selectedDate = ref(formatLocalDate())
const dateInput = ref(selectedDate.value)
const targetInput = ref('70')
const day = ref<DayRecord>({ date: selectedDate.value, target: 70, entries: [], updatedAt: Date.now() })
const history = ref<HistoryItem[]>([])
const catalog = ref<CatalogFood[]>([])
const searchInput = ref('')
const categoryFilter = ref('常用')
const selectedFoodId = ref('')
const quantityInput = ref('')
const overrideInput = ref('')
const selectedHistoryDate = ref('')
const editingEntryId = ref('')
const editingQuantityInput = ref('')
const notice = ref('')
const noticeKind = ref<'success' | 'error'>('success')

const editingCustomId = ref('')
const customName = ref('')
const customBaseAmount = ref('30')
const customUnit = ref('g')
const customProtein = ref('')
const customCategory = ref('蛋白粉及加工食品')
const customNotes = ref('')

const navigationCategories = ['常用', ...FOOD_CATEGORIES, '我的食品']
const customUnits = ['g', 'mL', '个', '根', '份', '盒', '杯', '勺']
const resolveAssetPath = (path: string) => {
  if (/^(?:data:|blob:|https?:\/\/)/i.test(path)) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}
const summary = computed(() => calculateSummary(day.value.target, day.value.entries))
const selectedFood = computed(() => catalog.value.find((food) => food.id === selectedFoodId.value))
const customFoods = computed(() => catalog.value.filter((food) => food.isCustom))
const selectedHistoryDay = computed(() => selectedHistoryDate.value ? store.load().days[selectedHistoryDate.value] : undefined)
const intakePreview = computed(() => {
  if (!selectedFood.value) return 0
  try {
    return calculateReferenceProtein(
      { baseAmount: selectedFood.value.baseAmount, proteinAmount: selectedFood.value.effectiveProtein },
      quantityInput.value,
    )
  } catch {
    return 0
  }
})

const filteredFoods = computed(() => {
  const query = searchInput.value.trim().toLocaleLowerCase()
  if (query) {
    return catalog.value.filter((food) => [food.name, food.nameEn, food.state, food.category]
      .some((value) => value.toLocaleLowerCase().includes(query)))
  }
  let foods = catalog.value
  if (categoryFilter.value === '我的食品') {
    foods = foods.filter((food) => food.isCustom)
  } else if (categoryFilter.value === '常用') {
    const frequent = foods.filter((food) => food.favorite || food.recentRank >= 0)
    foods = frequent.length ? frequent.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
      const rankA = a.recentRank < 0 ? 999 : a.recentRank
      const rankB = b.recentRank < 0 ? 999 : b.recentRank
      return rankA - rankB
    }) : foods.filter((food) => [
      'system-chicken-breast-cooked', 'system-egg-whole-boiled-piece', 'system-milk-whole',
      'system-salmon-atlantic-farmed-cooked', 'system-shrimp-cooked', 'system-tofu-firm-nigari',
      'system-yogurt-greek-nonfat', 'system-lentils-cooked',
    ].includes(food.id))
  } else {
    foods = foods.filter((food) => food.category === categoryFilter.value)
  }
  return foods
})

function showNotice(message: string, kind: 'success' | 'error' = 'success') {
  notice.value = message
  noticeKind.value = kind
}

function refresh() {
  const dashboard = store.getDashboard(selectedDate.value)
  day.value = dashboard.day
  targetInput.value = String(dashboard.day.target)
  history.value = store.getHistory()
  catalog.value = store.getCatalog()
  if (selectedFoodId.value && !catalog.value.some((food) => food.id === selectedFoodId.value)) selectedFoodId.value = ''
  if (!selectedHistoryDate.value && history.value.length) selectedHistoryDate.value = history.value[0].date
}

function run(action: () => void, successMessage: string) {
  try {
    action()
    refresh()
    showNotice(successMessage)
  } catch (error) {
    showNotice(error instanceof Error ? error.message : '操作失败，请检查输入', 'error')
  }
}

function switchTab(tab: TabName) {
  activeTab.value = tab
  refresh()
  if (tab === 'history' && history.value.length) selectedHistoryDate.value = history.value[0].date
}

function goAddFood() {
  activeTab.value = 'foods'
  categoryFilter.value = '常用'
  searchInput.value = ''
  selectedFoodId.value = ''
  refresh()
}

function applyDate() {
  const candidate = dateInput.value.trim()
  if (!isValidDateKey(candidate)) {
    showNotice('日期格式必须为 YYYY-MM-DD，且日期真实存在', 'error')
    dateInput.value = selectedDate.value
    return
  }
  selectedDate.value = candidate
  refresh()
  showNotice(`已切换到 ${candidate}`)
}

function saveTarget() {
  run(() => store.setTarget(selectedDate.value, targetInput.value), '每日目标已保存')
}

function openFood(food: CatalogFood) {
  selectedFoodId.value = food.id
  quantityInput.value = ''
  overrideInput.value = String(food.userProtein ?? food.systemProtein)
}

function closeFood() {
  selectedFoodId.value = ''
  quantityInput.value = ''
}

function toggleFavorite(food: CatalogFood) {
  run(() => store.toggleFavorite(food.id), food.favorite ? '已取消收藏' : '已收藏')
}

function addSelectedFood() {
  if (!selectedFood.value) return showNotice('请先选择食品', 'error')
  run(() => store.addFoodEntry(selectedDate.value, selectedFood.value!.id, quantityInput.value), '已加入当天记录')
  quantityInput.value = ''
}

function saveOverride() {
  if (!selectedFood.value?.isSystem) return
  run(() => store.setSystemFoodOverride(selectedFood.value!.id, overrideInput.value), '“我的数值”已保存，以后新增记录优先使用')
  overrideInput.value = String(store.getFood(selectedFood.value.id)?.userProtein ?? '')
}

function restoreReference() {
  if (!selectedFood.value?.isSystem) return
  run(() => store.restoreSystemFoodReference(selectedFood.value!.id), '已恢复系统参考值')
  overrideInput.value = String(store.getFood(selectedFood.value.id)?.systemProtein ?? '')
}

function startEntryEdit(entry: DailyEntry) {
  editingEntryId.value = entry.id
  editingQuantityInput.value = String(entry.quantity)
}

function saveEntryEdit(entry: DailyEntry) {
  run(() => {
    store.updateEntry(selectedDate.value, entry.id, editingQuantityInput.value)
    editingEntryId.value = ''
  }, '摄入数量已修改；仍使用记录时的参考快照')
}

function removeEntry(entry: DailyEntry) {
  run(() => store.deleteEntry(selectedDate.value, entry.id), '摄入记录已删除')
}

function resetCustomForm() {
  editingCustomId.value = ''
  customName.value = ''
  customBaseAmount.value = '30'
  customUnit.value = 'g'
  customProtein.value = ''
  customCategory.value = '蛋白粉及加工食品'
  customNotes.value = ''
}

function saveCustomFood() {
  run(() => {
    store.upsertCustomFood({
      id: editingCustomId.value || undefined,
      name: customName.value,
      baseAmount: customBaseAmount.value,
      baseUnit: customUnit.value,
      proteinAmount: customProtein.value,
      category: customCategory.value,
      notes: customNotes.value,
      state: '按包装录入',
    })
    resetCustomForm()
  }, editingCustomId.value ? '自定义食品已修改' : '自定义食品已创建')
}

function editCustomFood(food: CatalogFood) {
  editingCustomId.value = food.id
  customName.value = food.name
  customBaseAmount.value = String(food.baseAmount)
  customUnit.value = food.baseUnit
  customProtein.value = String(food.systemProtein)
  customCategory.value = food.category
  customNotes.value = food.notes
  activeTab.value = 'custom'
  showNotice(`正在修改：${food.name}`)
}

function removeCustomFood(food: CatalogFood) {
  run(() => store.deleteFood(food.id), '自定义食品已删除；历史记录快照仍保留')
}

function viewHistory(date: string) {
  selectedHistoryDate.value = date
}

onLoad(refresh)
</script>

<template>
  <view class="app-shell">
    <view class="hero">
      <text class="eyebrow">纯本地记录 · 系统数值仅作参考</text>
      <text class="title">今日蛋白质</text>
      <view class="hero-metrics">
        <view><text id="target-value" class="hero-number">{{ summary.target }}g</text><text>目标</text></view>
        <view><text id="consumed-value" class="hero-number">{{ summary.consumed }}g</text><text>已摄入</text></view>
        <view><text id="remaining-value" class="hero-number">{{ summary.remaining }}g</text><text>剩余</text></view>
      </view>
      <view class="progress-track"><view class="progress-bar" :style="{ width: `${Math.min(summary.percent, 100)}%` }" /></view>
      <text v-if="summary.overTarget" id="over-target" class="over-message">已超过目标 {{ summary.exceeded }}g，仍可继续记录</text>
      <button id="go-add-food" class="hero-action" @click="goAddFood">＋ 添加食物</button>
    </view>

    <view class="tabs">
      <button id="tab-today" class="tab" :class="{ active: activeTab === 'today' }" @click="switchTab('today')">今日</button>
      <button id="tab-foods" class="tab" :class="{ active: activeTab === 'foods' }" @click="switchTab('foods')">食物库</button>
      <button id="tab-custom" class="tab" :class="{ active: activeTab === 'custom' }" @click="switchTab('custom')">我的食品</button>
      <button id="tab-history" class="tab" :class="{ active: activeTab === 'history' }" @click="switchTab('history')">记录</button>
    </view>

    <view v-if="notice" id="notice" class="notice" :class="noticeKind" role="status">{{ notice }}</view>

    <view v-if="activeTab === 'today'" class="page-section">
      <view class="card compact-card">
        <view class="row">
          <view class="grow"><text class="field-title">记录日期</text><input id="date-input" v-model="dateInput" class="input" type="text" maxlength="10" /></view>
          <button id="apply-date" class="secondary-button" size="mini" @click="applyDate">切换</button>
        </view>
      </view>
      <view class="card">
        <text class="card-title">每日目标</text>
        <text class="helper">只填写医生规定的目标，本工具不自动给出医疗建议。</text>
        <view class="row"><input id="goal-input" v-model="targetInput" class="input grow" type="text" inputmode="decimal" /><text class="suffix">g/天</text><button id="save-goal" class="primary-button" size="mini" @click="saveTarget">保存</button></view>
      </view>
      <view class="card">
        <view class="card-heading"><text class="card-title">今天已吃</text><text>{{ day.entries.length }} 项</text></view>
        <text v-if="!day.entries.length" class="empty">还没有记录，点击上方“添加食物”开始</text>
        <view v-for="entry in day.entries" :key="entry.id" class="entry-item" :data-entry-name="entry.name">
          <view class="entry-top"><view><text class="item-name">{{ entry.name }}</text><text class="item-detail">{{ entry.quantity }}{{ entry.unit }} · {{ entry.protein }}g 蛋白质</text></view><text class="entry-protein">{{ entry.protein }}g</text></view>
          <text class="snapshot">记录快照：{{ entry.snapshotProteinAmount }}g / {{ entry.snapshotBaseAmount }}{{ entry.snapshotBaseUnit }}<text v-if="entry.snapshotState"> · {{ entry.snapshotState }}</text></text>
          <view v-if="editingEntryId === entry.id" class="row inline-edit"><input v-model="editingQuantityInput" class="input mini-input" type="text" /><button class="small-action save-entry" size="mini" @click="saveEntryEdit(entry)">保存</button></view>
          <view v-else class="item-actions"><button class="small-action edit-entry" size="mini" @click="startEntryEdit(entry)">改数量</button><button class="small-action danger delete-entry" size="mini" @click="removeEntry(entry)">删除</button></view>
        </view>
      </view>
    </view>

    <view v-else-if="activeTab === 'foods'" class="page-section">
      <view class="search-sticky">
        <view class="search-box"><text>⌕</text><input id="search-input" v-model="searchInput" type="text" placeholder="搜索鸡胸肉、牛奶、豆腐……" /></view>
        <scroll-view class="category-scroll" scroll-x>
          <button v-for="category in navigationCategories" :key="category" class="category-chip" :class="{ active: categoryFilter === category }" :data-category="category" size="mini" @click="categoryFilter = category">{{ category }}</button>
        </scroll-view>
      </view>
      <view class="result-heading"><text>{{ categoryFilter }}</text><text>{{ filteredFoods.length }} 项</text></view>
      <view v-if="!filteredFoods.length" class="card empty">没有匹配食品，可到“我的食品”按包装创建。</view>
      <view v-for="food in filteredFoods" :key="food.id" class="food-card" :data-food-name="food.name" @click="openFood(food)">
        <image class="food-icon" :src="resolveAssetPath(food.imageLocalPath)" mode="aspectFit" />
        <view class="food-card-main"><view class="name-line"><text class="item-name">{{ food.name }}</text><text v-if="food.userModified" class="mine-badge">我的数值</text><text v-if="food.isCustom" class="custom-badge">自定义</text></view><text class="item-detail">{{ food.state }} · {{ food.effectiveProtein }}g / {{ food.baseAmount }}{{ food.baseUnit }}</text><text class="source-short">{{ food.isSystem ? `USDA FDC ${food.sourceId}` : '按包装录入' }}</text></view>
        <button class="favorite-button" :class="{ on: food.favorite }" size="mini" @click.stop="toggleFavorite(food)">{{ food.favorite ? '★' : '☆' }}</button>
      </view>

      <view v-if="selectedFood" id="food-detail" class="detail-sheet">
        <view class="detail-handle" />
        <view class="detail-title-row"><view class="row"><image class="detail-icon" :src="resolveAssetPath(selectedFood.imageLocalPath)" /><view><text class="detail-title">{{ selectedFood.name }}</text><text class="item-detail">{{ selectedFood.state }} · {{ selectedFood.category }}</text></view></view><button class="close-button" size="mini" @click="closeFood">×</button></view>
        <view class="reference-grid">
          <view><text class="reference-label">系统参考值</text><text id="system-reference-value" class="reference-value">{{ selectedFood.systemProtein }}g / {{ selectedFood.baseAmount }}{{ selectedFood.baseUnit }}</text></view>
          <view><text class="reference-label">我的数值</text><text id="my-reference-value" class="reference-value mine">{{ selectedFood.userModified ? `${selectedFood.userProtein}g` : '未设置' }}</text></view>
        </view>
        <text id="detail-effective-value" class="effective-line">本次采用：{{ selectedFood.effectiveProtein }}g / {{ selectedFood.baseAmount }}{{ selectedFood.baseUnit }}</text>
        <view class="source-card"><text class="source-title">数据来源</text><text>{{ selectedFood.sourceName }}</text><text v-if="selectedFood.sourceId">FDC ID：{{ selectedFood.sourceId }} · 查询 {{ selectedFood.queriedAt }}</text><text>{{ selectedFood.notes }}</text></view>
        <view v-if="selectedFood.isSystem" class="override-box"><text class="field-title">按手中包装修改我的数值</text><view class="row"><input id="override-input" v-model="overrideInput" class="input grow" type="text" inputmode="decimal" /><text class="suffix">g / {{ selectedFood.baseAmount }}{{ selectedFood.baseUnit }}</text></view><view class="row action-row"><button id="save-override" class="secondary-button grow" @click="saveOverride">保存我的数值</button><button v-if="selectedFood.userModified" id="restore-reference" class="ghost-button" @click="restoreReference">恢复系统参考</button></view></view>
        <view class="intake-box"><text class="field-title">实际吃了多少</text><view class="row"><input id="food-quantity" v-model="quantityInput" class="input grow" type="text" inputmode="decimal" placeholder="输入实际数量" /><text class="suffix">{{ selectedFood.baseUnit }}</text></view><view class="preview-row"><text>此次摄入蛋白质</text><text id="food-preview" class="preview-number">{{ intakePreview }}g</text></view><button id="add-selected-food" class="primary-button wide" @click="addSelectedFood">加入 {{ selectedDate }}</button></view>
      </view>
    </view>

    <view v-else-if="activeTab === 'custom'" class="page-section">
      <view class="card package-guide"><text class="card-title">照着包装营养成分表填写</text><text class="helper">例：包装写“每30g含24g蛋白质”，就填基准30g、蛋白质24g。</text></view>
      <view class="card">
        <text class="card-title">{{ editingCustomId ? '修改自定义食品' : '添加自定义食品' }}</text>
        <label class="field"><text>食品名称</text><input id="custom-name" v-model="customName" class="input" type="text" placeholder="某品牌乳清蛋白粉" /></label>
        <view class="two-cols"><label class="field"><text>每多少</text><input id="custom-base" v-model="customBaseAmount" class="input" type="text" inputmode="decimal" /></label><label class="field"><text>含蛋白质（g）</text><input id="custom-protein" v-model="customProtein" class="input" type="text" inputmode="decimal" placeholder="24" /></label></view>
        <text class="field-title">单位</text><view class="unit-chips"><button v-for="unit in customUnits" :id="`custom-unit-${unit}`" :key="unit" class="unit-chip" :class="{ active: customUnit === unit }" size="mini" @click="customUnit = unit">{{ unit }}</button></view>
        <label class="field"><text>分类</text><input id="custom-category" v-model="customCategory" class="input" type="text" /></label>
        <label class="field"><text>备注（可选）</text><input id="custom-notes" v-model="customNotes" class="input" type="text" placeholder="口味、品牌或包装说明" /></label>
        <view class="row"><button id="save-custom" class="primary-button grow" @click="saveCustomFood">{{ editingCustomId ? '保存修改' : '创建食品' }}</button><button v-if="editingCustomId" id="cancel-custom-edit" class="ghost-button" @click="resetCustomForm">取消</button></view>
      </view>
      <view class="card"><view class="card-heading"><text class="card-title">我的食品</text><text>{{ customFoods.length }} 项</text></view><text v-if="!customFoods.length" class="empty">还没有自定义食品</text><view v-for="food in customFoods" :key="food.id" class="custom-row" :data-custom-name="food.name"><view><text class="item-name">{{ food.name }}</text><text class="item-detail">每 {{ food.baseAmount }}{{ food.baseUnit }} 含 {{ food.systemProtein }}g</text></view><view class="item-actions"><button class="small-action favorite-custom" size="mini" @click="toggleFavorite(food)">{{ food.favorite ? '★ 已收藏' : '☆ 收藏' }}</button><button class="small-action edit-custom" size="mini" @click="editCustomFood(food)">修改</button><button class="small-action danger delete-custom" size="mini" @click="removeCustomFood(food)">删除</button></view></view></view>
    </view>

    <view v-else class="page-section">
      <view class="card"><view class="card-heading"><text class="card-title">每日记录</text><text>{{ history.length }} 天</text></view><text v-if="!history.length" class="empty">暂无历史记录</text><button v-for="item in history" :key="item.date" class="history-row" :class="{ selected: selectedHistoryDate === item.date }" :data-history-date="item.date" @click="viewHistory(item.date)"><view><text class="item-name">{{ item.date }}</text><text class="item-detail">目标 {{ item.target }}g · {{ item.entryCount }} 项</text></view><text class="history-total">{{ item.consumed }}g</text></button></view>
      <view v-if="selectedHistoryDay" id="history-detail" class="card"><text class="card-title">{{ selectedHistoryDay.date }} 食品快照</text><view class="history-summary">目标 {{ selectedHistoryDay.target }}g · 总计 {{ calculateSummary(selectedHistoryDay.target, selectedHistoryDay.entries).consumed }}g</view><view v-for="entry in selectedHistoryDay.entries" :key="entry.id" class="history-entry" :data-history-entry="entry.name"><view><text>{{ entry.name }}</text><text class="item-detail">{{ entry.quantity }}{{ entry.unit }} · 当时 {{ entry.snapshotProteinAmount }}g/{{ entry.snapshotBaseAmount }}{{ entry.snapshotBaseUnit }}</text></view><text>{{ entry.protein }}g</text></view></view>
    </view>
    <view class="safe-bottom" />
  </view>
</template>

<style scoped>
.app-shell { width: 100%; max-width: 680px; min-height: 100vh; margin: 0 auto; background: #f4f6f3; color: #193338; }
.hero { padding: 28px 20px 20px; background: linear-gradient(145deg, #0a625c, #128276 70%, #2a9d86); color: white; }
.eyebrow,.title,.hero-metrics text,.card-title,.helper,.item-name,.item-detail,.field-title,.reference-label,.reference-value,.detail-title,.source-card text,.snapshot { display:block; }
.eyebrow { font-size: 12px; opacity:.82; }.title { margin-top:6px; font-size:28px; font-weight:800; }
.hero-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:18px; }.hero-metrics>view { border-left:1px solid rgba(255,255,255,.25); padding-left:10px; }.hero-metrics>view:first-child{border:0;padding-left:0}.hero-number{font-size:25px;font-weight:800}.hero-metrics view text:last-child{font-size:11px;opacity:.75;margin-top:3px}
.progress-track{height:7px;margin-top:15px;overflow:hidden;border-radius:10px;background:rgba(255,255,255,.22)}.progress-bar{height:100%;background:#9bf1d9;border-radius:10px}.over-message{display:block;margin-top:8px;color:#ffedc7;font-size:12px}.hero-action{height:44px;margin:17px 0 0;border-radius:12px;background:#fff;color:#0b6b62;font-size:15px;font-weight:800;line-height:44px}
.tabs{position:sticky;top:0;z-index:8;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:9px 10px;background:rgba(244,246,243,.97);border-bottom:1px solid #dce4e0}.tab{height:38px;margin:0;padding:0;background:transparent;color:#607377;font-size:13px;line-height:38px;border-radius:9px}.tab.active{background:#d8eee8;color:#0c675f;font-weight:700}
.notice{margin:10px 14px 0;padding:10px 12px;border-radius:9px;font-size:13px}.notice.success{background:#e4f5eb;color:#176246}.notice.error{background:#ffe8e8;color:#9f2532}.page-section{padding:12px 14px 0}.card,.food-card{margin-bottom:12px;padding:15px;border:1px solid #dde5e1;border-radius:15px;background:white;box-shadow:0 4px 14px rgba(30,60,58,.05)}.compact-card{padding:12px 14px}.card-title{font-size:17px;font-weight:800}.helper{margin:5px 0 12px;color:#708187;font-size:12px;line-height:1.5}.row{display:flex;align-items:center;gap:8px}.grow{flex:1;min-width:0}.input{box-sizing:border-box;width:100%;height:42px;padding:0 11px;border:1px solid #ccd9d6;border-radius:9px;background:#fbfcfb;color:#173238;font-size:15px}.suffix{flex:none;color:#687c80;font-size:12px}.field-title{margin-bottom:6px;color:#496369;font-size:12px;font-weight:700}.primary-button,.secondary-button,.ghost-button{height:40px;margin:0;padding:0 14px;border-radius:9px;font-size:13px;line-height:40px}.primary-button{background:#0f766e;color:white}.secondary-button{background:#deeeeb;color:#175f59}.ghost-button{background:#edf0ef;color:#617176}.wide{width:100%;margin-top:12px}.card-heading,.entry-top,.detail-title-row,.preview-row,.history-entry,.result-heading{display:flex;justify-content:space-between;align-items:center}.empty{display:block;padding:18px 0;color:#7d8d90;font-size:13px;text-align:center}.entry-item{padding:14px 0;border-top:1px solid #edf1ef}.entry-protein{color:#0f766e;font-size:19px;font-weight:800}.item-name{font-weight:750}.item-detail{margin-top:3px;color:#718185;font-size:12px}.snapshot{margin-top:8px;padding:7px 9px;border-radius:7px;background:#f1f5f3;color:#627578;font-size:11px}.item-actions,.inline-edit{display:flex;gap:6px;margin-top:9px}.small-action{height:30px;margin:0;padding:0 9px;border-radius:8px;background:#e4efec;color:#285d58;font-size:12px;line-height:30px}.small-action.danger{background:#fff0f0;color:#a43842}.mini-input{width:120px;height:34px}
.search-sticky{position:sticky;top:57px;z-index:6;margin:-12px -14px 10px;padding:10px 14px;background:#f4f6f3}.search-box{display:flex;align-items:center;gap:8px;height:44px;padding:0 12px;border:1px solid #cfdad6;border-radius:12px;background:#fff}.search-box input{flex:1;height:40px}.category-scroll{width:100%;margin-top:9px;white-space:nowrap}.category-chip,.unit-chip{display:inline-block;height:32px;margin:0 6px 0 0;padding:0 11px;border-radius:17px;background:#e8eeeb;color:#53696c;font-size:12px;line-height:32px}.category-chip.active,.unit-chip.active{background:#0f766e;color:white}.result-heading{padding:3px 2px 10px;color:#5d7074;font-size:12px}.food-card{display:flex;align-items:center;gap:11px;padding:11px;cursor:pointer}.food-icon{flex:none;width:50px;height:50px;border-radius:13px}.food-card-main{flex:1;min-width:0}.name-line{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.mine-badge,.custom-badge{padding:2px 5px;border-radius:5px;font-size:10px}.mine-badge{background:#fff0c7;color:#9a6510}.custom-badge{background:#e9e2f6;color:#6d4a92}.source-short{display:block;margin-top:4px;color:#8a989a;font-size:10px}.favorite-button{flex:none;width:38px;height:38px;margin:0;padding:0;border-radius:50%;background:#f1f3f2;color:#859294;font-size:22px;line-height:38px}.favorite-button.on{background:#fff0c6;color:#d38b08}
.detail-sheet{position:fixed;z-index:20;left:50%;bottom:0;transform:translateX(-50%);box-sizing:border-box;width:100%;max-width:680px;max-height:88vh;padding:10px 18px 24px;overflow-y:auto;border-radius:22px 22px 0 0;background:white;box-shadow:0 -12px 38px rgba(20,45,43,.22)}.detail-handle{width:42px;height:4px;margin:0 auto 14px;border-radius:4px;background:#d5dcda}.detail-title-row{align-items:flex-start}.detail-icon{width:54px;height:54px;margin-right:10px}.detail-title{font-size:20px;font-weight:800}.close-button{width:34px;height:34px;margin:0;padding:0;border-radius:50%;background:#edf1ef;color:#667;font-size:22px;line-height:34px}.reference-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.reference-grid>view{padding:11px;border-radius:10px;background:#f1f5f3}.reference-label{color:#6c7d80;font-size:11px}.reference-value{margin-top:4px;font-weight:800}.reference-value.mine{color:#b16f0e}.effective-line{display:block;margin:10px 0;padding:10px;border-radius:9px;background:#dff3ee;color:#0d655d;font-size:14px;font-weight:800}.source-card{padding:11px;border-left:3px solid #8ca6a1;background:#f7f9f8;color:#697a7d;font-size:11px;line-height:1.55}.source-title{color:#324f53;font-weight:800}.override-box,.intake-box{margin-top:13px;padding-top:13px;border-top:1px solid #e8edeb}.action-row{margin-top:8px}.preview-row{margin-top:12px;padding:10px;border-radius:9px;background:#eef6f3}.preview-number{color:#0f766e;font-size:22px;font-weight:800}
.package-guide{background:#edf6f3}.field{display:block;margin-bottom:12px;color:#4c6569;font-size:12px}.field .input{margin-top:5px}.two-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}.unit-chips{margin:6px 0 14px}.custom-row{padding:13px 0;border-top:1px solid #edf1ef}.history-row{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:65px;margin:8px 0 0;padding:10px 12px;border:1px solid #e0e8e4;border-radius:10px;background:#fafcfa;color:#173238;text-align:left}.history-row.selected{border-color:#0f766e;background:#e3f3ee}.history-total{color:#0f766e;font-size:20px;font-weight:800}.history-summary{margin:10px 0;padding:10px;border-radius:8px;background:#eef6f3;color:#315b57;font-size:13px}.history-entry{padding:11px 0;border-top:1px solid #edf1ef;font-size:13px}.safe-bottom{height:28px}
@media(min-width:720px){.app-shell{margin-top:18px;margin-bottom:18px;min-height:calc(100vh - 36px);border-radius:18px;overflow:hidden;box-shadow:0 12px 38px rgba(31,63,60,.14)}.detail-sheet{bottom:18px;border-radius:22px}}
</style>
