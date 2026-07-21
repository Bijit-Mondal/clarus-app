import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getTenantContexts, updateTenantContext } from '@/api/contexts'
import { useOrganizationStore } from '@/stores/organization'

export const tenantContextKeys = {
  all: ['tenant-contexts'] as const,
  list: (tenantId: string) => [...tenantContextKeys.all, 'list', tenantId] as const,
  detail: (tenantId: string, section: string) =>
    [...tenantContextKeys.all, 'detail', tenantId, section] as const,
}

export function useTenantContextsQuery() {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useQuery({
    queryKey: computed(() => tenantContextKeys.list(tenantId.value || '')),
    queryFn: () => getTenantContexts(tenantId.value!),
    enabled: computed(() => !!tenantId.value),
  })
}

export function useUpdateTenantContextMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: ({ section, content }: { section: string; content: string }) =>
      updateTenantContext(tenantId.value!, section, content),
    onSuccess: (data, variables) => {
      // Invalidate list
      queryClient.invalidateQueries({
        queryKey: tenantContextKeys.list(tenantId.value || ''),
      })
      // Invalidate specific detail if it exists
      queryClient.invalidateQueries({
        queryKey: tenantContextKeys.detail(tenantId.value || '', variables.section),
      })
    },
  })
}
