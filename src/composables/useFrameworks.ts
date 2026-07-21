import { computed, type MaybeRefOrGetter, type Ref, toValue } from 'vue'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/vue-query'
import {
  adoptFramework,
  getFrameworkReleases,
  getFrameworks,
  getRequirementControls,
  getRequirementDocuments,
  getTenantFrameworkRequirements,
  getTenantFrameworks,
  searchTenantRequirements,
  updateTenantRequirementAssessment,
  type AdoptFrameworkInput,
  type TenantFrameworkRequirementsResponse,
  type UpdateTenantRequirementAssessmentInput,
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
  requirementDocuments: (tenantId: string, tenantFrameworkId: string, requirementId: string) =>
    [
      ...frameworkKeys.all,
      'requirement-documents',
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

export function useRequirementDocumentsQuery(
  tenantFrameworkId: MaybeRefOrGetter<string | undefined>,
  requirementId: MaybeRefOrGetter<string | undefined>,
) {
  const tenantId = useFrameworkTenantId()

  return useQuery({
    queryKey: computed(() =>
      frameworkKeys.requirementDocuments(
        tenantId.value || '',
        toValue(tenantFrameworkId) || '',
        toValue(requirementId) || '',
      ),
    ),
    queryFn: () =>
      getRequirementDocuments(
        tenantId.value!,
        toValue(tenantFrameworkId)!,
        toValue(requirementId)!,
      ),
    enabled: computed(
      () => !!tenantId.value && !!toValue(tenantFrameworkId) && !!toValue(requirementId),
    ),
    staleTime: 300_000,
  })
}

export function useUpdateTenantRequirementAssessmentMutation() {
  const queryClient = useQueryClient()
  const tenantId = useFrameworkTenantId()

  return useMutation({
    mutationFn: ({
      tenantFrameworkId,
      tenantRequirementAssessmentId,
      input,
    }: {
      tenantFrameworkId: string
      tenantRequirementAssessmentId: string
      input: UpdateTenantRequirementAssessmentInput
    }) => {
      if (!tenantId.value) throw new Error('No active tenant')
      return updateTenantRequirementAssessment(
        tenantId.value,
        tenantFrameworkId,
        tenantRequirementAssessmentId,
        input,
      )
    },
    onSuccess: (updated, variables) => {
      if (!tenantId.value) return

      queryClient.setQueriesData<InfiniteData<TenantFrameworkRequirementsResponse>>(
        {
          queryKey: [
            ...frameworkKeys.all,
            'requirements',
            tenantId.value,
            variables.tenantFrameworkId,
          ],
        },
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              tenantRequirementAssessments: page.tenantRequirementAssessments.map((assessment) =>
                assessment.$id === updated.$id ? updated : assessment,
              ),
            })),
          }
        },
      )

      void queryClient.invalidateQueries({
        queryKey: [...frameworkKeys.all, 'search-requirements', tenantId.value],
      })
    },
  })
}
