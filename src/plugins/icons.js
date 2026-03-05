/**
 * Element Plus 图标全局注册插件
 * 使用：app.use(ElementPlusIcons)
 * 注册后可在模板中直接使用 <el-icon-Plus /> / <el-icon-Delete /> 等
 */
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

export default {
  install(app) {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(`ElIcon${key}`, component)
    }
  },
}
