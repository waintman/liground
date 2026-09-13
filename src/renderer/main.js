import { createApp } from 'vue'
import App from './App'
import router from './router'
import { store } from './store'
import { ContextMenu } from '@imengyu/vue3-context-menu'
const { clipboard, shell } = require('electron')
const app = createApp(App)
app.config.globalProperties.$electron = { clipboard, shell }
app.component('ContextMenu', ContextMenu)
  .use(router)
  .use(store)
  .mount('#app')
