import { createApp } from 'vue'
import App from './App'
import router from './router'
import { store } from './store'
import { ContextMenu } from '@imengyu/vue3-context-menu'
createApp(App)
  .component('ContextMenu', ContextMenu)
  .use(router)
  .use(store)
  .mount('#app')
