import { computed, type Ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  getTenantControls,
  getTenantControl,
  searchTenantControls,
  getControlRequirements,
  updateTenantControl,
  type UpdateTenantControlInput,
  linkControlRequirement,
  type LinkControlRequirementInput,
  unlinkControlRequirement,
} from '@/api/controls'
import { useOrganizationStore } from '@/stores/organization'

export const controlKeys = {
  all: ['controls'] as const,
  list: (tenantId: string, limit: number, offset: number) =>
    [...controlKeys.all, tenantId, { limit, offset }] as const,
  detail: (tenantId: string, controlKey: string) =>
    [...controlKeys.all, 'detail', tenantId, controlKey] as const,
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

export function useTenantControlQuery(controlKey: Ref<string> | Ref<string | undefined> | string) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const controlKeyVal = computed(() => {
    return typeof controlKey === 'string' ? controlKey : controlKey.value
  })

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      return controlKeys.detail(tId, controlKeyVal.value || '')
    }),
    queryFn: () => getTenantControl(tenantId.value!, controlKeyVal.value!),
    enabled: computed(() => !!tenantId.value && !!controlKeyVal.value),
    staleTime: 300_000,
  })
}

export function useTenantControlSearchQuery(query: Ref<string>, enabled: Ref<boolean>, limit = 10) {
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
    staleTime: 300_000,
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

export function useLinkControlRequirementMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: ({
      tenantControlId,
      input,
    }: {
      tenantControlId: string
      input: LinkControlRequirementInput
    }) => linkControlRequirement(tenantId.value!, tenantControlId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: controlKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['frameworks', 'requirement-controls'] })
    },
  })
}

export function useUnlinkControlRequirementMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: ({
      tenantControlId,
      tenantRequirementAssessmentId,
    }: {
      tenantControlId: string
      tenantRequirementAssessmentId: string
    }) => unlinkControlRequirement(tenantId.value!, tenantControlId, tenantRequirementAssessmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: controlKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['frameworks', 'requirement-controls'] })
    },
  })
}
