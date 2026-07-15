<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhClipboardText, PhFileText, PhGavel, PhShieldCheck } from '@phosphor-icons/vue'
import type { TenantRequirementAssessment } from '@/api/frameworks'
import {
  useRequirementControlsQuery,
  useTenantFrameworkRequirementsQuery,
} from '@/composables/useFrameworks'
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

function goBack() {
  router.back()
}

const requirementsQuery = useTenantFrameworkRequirementsQuery(frameworkId)

const mapAssessmentToRequirement = (assessment: TenantRequirementAssessment): Requirement => {
  const code = assessment.frameworkNode?.externalId || ''
  const match = code.trim().match(/^[A-Za-z]+/)
  const prefix = match ? match[0].toUpperCase() : 'GENERAL'

  let category = 'Requirements'
  if (prefix === 'PR' || prefix === 'P') category = 'Privacy'
  else if (prefix === 'DS') category = 'Data Security'
  else if (prefix === 'CC') category = 'Common Criteria'
  else if (prefix === 'A') category = 'Availability'
  else if (prefix === 'C') category = 'Confidentiality'
  else if (prefix) {
    category = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase()
  }

  return {
    id: assessment.$id,
    code,
    title: assessment.frameworkNode?.title || '',
    description: assessment.frameworkNode?.description || '',
    bestPractice: false,
    maturityLevel: assessment.status ? assessment.status.replace('_', ' ') : 'not started',
    category,
  }
}

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
    const qId = route.query.selectedId as string
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
  () => route.query.selectedId,
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

const currentLinkedItems = computed(() => {
  const reqId = selectedId.value
  if (!reqId) {
    return { controls: [], documents: [], audits: [], obligations: [] }
  }
  const item = linkedItems.value[reqId]
  return {
    controls: mappedControls.value,
    documents: item?.documents ?? [],
    audits: item?.audits ?? [],
    obligations: item?.obligations ?? [],
  }
})

const activeLinkSectionId = ref<LinkSectionId | null>(null)

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

function allItemsForSection(_sectionId: LinkSectionId): LinkItem[] {
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
            @open-link-dialog="(sectionId) => (activeLinkSectionId = sectionId)"
            @retry-controls="fetchControls"
            @unlink-item="handleUnlinkItem"
            @click-control="goToControlDetail"
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
      @close="activeLinkSectionId = null"
      @link="handleLinkItem"
    />
  </div>
</template>
