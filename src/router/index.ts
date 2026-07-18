import type { RouteComponent } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { appModules, getPageRouteName } from '@/config/navigation'
import { authMiddleware } from '@/router/guards/auth'

const placeholderPage = () => import('@/views/dashboard/DashboardPage.vue')

/** Pages with a real, built-out view. Everything else falls back to the shell placeholder. */
const pageComponents: Record<string, () => Promise<RouteComponent>> = {
  'compliance-overview': () => import('@/views/compliance/ComplianceOverview.vue'),
  'compliance-controls': () => import('@/views/compliance/ControlsPage.vue'),
  'compliance-frameworks': () => import('@/views/compliance/FrameworksPage.vue'),
  'compliance-framework-requirements': () =>
    import('@/views/compliance/FrameworkRequirementsPage.vue'),
  'compliance-evidence': () => import('@/views/compliance/EvidencePage.vue'),
  'compliance-documents': () => import('@/views/compliance/DocumentsPage.vue'),
  'settings-profile': () => import('@/views/settings/ProfileSettings.vue'),
  'settings-account': () => import('@/views/settings/AccountSettings.vue'),
  'workspace-team': () => import('@/views/workspace/TeamPage.vue'),
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
      name: 'login',
      component: () => import('@/views/auth/LoginChoice.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/login/sso',
      name: 'login-sso',
      component: () => import('@/views/auth/LoginSso.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/login/email',
      name: 'login-email',
      component: () => import('@/views/auth/LoginEmail.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/orgs',
      name: 'organizations',
      component: () => import('@/views/orgs/SelectOrg.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      redirect: '/orgs',
    },
    {
      path: '/:organizationSlug/dashboard',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: (to) => ({
            name: getPageRouteName('compliance', 'overview'),
            params: { organizationSlug: to.params.organizationSlug },
          }),
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: () => import('@/views/notifications/NotificationsPage.vue'),
          meta: {
            title: 'Notifications',
            description: 'All system notifications, requests, alerts, and audit updates.',
          },
        },
        ...dashboardChildren,
        {
          path: 'compliance/frameworks/:frameworkId/requirements',
          name: 'compliance-framework-requirements',
          component: pageComponents['compliance-framework-requirements']!,
          meta: {
            module: 'compliance',
            title: 'Requirements',
          },
        },
        {
          path: 'compliance/controls/:controlId',
          name: 'compliance-control-detail',
          component: () => import('@/views/compliance/ControlDetailPage.vue'),
          meta: {
            module: 'compliance',
            title: 'Control Details',
          },
        },
        {
          path: 'compliance/tasks/:taskId',
          name: 'compliance-task-detail',
          component: () => import('@/views/compliance/TaskDetailPage.vue'),
          meta: {
            module: 'compliance',
            title: 'Task Details',
          },
        },
        {
          path: 'compliance/documents/:documentId',
          name: 'compliance-document-detail',
          component: () => import('@/views/compliance/DocumentDetailPage.vue'),
          meta: {
            module: 'compliance',
            title: 'Document Details',
          },
        },
      ],
    },
  ],
})

router.beforeEach(authMiddleware)

export default router
