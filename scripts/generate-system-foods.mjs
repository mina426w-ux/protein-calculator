import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, 'evidence', 'source-data', 'sr-legacy-expanded', 'FoodData_Central_sr_legacy_food_json_2018-04.json')
const outputPath = path.join(root, 'src', 'data', 'system-foods.json')
const reportPath = path.join(root, 'evidence', 'source-data', 'curation-report.json')

const C = {
  meat: '肉禽',
  seafood: '鱼虾水产',
  eggs: '蛋类',
  dairy: '奶制品',
  soy: '豆制品',
  plant: '植物蛋白',
  processed: '蛋白粉及加工食品',
}

const icons = {
  [C.meat]: '/static/food-icons/meat.svg',
  [C.seafood]: '/static/food-icons/seafood.svg',
  [C.eggs]: '/static/food-icons/eggs.svg',
  [C.dairy]: '/static/food-icons/dairy.svg',
  [C.soy]: '/static/food-icons/soy.svg',
  [C.plant]: '/static/food-icons/plant.svg',
  [C.processed]: '/static/food-icons/processed.svg',
}

const s = (id, nameZh, category, state, description, options = {}) => ({
  id,
  nameZh,
  category,
  state,
  description,
  baseAmount: options.baseAmount ?? 100,
  baseUnit: options.baseUnit ?? 'g',
  proteinOverride: options.proteinOverride,
  notes: options.notes ?? '',
  expectedFdcId: options.expectedFdcId,
})

