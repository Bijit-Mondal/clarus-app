import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentTenant } from '@/api/tenants'
import { getApiErrorStatus } from '@/lib/api'
import { queryClient } from '@/lib/query-client'
import { useOrganizationStore } from '@/stores/organization'

type AuthStatus = 'unknown' | 'checking' | 'authenticated' | 'unauthenticated'

export const useAuthStore = defineStore('auth', () => {
  const status = ref<AuthStatus>('unknown')
  const isAuthenticated = computed(() => status.value === 'authenticated')

  function markAuthenticated() {
    status.value = 'authenticated'
  }

  function markUnauthenticated() {
    status.value = 'unauthenticated'
  }

  async function ensureSession() {
    if (status.value === 'authenticated') return true
    if (status.value === 'unauthenticated') return false
    if (status.value === 'checking') return false

    status.value = 'checking'
    try {
      const organizationStore = useOrganizationStore()
      const activeTenantId = organizationStore.activeOrgId
      if (!activeTenantId) {
        markUnauthenticated()
        return false
      }

      const currentTenant = await getCurrentTenant(activeTenantId)
      if (currentTenant) {
        organizationStore.setOrganizations([currentTenant])
        queryClient.setQueryData(['tenants'], [currentTenant])
      }

      markAuthenticated()
      return true
    } catch (error: unknown) {
      if (getApiErrorStatus(error) === 401 || getApiErrorStatus(error) === 403) {
        markUnauthenticated()
        return false
      }

      markUnauthenticated()
      return false
    }
  }

  return { status, isAuthenticated, markAuthenticated, markUnauthenticated, ensureSession }
})
