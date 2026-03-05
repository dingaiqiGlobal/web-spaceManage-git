import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_APP_BASE),
  routes: [
    {
      path: '/',
      component: () => import('../views/Navigation.vue'),
      redirect: '/gridZone', // 默认跳转空域划设
      children: [
        {
          name: 'gridZone',
          path: 'gridZone',
          component: () => import('../views/gridZone/index.vue'),
          meta: { title: '空域划设' },
        },
        {
          name: 'gridPlan',
          path: 'gridPlan',
          component: () => import('../views/gridPlan/index.vue'),
          meta: { title: '用空计划' },
        },
      ],
    },
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title || '低空空域管理'
})

export default router