const specs = [
  // 肉禽（18）
  s('chicken-breast-cooked', '鸡胸肉', C.meat, '熟／烤', `Chicken, broilers or fryers, breast, meat only, cooked, roasted`, { expectedFdcId: 171477 }),
  s('chicken-breast-raw', '鸡胸肉', C.meat, '生', `Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw`, { expectedFdcId: 171077 }),
  s('chicken-thigh-cooked', '鸡腿肉', C.meat, '熟／烤', `Chicken, broilers or fryers, thigh, meat only, cooked, roasted`, { expectedFdcId: 172388 }),
  s('chicken-thigh-raw', '鸡腿肉', C.meat, '生', `Chicken, broilers or fryers, dark meat, thigh, meat only, raw`, { expectedFdcId: 173627 }),
  s('chicken-wing-meat-cooked', '鸡翅肉（去皮）', C.meat, '熟／烤', `Chicken, broilers or fryers, wing, meat only, cooked, roasted`, { expectedFdcId: 172392 }),
  s('chicken-wing-skin-cooked', '鸡翅（带皮）', C.meat, '熟／烤', `Chicken, broilers or fryers, wing, meat and skin, cooked, roasted`, { expectedFdcId: 173630 }),
  s('turkey-breast-cooked', '火鸡胸肉', C.meat, '熟／烤', `Turkey, whole, breast, meat only, cooked, roasted`, { expectedFdcId: 171496 }),
  s('pork-tenderloin-cooked', '猪里脊', C.meat, '熟／烤', `Pork, fresh, loin, tenderloin, separable lean only, cooked, roasted`, { expectedFdcId: 168250 }),
  s('pork-loin-lean-cooked', '瘦猪肉（外脊）', C.meat, '熟／烤', `Pork, fresh, loin, whole, separable lean only, cooked, roasted`, { expectedFdcId: 168233 }),
  s('pork-ground-cooked', '猪肉末（84%瘦）', C.meat, '熟／煎', `Pork, ground, 84% lean / 16% fat, cooked, pan-broiled`, { expectedFdcId: 168374 }),
  s('beef-tenderloin-cooked', '牛里脊', C.meat, '熟／烤', `Beef, loin, tenderloin steak, boneless, separable lean only, trimmed to 0" fat, all grades, cooked, grilled`, { expectedFdcId: 170641 }),
  s('beef-chuck-cooked', '牛肩肉', C.meat, '熟／烤', `Beef, chuck, top blade, separable lean only, trimmed to 0" fat, choice, cooked, broiled`, { expectedFdcId: 168738 }),
  s('beef-round-cooked', '牛后腿肉', C.meat, '熟／烤', `Beef, round, top round steak, boneless, separable lean only, trimmed to 0" fat, all grades, cooked, grilled`, { expectedFdcId: 168649 }),
  s('beef-ground-90-cooked', '牛肉末（90%瘦）', C.meat, '熟／煎', `Beef, ground, 90% lean meat / 10% fat, crumbles, cooked, pan-browned`, { expectedFdcId: 171794 }),
  s('beef-ground-generic-cooked', '牛肉末（普通）', C.meat, '熟', `Beef, ground, unspecified fat content, cooked`, { expectedFdcId: 172161 }),
  s('lamb-leg-cooked', '羊腿肉', C.meat, '熟／烤', `Lamb, leg, whole (shank and sirloin), separable lean only, trimmed to 1/4" fat, choice, cooked, roasted`, { expectedFdcId: 174314 }),
  s('lamb-loin-cooked', '羊里脊', C.meat, '熟／烤', `Lamb, loin, separable lean only, trimmed to 1/4" fat, choice, cooked, roasted`, { expectedFdcId: 174320 }),
  s('duck-meat-cooked', '鸭肉（去皮）', C.meat, '熟／烤', `Duck, domesticated, meat only, cooked, roasted`, { expectedFdcId: 172411 }),

  // 鱼虾水产（20）
  s('salmon-atlantic-farmed-cooked', '三文鱼（大西洋养殖）', C.seafood, '熟／干热', `Fish, salmon, Atlantic, farmed, cooked, dry heat`, { expectedFdcId: 175168 }),
  s('salmon-atlantic-wild-cooked', '三文鱼（大西洋野生）', C.seafood, '熟／干热', `Fish, salmon, Atlantic, wild, cooked, dry heat`, { expectedFdcId: 171998 }),
  s('cod-atlantic-cooked', '鳕鱼（大西洋）', C.seafood, '熟／干热', `Fish, cod, Atlantic, cooked, dry heat`, { expectedFdcId: 171956 }),
  s('tuna-yellowfin-cooked', '金枪鱼（黄鳍）', C.seafood, '熟／干热', `Fish, tuna, yellowfin, fresh, cooked, dry heat`, { expectedFdcId: 172006 }),
  s('bass-freshwater-cooked', '淡水鲈鱼', C.seafood, '熟／干热', `Fish, bass, freshwater, mixed species, cooked, dry heat`, { expectedFdcId: 171989 }),
  s('carp-cooked', '鲤鱼', C.seafood, '熟／干热', `Fish, carp, cooked, dry heat`, { expectedFdcId: 174185 }),
  s('snapper-cooked', '鲷鱼', C.seafood, '熟／干热', `Fish, snapper, mixed species, cooked, dry heat`, { expectedFdcId: 173699 }),
  s('trout-cooked', '鳟鱼', C.seafood, '熟／干热', `Fish, trout, mixed species, cooked, dry heat`, { expectedFdcId: 172004 }),
  s('shrimp-cooked', '虾／虾仁', C.seafood, '熟', `Crustaceans, shrimp, cooked`, { expectedFdcId: 175180 }),
  s('crab-dungeness-cooked', '蟹肉（珍宝蟹）', C.seafood, '熟／蒸煮', `Crustaceans, crab, dungeness, cooked, moist heat`, { expectedFdcId: 172007 }),
  s('crab-king-cooked', '蟹肉（帝王蟹）', C.seafood, '熟／蒸煮', `Crustaceans, crab, alaska king, cooked, moist heat`, { expectedFdcId: 174202 }),
  s('scallop-cooked', '扇贝肉', C.seafood, '熟／蒸', `Mollusks, scallop, (bay and sea), cooked, steamed`, { expectedFdcId: 167742 }),
  s('clam-cooked', '蛤蜊肉', C.seafood, '熟／蒸煮', `Mollusks, clam, mixed species, cooked, moist heat`, { expectedFdcId: 171975 }),
  s('mussel-cooked', '贻贝肉', C.seafood, '熟／蒸煮', `Mollusks, mussel, blue, cooked, moist heat`, { expectedFdcId: 174217 }),
  s('oyster-cooked', '牡蛎肉', C.seafood, '熟／蒸煮', `Mollusks, oyster, Pacific, cooked, moist heat`, { expectedFdcId: 174250 }),
  s('squid-cooked', '鱿鱼', C.seafood, '熟／炸', `Mollusks, squid, mixed species, cooked, fried`, { expectedFdcId: 171982 }),
  s('octopus-cooked', '章鱼', C.seafood, '熟／蒸煮', `Mollusks, octopus, common, cooked, moist heat`, { expectedFdcId: 174249 }),
  s('tilapia-cooked', '罗非鱼', C.seafood, '熟／干热', `Fish, tilapia, cooked, dry heat`, { expectedFdcId: 175177 }),
  s('sardine-canned', '沙丁鱼罐头（油浸沥干）', C.seafood, '罐装', `Fish, sardine, Atlantic, canned in oil, drained solids with bone`, { expectedFdcId: 175139 }),
  s('mackerel-cooked', '鲭鱼', C.seafood, '熟／干热', `Fish, mackerel, Atlantic, cooked, dry heat`, { expectedFdcId: 175120 }),

  // 蛋类（10）
  s('egg-whole-boiled', '鸡蛋（整只）', C.eggs, '水煮', `Egg, whole, cooked, hard-boiled`, { expectedFdcId: 173424 }),
  s('egg-whole-boiled-piece', '鸡蛋（水煮，单个估算）', C.eggs, '水煮', `Egg, whole, cooked, hard-boiled`, { expectedFdcId: 173424, baseAmount: 1, baseUnit: '个', proteinOverride: 6.3, notes: '按可食部分约50g/个估算；鸡蛋大小会影响结果，可改用克数条目或修改参考值。' }),
  s('egg-whole-raw', '鸡蛋（整只）', C.eggs, '生', `Egg, whole, raw, fresh`, { expectedFdcId: 171287 }),
  s('egg-whole-fried', '煎鸡蛋', C.eggs, '熟／煎', `Egg, whole, cooked, fried`, { expectedFdcId: 173423 }),
  s('egg-whole-scrambled', '炒鸡蛋', C.eggs, '熟／炒', `Egg, whole, cooked, scrambled`, { expectedFdcId: 172187 }),
  s('egg-whole-poached', '水波蛋', C.eggs, '熟／水煮', `Egg, whole, cooked, poached`, { expectedFdcId: 172186 }),
  s('egg-white-raw', '鸡蛋白', C.eggs, '生', `Egg, white, raw, fresh`, { expectedFdcId: 172183 }),
  s('egg-yolk-raw', '鸡蛋黄', C.eggs, '生', `Egg, yolk, raw, fresh`, { expectedFdcId: 172184 }),
  s('duck-egg-raw', '鸭蛋', C.eggs, '生', `Egg, duck, whole, fresh, raw`, { expectedFdcId: 172189 }),
  s('quail-egg-raw', '鹌鹑蛋', C.eggs, '生', `Egg, quail, whole, fresh, raw`, { expectedFdcId: 172191 }),

  // 奶制品（18）——液体条目按约100mL展示，原始FDC为每100g，UI会明确提示
  s('milk-whole', '纯牛奶（全脂参考）', C.dairy, '液体', `Milk, whole, 3.25% milkfat, with added vitamin D`, { expectedFdcId: 171265, baseUnit: 'mL', notes: 'USDA原始值为每100g；本应用按约100mL展示。不同品牌差异较大，请按包装营养成分表设置“我的数值”。' }),
  s('milk-lowfat-1', '低脂牛奶（1%）', C.dairy, '液体', `Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D`, { expectedFdcId: 170872, baseUnit: 'mL', notes: 'USDA原始值为每100g；本应用按约100mL展示，品牌值请按包装修改。' }),
  s('milk-reduced-2', '低脂牛奶（2%）', C.dairy, '液体', `Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D`, { expectedFdcId: 171267, baseUnit: 'mL', notes: 'USDA原始值为每100g；本应用按约100mL展示，品牌值请按包装修改。' }),
  s('milk-skim', '脱脂牛奶', C.dairy, '液体', `Milk, nonfat, fluid, with added vitamin A and vitamin D (fat free or skim)`, { expectedFdcId: 171269, baseUnit: 'mL', notes: 'USDA原始值为每100g；本应用按约100mL展示，品牌值请按包装修改。' }),
  s('milk-protein-fortified', '高蛋白牛奶（通用参考）', C.dairy, '液体', `Milk, lowfat, fluid, 1% milkfat, protein fortified, with added vitamin A and vitamin D`, { expectedFdcId: 171268, baseUnit: 'mL', notes: '仅为USDA强化牛奶参考，不代表所有高蛋白牛奶。必须以实际品牌包装营养成分表为准。' }),
  s('milk-goat', '羊奶', C.dairy, '液体', `Milk, goat, fluid, with added vitamin D`, { expectedFdcId: 171278, baseUnit: 'mL', notes: 'USDA原始值为每100g；本应用按约100mL展示，品牌值请按包装修改。' }),
  s('yogurt-plain-whole', '原味酸奶（全脂）', C.dairy, '原味', `Yogurt, plain, whole milk`, { expectedFdcId: 171284 }),
  s('yogurt-plain-lowfat', '原味酸奶（低脂）', C.dairy, '原味', `Yogurt, plain, low fat`, { expectedFdcId: 170886 }),
  s('yogurt-greek-nonfat', '希腊酸奶（脱脂）', C.dairy, '原味', `Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)`, { expectedFdcId: 170894 }),
  s('yogurt-greek-lowfat', '希腊酸奶（低脂）', C.dairy, '原味', `Yogurt, Greek, plain, lowfat`, { expectedFdcId: 170903 }),
  s('yogurt-greek-whole', '希腊酸奶（全脂）', C.dairy, '原味', `Yogurt, Greek, plain, whole milk`, { expectedFdcId: 171304 }),
  s('cottage-cheese-lowfat', 'Cottage Cheese（低脂）', C.dairy, '奶酪', `Cheese, cottage, lowfat, 1% milkfat`, { expectedFdcId: 173417 }),
  s('cottage-cheese-creamed', 'Cottage Cheese（奶油型）', C.dairy, '奶酪', `Cheese, cottage, creamed, large or small curd`, { expectedFdcId: 172179 }),
  s('cheddar-cheese', '切达奶酪', C.dairy, '奶酪', `Cheese, cheddar (Includes foods for USDA's Food Distribution Program)`, { expectedFdcId: 173414 }),
  s('mozzarella-cheese', '马苏里拉奶酪（全脂）', C.dairy, '奶酪', `Cheese, mozzarella, whole milk`, { expectedFdcId: 170845 }),
  s('parmesan-cheese', '帕玛森奶酪', C.dairy, '奶酪', `Cheese, parmesan, hard`, { expectedFdcId: 170848 }),
  s('ricotta-cheese', '瑞可塔奶酪', C.dairy, '奶酪', `Cheese, ricotta, whole milk`, { expectedFdcId: 170851 }),
  s('swiss-cheese', '瑞士奶酪', C.dairy, '奶酪', `Cheese, swiss`, { expectedFdcId: 171251 }),

  // 豆制品（14）
  s('soymilk-unsweetened', '无糖豆浆', C.soy, '液体', `Soymilk (all flavors), unsweetened, with added calcium, vitamins A and D`, { expectedFdcId: 175215, baseUnit: 'mL', notes: 'USDA原始值为每100g；本应用按约100mL展示。自制与品牌豆浆浓度差异较大。' }),
  s('soymilk-plain', '豆浆（原味参考）', C.soy, '液体', `SILK Plain, soymilk`, { expectedFdcId: 175218, baseUnit: 'mL', notes: '来源为特定产品记录，只作同类参考；请按实际包装或配方修改。' }),
  s('soybeans-cooked', '黄豆', C.soy, '熟／水煮', `Soybeans, mature seeds, cooked, boiled, with salt`, { expectedFdcId: 174299 }),
  s('edamame-cooked', '毛豆', C.soy, '熟／水煮', `Soybeans, green, cooked, boiled, drained, without salt`, { expectedFdcId: 169283 }),
  s('tofu-firm-nigari', '北豆腐（参考）', C.soy, '硬豆腐', `Tofu, firm, prepared with calcium sulfate and magnesium chloride (nigari)`, { expectedFdcId: 172448, notes: '凝固剂和含水量会显著影响数值，请按实际包装修改。' }),
  s('tofu-firm-calcium', '老豆腐（高固形物参考）', C.soy, '硬豆腐', `Tofu, raw, firm, prepared with calcium sulfate`, { expectedFdcId: 172475, notes: '凝固剂和含水量会显著影响数值，请按实际包装修改。' }),
  s('tofu-extra-firm', '特硬豆腐', C.soy, '硬豆腐', `Tofu, extra firm, prepared with nigari`, { expectedFdcId: 174290 }),
  s('tofu-soft', '嫩豆腐', C.soy, '软豆腐', `Tofu, soft, prepared with calcium sulfate and magnesium chloride (nigari)`, { expectedFdcId: 172449 }),
  s('tofu-regular', '普通豆腐', C.soy, '生／普通', `Tofu, raw, regular, prepared with calcium sulfate`, { expectedFdcId: 172476 }),
  s('tofu-fried', '油豆腐', C.soy, '炸', `Tofu, fried`, { expectedFdcId: 172451 }),
  s('tofu-dried-frozen', '冻干豆腐', C.soy, '干制', `Tofu, dried-frozen (koyadofu)`, { expectedFdcId: 172450, notes: '此条为冻干豆腐，不等同于所有中式豆干或腐竹。' }),
  s('tempeh-cooked', '天贝', C.soy, '熟', `Tempeh, cooked`, { expectedFdcId: 172467 }),
  s('soy-protein-isolate', '大豆分离蛋白', C.soy, '粉末', `Soy protein isolate`, { expectedFdcId: 174276, notes: '粉末产品差异较大，请优先按包装标签建立自定义食品。' }),
  s('soybeans-dry-roasted', '烤黄豆', C.soy, '干烤', `Soybeans, mature seeds, dry roasted`, { expectedFdcId: 172441 }),

  // 其他植物蛋白（20）
  s('lentils-cooked', '扁豆', C.plant, '熟／水煮', `Lentils, mature seeds, cooked, boiled, without salt`, { expectedFdcId: 172421 }),
  s('chickpeas-cooked', '鹰嘴豆', C.plant, '熟／水煮', `Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt`, { expectedFdcId: 173757 }),
  s('kidney-beans-cooked', '红腰豆', C.plant, '熟／水煮', `Beans, kidney, all types, mature seeds, cooked, boiled, without salt`, { expectedFdcId: 173740 }),
  s('black-beans-cooked', '黑豆', C.plant, '熟／水煮', `Beans, black, mature seeds, cooked, boiled, without salt`, { expectedFdcId: 173735 }),
  s('navy-beans-cooked', '白芸豆', C.plant, '熟／水煮', `Beans, navy, mature seeds, cooked, boiled, without salt`, { expectedFdcId: 173746 }),
  s('pinto-beans-cooked', '斑豆', C.plant, '熟／水煮', `Beans, pinto, mature seeds, cooked, boiled, without salt`, { expectedFdcId: 175200 }),
  s('split-peas-cooked', '豌豆（干豆水煮）', C.plant, '熟／水煮', `Peas, split, mature seeds, cooked, boiled, without salt`, { expectedFdcId: 172429 }),
  s('peanuts-raw', '花生', C.plant, '生', `Peanuts, all types, raw`, { expectedFdcId: 172430 }),
  s('almonds', '杏仁', C.plant, '干制', `Nuts, almonds`, { expectedFdcId: 170567 }),
  s('cashews-raw', '腰果', C.plant, '生', `Nuts, cashew nuts, raw`, { expectedFdcId: 170162 }),
  s('pumpkin-seeds', '南瓜籽仁', C.plant, '干制', `Seeds, pumpkin and squash seed kernels, dried`, { expectedFdcId: 170556 }),
  s('sunflower-seeds', '葵花籽仁', C.plant, '干制', `Seeds, sunflower seed kernels, dried`, { expectedFdcId: 170562 }),
  s('sesame-seeds', '芝麻', C.plant, '干制', `Seeds, sesame seeds, whole, dried`, { expectedFdcId: 170150 }),
  s('quinoa-cooked', '藜麦', C.plant, '熟', `Quinoa, cooked`, { expectedFdcId: 168917 }),
  s('pistachios-raw', '开心果', C.plant, '生', `Nuts, pistachio nuts, raw`, { expectedFdcId: 170184 }),
  s('walnuts', '核桃', C.plant, '干制', `Nuts, walnuts, english`, { expectedFdcId: 170187 }),
  s('flaxseed', '亚麻籽', C.plant, '干制', `Seeds, flaxseed`, { expectedFdcId: 169414 }),
  s('chia-seeds', '奇亚籽', C.plant, '干制', `Seeds, chia seeds, dried`, { expectedFdcId: 170554 }),
  s('hemp-seeds', '火麻仁／大麻籽仁', C.plant, '去壳', `Seeds, hemp seed, hulled`, { expectedFdcId: 170148 }),
  s('peanut-butter', '花生酱', C.plant, '无盐', `Peanut butter, smooth style, without salt`, { expectedFdcId: 172470 }),

  // 蛋白粉及加工食品（6）——只代表具体FDC记录，UI强提示按包装自定义
  s('whey-protein-eas', '乳清蛋白粉（EAS记录参考）', C.processed, '粉末', `Beverages, ABBOTT, EAS whey protein powder`, { expectedFdcId: 173167, notes: '仅代表该FDC产品记录，不能代表所有乳清蛋白粉。请按手中包装建立自定义食品。' }),
  s('whey-protein-isolate-record', '乳清分离蛋白粉（记录参考）', C.processed, '粉末', `Beverages, Whey protein powder isolate`, { expectedFdcId: 173177, notes: '仅代表该FDC记录，不能代表所有蛋白粉。请按手中包装建立自定义食品。' }),
  s('milk-protein-powder-record', '牛奶蛋白补充粉（记录参考）', C.processed, '粉末', `Protein supplement, milk based, Muscle Milk, powder`, { expectedFdcId: 173459, notes: '品牌包装食品差异大，请按实际营养标签建立自定义食品。' }),
  s('sweet-whey-powder', '乳清粉（甜乳清干粉）', C.processed, '粉末', `Whey, sweet, dried`, { expectedFdcId: 171283, notes: '此为甜乳清干粉，不等同于高浓度乳清蛋白粉。' }),
  s('gelatin-powder', '明胶粉', C.processed, '无糖干粉', `Gelatins, dry powder, unsweetened`, { expectedFdcId: 169599, notes: '蛋白质含量高但氨基酸构成与完整蛋白不同；本应用只做克数记录，不作营养推荐。' }),
  s('soy-flour-defatted', '脱脂大豆粉', C.processed, '粉末', `Soy flour, defatted`, { expectedFdcId: 174275, notes: '不同加工产品差异较大，请按包装标签修改或建立自定义食品。' }),
]

