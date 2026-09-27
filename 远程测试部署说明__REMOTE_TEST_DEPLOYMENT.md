# 蛋白质计算器｜远程测试部署说明

## 仓库

- 名称：`mina426w-ux/protein-calculator`
- 地址：`https://github.com/mina426w-ux/protein-calculator`
- 默认分支：`main`
- 当前可见性：`PRIVATE`

## 固定测试网址

- 预定地址：`https://mina426w-ux.github.io/protein-calculator/`
- 当前状态：尚未发布。GitHub API 返回 HTTP 422，当前账户套餐不支持私有仓库 GitHub Pages。

## 部署方式

推送 `main` 后，由 `.github/workflows/deploy-pages.yml` 自动执行类型检查、单元测试、H5 构建并尝试发布 GitHub Pages。H5 使用 `/protein-calculator/` 固定子路径。

## 如何更新

Pages 权限问题解决后，在现有项目提交并推送到 `main`，同一 Workflow 会更新同一固定网址；不需要手工上传 `dist`。

## 如何验证

检查 GitHub Actions 的 `Deploy GitHub Pages` 运行结论，然后访问固定网址，确认 HTTP 200、首页、JS、CSS、本地图标、搜索、计算、刷新持久化和控制台错误。

## 数据边界

数据只保存在各浏览器的本地存储中，不跨设备同步。Windows、Mac、iPhone 和 iPad 各自拥有独立数据；本任务不增加账号、后端或云数据库。

## Pages 失败时检查

先检查仓库 Settings → Pages 是否能选择 GitHub Actions，再检查账户套餐是否允许私有仓库 Pages，最后查看 `.github/workflows/deploy-pages.yml` 的失败步骤。当前已确认的唯一阻塞是私有仓库 Pages 套餐权限。
