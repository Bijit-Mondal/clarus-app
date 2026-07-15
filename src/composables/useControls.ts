import { computed, type Ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  getTenantControls,
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
