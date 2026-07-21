<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounce } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { PhClipboardText, PhFileText, PhGavel, PhShieldCheck } from '@phosphor-icons/vue'
import type { TenantRequirementAssessment } from '@/api/frameworks'
import {
  useRequirementControlsQuery,
  useRequirementDocumentsQuery,
  useTenantFrameworkRequirementsQuery,
} from '@/composables/useFrameworks'
import {
  useTenantControlSearchQuery,
  useLinkControlRequirementMutation,
  useUnlinkControlRequirementMutation,
} from '@/composables/useControls'
import { normalizeVersionStatus } from '@/composables/useDocuments'
import { getApiErrorMessage } from '@/lib/api'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import FrameworkHeader from '@/components/compliance/FrameworkHeader.vue'
import RequirementSidebar from '@/components/compliance/RequirementSidebar.vue'
import RequirementInfo from '@/components/compliance/RequirementInfo.vue'
import RequirementLinkedItems from '@/components/compliance/RequirementLinkedItems.vue'
import LinkItemDialog from '@/components/compliance/LinkItemDialog.vue'
import type { Requirement, LinkItem, LinkSectionId } from '@/components/compliance/types'

const route = useRoute()
const router = useRouter()

const frameworkId = computed(() => route.params.frameworkId as string)
const frameworkName = computed(() => (route.query.name as string) || 'Framework')
const frameworkPublisher = computed(() => (route.query.publisher as string) || '')
const selectedAssessmentId = computed(() =>
  typeof route.query.selectedAssessmentId === 'string' ? route.query.selectedAssessmentId : '',
)

function goBack() {
  router.back()
}

const requirementsQuery = useTenantFrameworkRequirementsQuery(frameworkId, selectedAssessmentId)

const mapAssessmentToRequirement = (assessment: TenantRequirementAssessment): Requirement => ({
  id: assessment.$id,
  code: assessment.frameworkNode?.externalId || '',
  title: assessment.frameworkNode?.title || '',
  description: assessment.frameworkNode?.description || '',
  maturityLevel: assessment.status ? assessment.status.replace(/_/g, ' ') : '',
})

const requirements = computed(() =>
  (requirementsQuery.data.value?.pages ?? []).flatMap((page) =>
    page.tenantRequirementAssessments.map(mapAssessmentToRequirement),
  ),
)

const isInitialLoading = computed(
  () => requirementsQuery.isPending.value && requirements.value.length === 0,
)
const isLoadingMore = computed(() => requirementsQuery.isFetchingNextPage.value)
const isError = computed(() =>
  requirementsQuery.error.value
    ? getApiErrorMessage(requirementsQuery.error.value, 'Failed to load requirements.')
    : '',
)
const hasMore = computed(() => !!requirementsQuery.hasNextPage.value)

const selectedId = ref<string>('')

const selectedRequirement = computed(
  () => requirements.value.find((r) => r.id === selectedId.value) ?? requirements.value[0],
)

async function loadNextPage() {
  if (!requirementsQuery.hasNextPage.value || requirementsQuery.isFetchingNextPage.value) return
  await requirementsQuery.fetchNextPage()
}

function retryRequirements() {
  void requirementsQuery.refetch()
}

