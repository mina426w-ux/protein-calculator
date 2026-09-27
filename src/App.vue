<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  console.info('蛋白质计算器已启动')
})
</script>

<style>
page {
  min-height: 100%;
  background: #f3f6f8;
  color: #17313a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
}

button::after {
  border: 0;
}
</style>
