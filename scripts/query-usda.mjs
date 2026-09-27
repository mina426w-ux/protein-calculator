import fs from 'node:fs'

const sourcePath = new URL('../evidence/source-data/sr-legacy-expanded/FoodData_Central_sr_legacy_food_json_2018-04.json', import.meta.url)
const queries = process.argv.slice(2)

if (!queries.length) {
  console.error('请提供一个或多个英文关键词。')
  process.exit(1)
}

const foods = JSON.parse(fs.readFileSync(sourcePath, 'utf8')).SRLegacyFoods

for (const query of queries) {
  const words = query.toLowerCase().split('|').filter(Boolean)
  const matches = foods
    .filter((food) => words.every((word) => food.description.toLowerCase().includes(word)))
    .slice(0, 30)
    .map((food) => ({
      fdcId: food.fdcId,
      protein: food.foodNutrients.find((item) => item.nutrient?.id === 1003)?.amount,
      description: food.description,
    }))
  console.log(`\n### ${query} (${matches.length})`)
  for (const item of matches) console.log(`${item.fdcId}\t${item.protein ?? 'UNKNOWN'}\t${item.description}`)
}
