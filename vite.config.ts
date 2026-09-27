import { defineConfig } from 'vite'
import uniExport from '@dcloudio/vite-plugin-uni'

// 当前 DCloud 包以 CJS 发布；Node 24 的 ESM 互操作会多包一层 default。
const uni = (uniExport as unknown as { default?: typeof uniExport }).default ?? uniExport

const base = process.env.GITHUB_ACTIONS === 'true' ? '/protein-calculator/' : '/'

export default defineConfig({
  // GitHub Pages 项目站点部署在固定子路径；本地开发与预览仍使用根路径。
  base,
  plugins: [
    uni(),
    {
      name: 'local-favicon',
      transformIndexHtml: {
        order: 'post',
        handler() {
          return [{ tag: 'link', attrs: { rel: 'icon', href: `${base}static/food-icons/plant.svg` }, injectTo: 'head' }]
        },
      },
    },
  ],
})
