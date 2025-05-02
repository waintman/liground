import { createWebHashHistory, createRouter } from 'vue-router'

const routes = [
  {
    path: '/',
    component: require('@/components/LandingPage').default
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
