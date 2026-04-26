import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import i18n from './i18n'
import './styles/variables.css'
import './styles/dark.css'
import './styles/element-overrides.css'
import './styles/global.css'

// 创建 Vue 应用实例
const app = createApp(App)
const pinia = createPinia()

// 注册插件(顺序重要:Pinia -> i18n -> ElementPlus)
app.use(pinia) // 状态管理
app.use(i18n) // 国际化
app.use(ElementPlus) // UI 组件库

// 挂载到 #app 元素
app.mount('#app')