watch(
  requirements,
  (list) => {
    if (list.length === 0 || selectedId.value) return
    const qId = selectedAssessmentId.value
    if (qId && list.some((r) => r.id === qId)) {
      selectedId.value = qId
    } else {
      selectedId.value = list[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(
  () => [frameworkId.value],
  () => {
    selectedId.value = ''
  },
)

watch(
  () => selectedAssessmentId.value,
  (newVal) => {
    if (newVal && typeof newVal === 'string' && requirements.value.some((r) => r.id === newVal)) {
      selectedId.value = newVal
    }
  },
)

type LinkedState = Record<string, Record<LinkSectionId, LinkItem[]>>

const linkedItems = ref<LinkedState>({})

const requirementControlsQuery = useRequirementControlsQuery(frameworkId, selectedId)

const mappedControls = computed<LinkItem[]>(() =>
  (requirementControlsQuery.data.value?.tenantRequirementControlMaps ?? []).map((m) => {
    const tc = m.tenantControl
    return {
      id: tc.$id,
      name: tc.name,
      state: tc.implementationStatus
        ? tc.implementationStatus
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : 'Not Started',
      controlKey: tc.controlKey,
      coverage: m.coverage,
      rationale: m.rationale,
      statement: tc.statement,
      implementationStatus: tc.implementationStatus,
    }
  }),
)

const isControlsLoading = computed(() => requirementControlsQuery.isPending.value)
const controlsError = computed(() =>
  requirementControlsQuery.error.value
    ? getApiErrorMessage(requirementControlsQuery.error.value, 'Failed to load controls.')
    : '',
)

function fetchControls() {
  void requirementControlsQuery.refetch()
}

const requirementDocumentsQuery = useRequirementDocumentsQuery(frameworkId, selectedId)

function getDocTypeLabel(docType: string) {
  if (docType === 'policy') return 'Policy'
  if (docType === 'procedure') return 'Procedure'
  if (docType === 'sop') return 'SOP'
  return docType.charAt(0).toUpperCase() + docType.slice(1)
}

const mappedDocuments = computed<LinkItem[]>(() =>
  (requirementDocumentsQuery.data.value?.documents ?? []).map((doc) => {
    const status = normalizeVersionStatus(doc.versionStatus || 'draft')
    return {
      id: doc.$id,
      name: doc.title,
      type: getDocTypeLabel(doc.documentType),
      state:
        status === 'approved'
          ? 'Approved'
          : status === 'in-review'
            ? 'In Review'
            : status === 'rejected'
              ? 'Rejected'
              : 'Draft',
    }
  }),
)

const isDocumentsLoading = computed(() => requirementDocumentsQuery.isPending.value)
const documentsError = computed(() =>
  requirementDocumentsQuery.error.value
    ? getApiErrorMessage(requirementDocumentsQuery.error.value, 'Failed to load documents.')
    : '',
)

function fetchDocuments() {
  void requirementDocumentsQuery.refetch()
}

const currentLinkedItems = computed(() => {
  const reqId = selectedId.value
  if (!reqId) {
    return { controls: [], documents: [], audits: [], obligations: [] }
  }
  const item = linkedItems.value[reqId]
  return {
    controls: mappedControls.value,
    documents: mappedDocuments.value,
    audits: item?.audits ?? [],
    obligations: item?.obligations ?? [],
  }
})

const activeLinkSectionId = ref<LinkSectionId | null>(null)
const controlSearchQuery = ref('')
const debouncedControlSearchQuery = useDebounce(controlSearchQuery, 300)
const controlSearchEnabled = computed(
  () => activeLinkSectionId.value === 'controls' && !!selectedId.value,
)
const controlSearch = useTenantControlSearchQuery(debouncedControlSearchQuery, controlSearchEnabled)
const linkControlRequirementMutation = useLinkControlRequirementMutation()
const unlinkControlRequirementMutation = useUnlinkControlRequirementMutation()

const searchedControls = computed<LinkItem[]>(() =>
  (controlSearch.data.value?.tenantControls ?? []).map((control) => ({
    id: control.tenantControlId,
    name: control.name,
    controlKey: control.controlKey,
    state: control.implementationStatus
      ? control.implementationStatus
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : 'Not Started',
    implementationStatus: control.implementationStatus,
  })),
)

const controlSearchError = computed(() =>
  controlSearch.error.value
    ? getApiErrorMessage(controlSearch.error.value, 'Failed to search controls.')
    : '',
)

const controlSearchLoading = computed(
  () => controlSearch.isPending.value || controlSearch.isFetching.value,
)

function handleLinkSearchQuery(query: string) {
  controlSearchQuery.value = query
}

const LINK_SECTIONS = [
  {
    id: 'controls' as const,
    label: 'Controls',
    icon: PhShieldCheck,
    searchPlaceholder: 'Search controls…',
    columns: ['Name', 'State'],
    emptyLabel: 'No controls linked',
  },
  {
    id: 'documents' as const,
    label: 'Documents',
    icon: PhFileText,
    searchPlaceholder: 'Search documents…',
    columns: ['Name', 'Type', 'State'],
    emptyLabel: 'No documents linked',
  },
  {
    id: 'audits' as const,
    label: 'Audits',
    icon: PhClipboardText,
    searchPlaceholder: 'Search audits…',
    columns: ['Name', 'State'],
    emptyLabel: 'No audits linked',
  },
  {
    id: 'obligations' as const,
    label: 'Obligations',
    icon: PhGavel,
    searchPlaceholder: 'Search obligations…',
    columns: ['Name', 'Area', 'Source', 'State'],
    emptyLabel: 'No obligations linked',
  },
]

const activeLinkSectionConfig = computed(() => {
  if (!activeLinkSectionId.value) return null
  return LINK_SECTIONS.find((s) => s.id === activeLinkSectionId.value) ?? null
})

function allItemsForSection(sectionId: LinkSectionId): LinkItem[] {
  if (sectionId === 'controls') {
    return controlSearchQuery.value.trim() ? searchedControls.value : mappedControls.value
  }
  return []
}

const currentLinkedItemIds = computed(() => {
  const section = activeLinkSectionId.value
  if (!section) return []
  return currentLinkedItems.value[section].map((i) => i.id)
})

function handleLinkItem(item: LinkItem) {
  if (!activeLinkSectionId.value || !selectedId.value) return
  const reqId = selectedId.value
  const section = activeLinkSectionId.value

  if (section === 'controls') {
    linkControlRequirementMutation.mutate(
      {
        tenantControlId: item.id,
        input: {
          tenantRequirementAssessmentId: reqId,
          coverage: 'full',
          rationale: 'This tenant control addresses the requirement.',
        },
      },
      {
        onSuccess: () => {
          activeLinkSectionId.value = null
        },
      },
    )
    return
  }

  // Documents are API-backed; linking is not supported until an endpoint exists
  if (section === 'documents') return

  if (!linkedItems.value[reqId]) {
    linkedItems.value[reqId] = { controls: [], documents: [], audits: [], obligations: [] }
  }
  const existing = linkedItems.value[reqId][section]
  const index = existing.findIndex((i) => i.id === item.id)
  if (index >= 0) {
    existing.splice(index, 1)
  } else {
    existing.push(item)
  }
}

function handleUnlinkItem(sectionId: LinkSectionId, item: LinkItem) {
  if (!selectedId.value) return
  const reqId = selectedId.value

  if (sectionId === 'controls') {
    unlinkControlRequirementMutation.mutate({
      tenantControlId: item.id,
      tenantRequirementAssessmentId: reqId,
    })
    return
  }

  // Documents are API-backed and read-only until an unlink endpoint exists
  if (sectionId === 'documents') return

  if (!linkedItems.value[reqId]) return
  const existing = linkedItems.value[reqId][sectionId]
  const index = existing.findIndex((i) => i.id === item.id)
  if (index >= 0) {
    existing.splice(index, 1)
  }
}

function goToControlDetail(item: LinkItem) {
  const controlIdVal = item.controlKey || item.id
  void router.push({
    name: 'compliance-control-detail',
    params: {
      organizationSlug: route.params.organizationSlug as string,
      controlId: controlIdVal,
    },
    state: {
      controlData: {
        controlKey: controlIdVal,
        name: item.name,
        implementationStatus: item.implementationStatus || 'not_started',
        statement: item.statement || '',
      },
    },
  })
}

function goToDocument(item: LinkItem) {
  void router.push({
    name: 'compliance-document-detail',
    params: {
      organizationSlug: route.params.organizationSlug as string,
      documentId: item.id,
    },
  })
}
</script>

<template>
  <div class="flex h-[calc(100dvh-3.5rem-4rem)] flex-col overflow-hidden">
    <FrameworkHeader :name="frameworkName" :publisher="frameworkPublisher" @back="goBack" />

    <div class="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
      <RequirementSidebar
        v-model:selectedId="selectedId"
        :requirements="requirements"
        :isLoading="isInitialLoading"
        :isLoadingMore="isLoadingMore"
        :isError="isError"
        :hasMore="hasMore"
        @load-more="loadNextPage"
        @try-again="retryRequirements"
      />

      <div class="clarus-scroll min-w-0 flex-1 overflow-y-auto bg-background">
        <ClarusLoadingState
          v-if="isInitialLoading"
          variant="requirements-detail"
          label="Loading requirement details"
        />
        <div v-else-if="selectedRequirement">
          <RequirementInfo :requirement="selectedRequirement" />
          <RequirementLinkedItems
            :requirementId="selectedId"
            :linkedItems="currentLinkedItems"
            :isLoadingControls="isControlsLoading"
            :controlsError="controlsError"
            :isLoadingDocuments="isDocumentsLoading"
            :documentsError="documentsError"
            @open-link-dialog="(sectionId) => (activeLinkSectionId = sectionId)"
            @retry-controls="fetchControls"
            @retry-documents="fetchDocuments"
            @unlink-item="handleUnlinkItem"
            @click-control="goToControlDetail"
            @click-document="goToDocument"
          />
        </div>
        <div
          v-else-if="!isError"
          class="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center"
        >
          <PhShieldCheck :size="32" class="mb-3 text-muted-foreground/30" aria-hidden="true" />
          <p class="text-sm font-medium text-foreground">No requirements in this framework yet</p>
          <p class="mt-1 max-w-sm text-xs text-muted-foreground">
            Requirements will appear here once they are available for this adopted framework.
          </p>
        </div>
      </div>
    </div>

    <LinkItemDialog
      :isOpen="!!activeLinkSectionId"
      :sectionId="activeLinkSectionId"
      :label="activeLinkSectionConfig?.label ?? ''"
      :icon="activeLinkSectionConfig?.icon"
      :searchPlaceholder="activeLinkSectionConfig?.searchPlaceholder ?? ''"
      :availableItems="activeLinkSectionId ? allItemsForSection(activeLinkSectionId) : []"
      :linkedItemIds="currentLinkedItemIds"
      :isLoading="activeLinkSectionId === 'controls' && controlSearchLoading"
      :error="activeLinkSectionId === 'controls' ? controlSearchError : ''"
      @close="activeLinkSectionId = null"
      @link="handleLinkItem"
      @search-query="handleLinkSearchQuery"
    />
  </div>
</template>
