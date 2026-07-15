import { computed, type Ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  getTenantControls,
  searchTenantControls,
  getControlRequirements,
  updateTenantControl,
  type UpdateTenantControlInput,
} from '@/api/controls'
import { useOrganizationStore } from '@/stores/organization'

export const controlKeys = {
  all: ['controls'] as const,
  list: (tenantId: string, limit: number, offset: number) =>
    [...controlKeys.all, tenantId, { limit, offset }] as const,
  requirements: (tenantId: string, controlKey: string) =>
    [...controlKeys.all, 'requirements', tenantId, controlKey] as const,
  search: (tenantId: string, query: string, limit: number) =>
    [...controlKeys.all, 'search', tenantId, { query, limit }] as const,
}

export function useTenantControlsQuery(limit: Ref<number>, offset: Ref<number>) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      return controlKeys.list(tId, limit.value, offset.value)
    }),
    queryFn: () => getTenantControls(tenantId.value!, { limit: limit.value, offset: offset.value }),
    enabled: computed(() => !!tenantId.value),
  })
}

export function useTenantControlSearchQuery(
  query: Ref<string>,
  enabled: Ref<boolean>,
  limit = 10,
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useQuery({
    queryKey: computed(() => controlKeys.search(tenantId.value || '', query.value, limit)),
    queryFn: () => searchTenantControls(tenantId.value!, query.value, limit),
    enabled: computed(() => !!tenantId.value && enabled.value && query.value.trim().length > 0),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  })
}

export function useControlRequirementsQuery(controlKey: Ref<string>) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      return controlKeys.requirements(tId, controlKey.value)
    }),
    queryFn: () => getControlRequirements(tenantId.value!, controlKey.value),
    enabled: computed(() => !!tenantId.value && !!controlKey.value),
  })
}

export function useUpdateTenantControlMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: ({
      tenantControlId,
      updates,
    }: {
      tenantControlId: string
      updates: UpdateTenantControlInput
    }) => updateTenantControl(tenantId.value!, tenantControlId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: controlKeys.all })
    },
  })
}
