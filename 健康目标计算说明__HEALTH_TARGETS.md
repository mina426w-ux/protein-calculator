# 蛋白质 + 热量计算器 V2｜健康目标计算说明

本应用只提供一般成人参考估算，不是精确代谢测量、诊断或医疗处方。医生或营养师给出的定量目标优先。

## 计算规则

- 静息能量：Mifflin–St Jeor 成人预测公式。男性 `10×体重kg + 6.25×身高cm − 5×年龄 + 5`；女性最后一项为 `−161`。
- 维持热量：静息能量乘以单一配置中的活动系数 `1.20 / 1.375 / 1.55 / 1.725 / 1.90`，结果明确标为估算。
- 减重模式：可选 `250 / 500 / 750 kcal/天` 缺口，默认 500。未成年人、孕期/哺乳期或 BMI<18.5 时不自动生成减重热量目标；用户仍可录入专业人员给出的目标。
- 蛋白质：普通参考为 `0.8 g × 用户明确选择的当前体重或目标体重`。程序不会暗中切换计算体重；自定义或医生定量可覆盖。
- 祖源、乳制品耐受与饮食习惯不改变 BMR、TDEE、蛋白质或热量公式，只用于使用说明与常用食品筛选。

## 权威来源

- Mifflin MD 等，1990，成人静息能量预测公式原始研究（PMID 2305711）：https://pubmed.ncbi.nlm.nih.gov/2305711/
- National Academies / NCBI Bookshelf，成人蛋白质 RDA 0.8 g/kg，并说明体重明显异常时不应按全部脂肪体重机械外推：https://www.ncbi.nlm.nih.gov/books/NBK222890/pdf/Bookshelf_NBK222890.pdf
- NHLBI 成人超重与肥胖证据综述，常见 500–750 kcal/天能量缺口：https://www.nhlbi.nih.gov/sites/default/files/media/docs/obesity-evidence-review.pdf
- WHO 成人低体重定义 BMI<18.5：https://www.who.int/data/gho/data/indicators/indicator-details/GHO/prevalence-of-underweight-among-adults-bmi-18-%28crude-estimate%29-%28-%29

核对日期：2026-09-27。
