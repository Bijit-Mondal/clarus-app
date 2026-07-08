import type { RouteComponent } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import {
  appModules,
  getModulePagePath,
  getPageRouteName,
} from '@/config/navigation'

const placeholderPage = () => import('@/views/dashboard/DashboardPage.vue')

/** Pages with a real, built-out view. Everything else falls back to the shell placeholder. */
const pageComponents: Record<string, () => Promise<RouteComponent>> = {
  'controls-overview': () => import('@/views/controls/ControlsOverview.vue'),
  'controls-frameworks': () => import('@/views/controls/FrameworksPage.vue'),
}

const dashboardChildren = appModules.flatMap((module) =>
  module.pages.map((page) => {
    const name = getPageRouteName(module.id, page.id)
    return {
      path: `${module.id}/${page.id}`,
      name,
      component: pageComponents[name] ?? placeholderPage,
      meta: {
        module: module.id,
        page: page.id,
        title: page.label,
        description: page.description,
      },
    }
  }),
)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/views/auth/LoginChoice.vue'),
    },
    {
      path: '/login/sso',
      component: () => import('@/views/auth/LoginSso.vue'),
    },
    {
      path: '/login/email',
      component: () => import('@/views/auth/LoginEmail.vue'),
    },
    {
      path: '/register',
      component: () => import('@/views/auth/RegisterPage.vue'),
    },
    {
      path: '/orgs',
      component: () => import('@/views/orgs/SelectOrg.vue'),
    },
    {
      path: '/dashboard',
      component: () => import('@/layouts/DashboardLayout.vue'),
      children: [
        {
          path: '',
          redirect: { name: getPageRouteName('controls', 'overview') },
        },
        ...dashboardChildren,
      ],
    },
  ],
})

export default router
