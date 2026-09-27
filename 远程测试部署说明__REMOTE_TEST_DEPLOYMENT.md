# 蛋白质计算器｜远程测试部署说明

## 仓库

- 名称：`mina426w-ux/protein-calculator`
- 地址：`https://github.com/mina426w-ux/protein-calculator`
- 默认分支：`main`
- 当前可见性：`PUBLIC`

## 固定测试网址

- 固定地址：`https://mina426w-ux.github.io/protein-calculator/`
- 当前状态：已发布，强制 HTTPS；由 GitHub Pages 提供公网访问。

## 部署方式

推送 `main` 后，由 `.github/workflows/deploy-pages.yml` 自动执行类型检查、单元测试、H5 构建并尝试发布 GitHub Pages。H5 使用 `/protein-calculator/` 固定子路径。

## 如何更新

在现有项目提交并推送到 `main`，同一 Workflow 会更新同一固定网址；不需要手工上传 `dist`。

## 如何验证

检查 GitHub Actions 的 `Deploy GitHub Pages` 运行结论，然后访问固定网址，确认 HTTP 200、首页、JS、CSS、本地图标、搜索、计算、刷新持久化和控制台错误。

## 数据边界

数据只保存在各浏览器的本地存储中，不跨设备同步。Windows、Mac、iPhone 和 iPad 各自拥有独立数据；本任务不增加账号、后端或云数据库。

## Pages 失败时检查

先检查仓库 Settings → Pages 的发布源是否为 GitHub Actions，再检查 Actions 中的类型检查、测试、构建、artifact 和 deploy 步骤，最后确认 `vite.config.ts` 的 `/protein-calculator/` 子路径配置。
