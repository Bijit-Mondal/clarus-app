import { computed, type MaybeRefOrGetter, type Ref, toValue } from 'vue'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  adoptFramework,
  getFrameworkReleases,
  getFrameworks,
  getRequirementControls,
  getTenantFrameworkRequirements,
  getTenantFrameworks,
  searchTenantRequirements,
  type AdoptFrameworkInput,
} from '@/api/frameworks'
import { useOrganizationStore } from '@/stores/organization'

export const frameworkKeys = {
  all: ['frameworks'] as const,
  catalog: () => [...frameworkKeys.all, 'catalog'] as const,
  releases: (frameworkId: string) => [...frameworkKeys.all, 'releases', frameworkId] as const,
  tenant: (tenantId: string) => [...frameworkKeys.all, 'tenant', tenantId] as const,
  requirements: (tenantId: string, tenantFrameworkId: string, selectedAssessmentId: string) =>
    [
      ...frameworkKeys.all,
      'requirements',
      tenantId,
      tenantFrameworkId,
      { selectedAssessmentId },
    ] as const,
  requirementControls: (tenantId: string, tenantFrameworkId: string, requirementId: string) =>
    [
      ...frameworkKeys.all,
      'requirement-controls',
      tenantId,
      tenantFrameworkId,
      requirementId,
    ] as const,
  searchRequirements: (tenantId: string, query: string, limit: number) =>
    [...frameworkKeys.all, 'search-requirements', tenantId, { query, limit }] as const,
}

function useFrameworkTenantId() {
  const organizationStore = useOrganizationStore()
  return computed(() => organizationStore.activeOrganization?.id)
}

export function useTenantFrameworksQuery() {
  const tenantId = useFrameworkTenantId()

  return useQuery({
    queryKey: computed(() => frameworkKeys.tenant(tenantId.value || '')),
    queryFn: () => getTenantFrameworks(tenantId.value!),
    enabled: computed(() => !!tenantId.value),
  })
}

export function useFrameworksCatalogQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: frameworkKeys.catalog(),
    queryFn: getFrameworks,
    enabled: computed(() => toValue(enabled)),
  })
}

export function useFrameworkReleasesQuery(frameworkId: MaybeRefOrGetter<string | undefined>) {
  return useQuery({
    queryKey: computed(() => frameworkKeys.releases(toValue(frameworkId) || '')),
    queryFn: () => getFrameworkReleases(toValue(frameworkId)!),
    enabled: computed(() => !!toValue(frameworkId)),
  })
}

export function useAdoptFrameworkMutation() {
  const queryClient = useQueryClient()
  const tenantId = useFrameworkTenantId()

  return useMutation({
    mutationFn: (input: AdoptFrameworkInput) => {
      if (!tenantId.value) throw new Error('No active tenant')
      return adoptFramework(tenantId.value, input)
    },
    onSuccess: async () => {
      if (tenantId.value) {
        await queryClient.invalidateQueries({
          queryKey: frameworkKeys.tenant(tenantId.value),
        })
      }
    },
  })
}

const REQUIREMENTS_PAGE_SIZE = 20

export function useTenantRequirementSearchQuery(
  query: Ref<string>,
  enabled: Ref<boolean>,
  limit = 20,
) {
  const tenantId = useFrameworkTenantId()

  return useQuery({
    queryKey: computed(() =>
      frameworkKeys.searchRequirements(tenantId.value || '', query.value, limit),
    ),
    queryFn: () => searchTenantRequirements(tenantId.value!, query.value, limit),
    enabled: computed(() => !!tenantId.value && enabled.value && query.value.trim().length > 0),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  })
}

export function useTenantFrameworkRequirementsQuery(
  tenantFrameworkId: MaybeRefOrGetter<string | undefined>,
  selectedAssessmentId: MaybeRefOrGetter<string | undefined> = '',
) {
  const tenantId = useFrameworkTenantId()

  return useInfiniteQuery({
    queryKey: computed(() =>
      frameworkKeys.requirements(
        tenantId.value || '',
        toValue(tenantFrameworkId) || '',
        toValue(selectedAssessmentId) || '',
      ),
    ),
    queryFn: ({ pageParam }) =>
      getTenantFrameworkRequirements(tenantId.value!, toValue(tenantFrameworkId)!, {
        limit: REQUIREMENTS_PAGE_SIZE,
        offset: pageParam,
        selectedAssessmentId: toValue(selectedAssessmentId) || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + lastPage.tenantRequirementAssessments.length
      return nextOffset < lastPage.total ? nextOffset : undefined
    },
    enabled: computed(() => !!tenantId.value && !!toValue(tenantFrameworkId)),
  })
}

export function useRequirementControlsQuery(
  tenantFrameworkId: MaybeRefOrGetter<string | undefined>,
  requirementId: MaybeRefOrGetter<string | undefined>,
) {
  const tenantId = useFrameworkTenantId()

  return useQuery({
    queryKey: computed(() =>
      frameworkKeys.requirementControls(
        tenantId.value || '',
        toValue(tenantFrameworkId) || '',
        toValue(requirementId) || '',
      ),
    ),
    queryFn: () =>
      getRequirementControls(tenantId.value!, toValue(tenantFrameworkId)!, toValue(requirementId)!),
    enabled: computed(
      () => !!tenantId.value && !!toValue(tenantFrameworkId) && !!toValue(requirementId),
    ),
  })
}
