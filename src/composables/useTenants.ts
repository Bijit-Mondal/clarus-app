import { computed, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { createTenant, getTenants, type CreateTenantInput } from '@/api/tenants'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'

export const tenantKeys = {
  all: ['tenants'] as const,
}

export function useTenantsQuery() {
  const authStore = useAuthStore()
  const organizationStore = useOrganizationStore()
  const query = useQuery({
    queryKey: tenantKeys.all,
    queryFn: getTenants,
    enabled: computed(() => authStore.isAuthenticated),
  })

  watch(
    query.data,
    (tenants) => {
      if (tenants) organizationStore.setOrganizations(tenants)
    },
    { immediate: true },
  )

  return query
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
