# 食品数据来源与口径

## 主数据来源

- 数据库：U.S. Department of Agriculture, Agricultural Research Service, FoodData Central。
- 数据类型：SR Legacy，2018-04 最终版本。
- 官方下载页：`https://fdc.nal.usda.gov/download-datasets/`
- 官方 API / 数据说明：`https://fdc.nal.usda.gov/api-guide/`
- 下载日期与本项目查询日期：2026-09-27。
- 官方许可：FoodData Central 数据为 Public Domain，按 CC0 1.0 发布。
- 本地原始压缩包：`evidence/source-data/FoodData_Central_sr_legacy_food_json_2018-04.zip`
- 原始压缩包 SHA-256：`0FE8AE486A2C8EB42CB96413F058DEB51863A46C8FB8EEB4B1FB45006DD338EF`
- 可复现生成脚本：`scripts/generate-system-foods.mjs`
- 生成报告：`evidence/source-data/curation-report.json`

项目保留原始 ZIP，并可能保留用于审计的解压副本。解压副本可以由以下命令重新生成：

```powershell
Expand-Archive -LiteralPath 'evidence\source-data\FoodData_Central_sr_legacy_food_json_2018-04.zip' -DestinationPath 'evidence\source-data\sr-legacy-expanded'
node scripts/generate-system-foods.mjs
```

每条系统食品保存原始英文名称、FDC ID、数据类型、发布日期、查询日期和对应详情 URL。蛋白质读取营养素 ID `1003`，热量读取能量营养素 ID `1008`（kcal）。系统库不是医疗处方；品种、含水量、部位、烹饪方式和品牌都会造成差异。

## 计量口径

- USDA 营养数据默认按每 100g 可食部分。
- 固体仍按 `100g` 保存和计算。
- 牛奶、豆浆等液体为方便中国用户输入，界面按约 `100mL` 展示 USDA 每 100g 参考值，并在食品备注中明确这是近似展示；品牌包装值应由用户覆盖。
- “鸡蛋（水煮，单个估算）”是唯一派生条目：按约 50g 可食部分折算为 6.3g 蛋白质和 77.5 kcal/个，界面明确标注为估算值；用户可改用克数条目或覆盖参考值。
- 蛋白粉和加工食品记录只代表对应 FDC 记录，不代表整个产品类别；程序突出引导用户按实际包装创建自定义食品。

## UNKNOWN

最终纳入系统库的 106 个条目全部在原始数据中找到蛋白质与热量字段；蛋白质 `UNKNOWN` 数量为 0，热量 `UNKNOWN` 数量为 0。没有可靠数值或无法精确对应的中式条目（例如泛指“豆皮”“腐竹”）没有被强行映射或编造。