if (!fs.existsSync(sourcePath)) throw new Error(`缺少USDA源文件：${sourcePath}`)
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8')).SRLegacyFoods
const byDescription = new Map(source.map((food) => [food.description, food]))

const foods = specs.map((spec) => {
  const food = byDescription.get(spec.description)
  if (!food) throw new Error(`未找到精确USDA记录：${spec.description}`)
  if (spec.expectedFdcId && food.fdcId !== spec.expectedFdcId) {
    throw new Error(`FDC ID不一致：${spec.description}，期望${spec.expectedFdcId}，实际${food.fdcId}`)
  }
  const nutrient = food.foodNutrients.find((item) => item.nutrient?.id === 1003)
  if (!nutrient || !Number.isFinite(nutrient.amount)) throw new Error(`蛋白质数据UNKNOWN：${spec.description}`)
  const protein = spec.proteinOverride ?? nutrient.amount
  return {
    id: `system-${spec.id}`,
    stableKey: spec.id,
    name: spec.nameZh,
    nameEn: food.description,
    category: spec.category,
    state: spec.state,
    baseAmount: spec.baseAmount,
    baseUnit: spec.baseUnit,
    systemProtein: protein,
    sourceProteinPer100g: nutrient.amount,
    sourceName: 'USDA FoodData Central – SR Legacy',
    sourceId: String(food.fdcId),
    sourceDataType: food.dataType,
    sourceRelease: '2018-04',
    sourceUrl: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}/nutrients`,
    queriedAt: '2026-09-27',
    isSystem: true,
    isCustom: false,
    userModified: false,
    imageLocalPath: icons[spec.category],
    imageSource: '项目自制分类图标',
    imageLicense: '项目原创，可随本项目使用；无外部素材',
    notes: spec.notes || '系统值仅作公开数据库参考；品种、部位、加工与烹饪方式会造成差异。',
  }
})

const ids = new Set(foods.map((food) => food.id))
if (ids.size !== foods.length) throw new Error('系统食品ID存在重复')

const report = {
  generatedAt: new Date().toISOString(),
  sourceArchive: 'FoodData_Central_sr_legacy_food_json_2018-04.zip',
  sourceArchiveSha256: '0FE8AE486A2C8EB42CB96413F058DEB51863A46C8FB8EEB4B1FB45006DD338EF',
  sourceLicense: 'CC0 1.0 / Public Domain',
  foodCount: foods.length,
  categoryCounts: Object.fromEntries(Object.values(C).map((category) => [category, foods.filter((food) => food.category === category).length])),
  unknownProteinCount: foods.filter((food) => !Number.isFinite(food.systemProtein)).length,
  derivedEntries: foods.filter((food) => food.systemProtein !== food.sourceProteinPer100g).map((food) => food.id),
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(foods, null, 2)}\n`, 'utf8')
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))
