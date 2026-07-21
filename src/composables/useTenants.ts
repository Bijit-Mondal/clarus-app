import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  createTenant,
  getCurrentTenant,
  getTenants,
  getTenantUsers,
  getComplianceOverview,
  type CreateTenantInput,
} from '@/api/tenants'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'

export const tenantKeys = {
  all: ['tenants'] as const,
  current: (tenantId: string) => [...tenantKeys.all, 'current', tenantId] as const,
  complianceOverview: (tenantId: string) => [...tenantKeys.all, 'compliance-overview', tenantId] as const,
}

/** Fetch the current tenant outside of component setup (e.g. auth router guards). */
export function fetchCurrentTenant(tenantId: string) {
  return queryClient.fetchQuery({
    queryKey: tenantKeys.current(tenantId),
    queryFn: () => getCurrentTenant(tenantId),
  })
}

export function useTenantsQuery() {
  const authStore = useAuthStore()
  const organizationStore = useOrganizationStore()
  const shouldLoad = ref(false)
  const query = useQuery({
    queryKey: tenantKeys.all,
    queryFn: getTenants,
    enabled: computed(() => authStore.isAuthenticated && shouldLoad.value),
  })

  watch(
    query.data,
    (tenants) => {
      if (tenants) organizationStore.setOrganizations(tenants)
    },
    { immediate: true },
  )

  function loadTenants() {
    shouldLoad.value = true
    return query.refetch()
  }

  return { ...query, loadTenants }
}

export function useCreateTenantMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()

  return useMutation({
    mutationFn: (input: CreateTenantInput) => createTenant(input),
    onSuccess: async (tenant) => {
      await queryClient.invalidateQueries({ queryKey: tenantKeys.all })
      if (tenant) organizationStore.addOrganization(tenant)
    },
  })
}

export const tenantUserKeys = {
  all: ['tenant-users'] as const,
  list: (tenantId: string) => [...tenantUserKeys.all, tenantId] as const,
}

export function useTenantUsersQuery() {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      return tenantUserKeys.list(tId)
    }),
    queryFn: () => getTenantUsers(tenantId.value!),
    enabled: computed(() => !!tenantId.value),
  })
}

export function useComplianceOverviewQuery() {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useQuery({
    queryKey: computed(() => tenantKeys.complianceOverview(tenantId.value || '')),
    queryFn: () => getComplianceOverview(tenantId.value!),
    enabled: computed(() => !!tenantId.value),
  })
}

