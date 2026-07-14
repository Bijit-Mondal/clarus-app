import type { NavigationGuard } from 'vue-router'
import { getOrganizationDashboardPath } from '@/config/navigation'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'

export const authMiddleware: NavigationGuard = async (to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth === true)

  if (requiresAuth && !(await authStore.ensureSession())) {
    return {
      path: '/',
      query: { redirect: to.fullPath },
    }
  }

  const organizationSlug = to.params.organizationSlug
  if (requiresAuth && typeof organizationSlug === 'string') {
    const organizationStore = useOrganizationStore()
    const organization = organizationStore.organizations.find(
      (candidate) => candidate.slug === organizationSlug,
    )

    if (!organization) return { name: 'organizations' }
    organizationStore.selectOrganization(organization.id)
  }

  const isAuthPage = to.matched.some((record) => record.meta.guestOnly === true)
  if (isAuthPage) {
    const isAuthenticated = authStore.isAuthenticated || (await authStore.ensureSession())
    if (isAuthenticated) {
      const activeOrganization = useOrganizationStore().activeOrganization
      return activeOrganization
        ? { path: getOrganizationDashboardPath(activeOrganization.slug) }
        : { name: 'organizations' }
    }
  }

  return true
}
