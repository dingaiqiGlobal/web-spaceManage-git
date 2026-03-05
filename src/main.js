/*
 * @Author: dys
 * @Date: 2025-12-09 09:31:51
 * @LastEditors: dys
 * @LastEditTime: 2025-12-09 15:00:25
 * @Descripttion:
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'cesium/Build/Cesium/Widgets/widgets.css'

import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import ElementPlusIcons from '@/plugins/icons'
import './style/style.less'
import './style/ele.dark.style.css'
import './style/theme/dark.less'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.use(ElementPlusIcons)

app.mount('#app')
