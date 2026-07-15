<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhClipboardText, PhFileText, PhGavel, PhShieldCheck } from '@phosphor-icons/vue'
import { useOrganizationStore } from '@/stores/organization'
import {
  getTenantFrameworkRequirements,
  getRequirementControls,
  type TenantRequirementAssessment,
} from '@/api/frameworks'
import { getApiErrorMessage } from '@/lib/api'

// Import compliance components
import FrameworkHeader from '@/components/compliance/FrameworkHeader.vue'
import RequirementSidebar from '@/components/compliance/RequirementSidebar.vue'
import RequirementInfo from '@/components/compliance/RequirementInfo.vue'
import RequirementLinkedItems from '@/components/compliance/RequirementLinkedItems.vue'
import LinkItemDialog from '@/components/compliance/LinkItemDialog.vue'
import type { Requirement, LinkItem, LinkSectionId } from '@/components/compliance/types'

// ---------------------------------------------------------------------------
// Dummy data — swap with API calls when ready
// ---------------------------------------------------------------------------

const DUMMY_CONTROLS: LinkItem[] = [
  {
    id: 'ctrl-1',
    name: 'Access Control Policy',
    state: 'Implemented',
    controlKey: 'AC-1',
    coverage: 'full',
    rationale:
      'Specifies requirements for user access provisioning, modification, and termination.',
    statement:
      'Access control policies must be documented, reviewed annually, and enforced across all systems.',
    implementationStatus: 'implemented',
  },
  {
    id: 'ctrl-2',
    name: 'Password Management Procedure',
    state: 'In Progress',
    controlKey: 'AC-2',
    coverage: 'partial',
    rationale:
      'Covers user credential requirements but needs multifactor authentication details finalized.',
    statement: 'Users must use complex passwords and change them according to the review schedule.',
    implementationStatus: 'in_progress',
  },
  {
    id: 'ctrl-3',
    name: 'Vulnerability Management',
    state: 'Implemented',
    controlKey: 'RA-5',
    coverage: 'full',
    rationale: 'Establishes regular vulnerability scanning, reporting, and remediation protocols.',
    statement:
      'Regular scanning of internal and external networks must be conducted at least monthly.',
    implementationStatus: 'implemented',
  },
  {
    id: 'ctrl-4',
    name: 'Incident Response Plan',
    state: 'Not Started',
    controlKey: 'IR-1',
    coverage: 'none',
    rationale: 'Plan has been drafted but not officially approved or implemented as a control.',
    statement: 'An incident response team must be established to handle data breaches.',
    implementationStatus: 'not_started',
  },
  {
    id: 'ctrl-5',
    name: 'Data Classification Standard',
    state: 'Implemented',
    controlKey: 'MP-2',
    coverage: 'full',
    rationale: 'Defines categories for public, internal, confidential, and restricted data.',
    statement: 'All organizational data must be categorized and labeled appropriately.',
    implementationStatus: 'implemented',
  },
  {
    id: 'ctrl-6',
    name: 'Change Management Process',
    state: 'In Progress',
    controlKey: 'CM-3',
    coverage: 'partial',
    rationale:
      'Applies to production code changes, but infrastructure as code modifications are still manual.',
    statement:
      'All changes to production environments must be approved by the change advisory board.',
    implementationStatus: 'in_progress',
  },
  {
    id: 'ctrl-7',
    name: 'Business Continuity Plan',
    state: 'Not Started',
    controlKey: 'CP-2',
    coverage: 'none',
    rationale: 'Requires annual simulation testing before full validation can be claimed.',
    statement: 'Disaster recovery procedures must be tested annually to ensure data availability.',
    implementationStatus: 'not_started',
  },
  {
    id: 'ctrl-8',
    name: 'Third-Party Risk Assessment',
    state: 'Implemented',
    controlKey: 'SA-9',
    coverage: 'full',
    rationale: 'Ensures external vendors undergo security posture reviews prior to onboarding.',
    statement: 'All third-party partners with access to company networks must be vetted.',
    implementationStatus: 'implemented',
  },
]

const DUMMY_DOCUMENTS: LinkItem[] = [
  { id: 'doc-1', name: 'Security Policy v3.2', type: 'Policy', state: 'Approved' },
  { id: 'doc-2', name: 'Risk Assessment Report Q1', type: 'Report', state: 'Draft' },
  { id: 'doc-3', name: 'Employee Handbook', type: 'Procedure', state: 'Approved' },
  { id: 'doc-4', name: 'Vendor Agreement Template', type: 'Contract', state: 'In review' },
  { id: 'doc-5', name: 'Infrastructure Architecture Diagram', type: 'Diagram', state: 'Approved' },
]

const DUMMY_AUDITS: LinkItem[] = [
  { id: 'audit-1', name: 'SOC 2 Type II Audit 2024', state: 'Completed' },
  { id: 'audit-2', name: 'Pen Test — Q2 2025', state: 'In progress' },
  { id: 'audit-3', name: 'ISO Internal Audit', state: 'Scheduled' },
  { id: 'audit-4', name: 'GDPR Compliance Review', state: 'Completed' },
]

const DUMMY_OBLIGATIONS: LinkItem[] = [
  {
    id: 'obl-1',
    name: 'GDPR Art. 32 — Security measures',
    area: 'Data Privacy',
    source: 'GDPR',
    state: 'Active',
  },
  {
    id: 'obl-2',
    name: 'HIPAA §164.312 — Access control',
    area: 'Healthcare',
    source: 'HIPAA',
    state: 'Active',
  },
  {
    id: 'obl-3',
    name: 'PCI DSS Req. 8 — Authentication',
    area: 'Payment',
    source: 'PCI DSS',
    state: 'Under review',
  },
]

// ---------------------------------------------------------------------------
// Route / navigation
// ---------------------------------------------------------------------------

const route = useRoute()
const router = useRouter()

const frameworkId = computed(() => route.params.frameworkId as string)
const frameworkName = computed(() => (route.query.name as string) || 'Framework')
const frameworkPublisher = computed(() => (route.query.publisher as string) || '')

function goBack() {
  router.back()
}

// ---------------------------------------------------------------------------
// Requirements list state (with infinite loading)
// ---------------------------------------------------------------------------

const organizationStore = useOrganizationStore()
const tenantId = computed(() => organizationStore.activeOrganization?.id)

const requirements = ref<Requirement[]>([])
const isLoading = ref(false)
const isError = ref('')
const total = ref(0)
const offset = ref(0)
const limit = 20

const hasMore = computed(() => offset.value < total.value || total.value === 0)

const selectedId = ref<string>('')

const selectedRequirement = computed(
  () => requirements.value.find((r) => r.id === selectedId.value) ?? requirements.value[0],
)

const mapAssessmentToRequirement = (assessment: TenantRequirementAssessment): Requirement => {
  const code = assessment.frameworkNode?.externalId || ''

  // Extract alphabetical prefix to group them under broad, neat categories
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

async function loadNextPage() {
  if (isLoading.value || !hasMore.value) return

  isLoading.value = true
  isError.value = ''

  try {
    const tenantIdVal = tenantId.value
    const frameworkIdVal = frameworkId.value

    if (!tenantIdVal || !frameworkIdVal) {
      return
    }

    const response = await getTenantFrameworkRequirements(tenantIdVal, frameworkIdVal, {
      limit,
      offset: offset.value,
    })

    const mapped = response.tenantRequirementAssessments.map(mapAssessmentToRequirement)

    if (offset.value === 0) {
      requirements.value = mapped
    } else {
      requirements.value.push(...mapped)
    }

    total.value = response.total
    offset.value += mapped.length

    if (requirements.value.length > 0 && !selectedId.value) {
      const qId = route.query.selectedId as string
      if (qId && requirements.value.some((r) => r.id === qId)) {
        selectedId.value = qId
      } else {
        selectedId.value = requirements.value[0]?.id ?? ''
      }
    }
  } catch (err: unknown) {
    isError.value = getApiErrorMessage(err, 'Failed to load requirements.')
  } finally {
    isLoading.value = false
  }
}

function resetAndLoad() {
  requirements.value = []
  offset.value = 0
  total.value = 0
  selectedId.value = ''
  void loadNextPage()
}

watch(
  () => [frameworkId.value, tenantId.value],
  () => {
    resetAndLoad()
  },
  { immediate: true },
)

watch(
  () => route.query.selectedId,
  (newVal) => {
    if (newVal && typeof newVal === 'string' && requirements.value.some((r) => r.id === newVal)) {
      selectedId.value = newVal
    }
  },
)

// ---------------------------------------------------------------------------
// Per-requirement linked items (keyed by req id + section)
// In production these come from the API; here we seed a few for demo
// ---------------------------------------------------------------------------

type LinkedState = Record<string, Record<LinkSectionId, LinkItem[]>>

const linkedItems = ref<LinkedState>({
  'cc1.1': {
    controls: [DUMMY_CONTROLS[0]!],
    documents: [],
    audits: [DUMMY_AUDITS[0]!],
    obligations: [],
  },
})

const isControlsLoading = ref(false)
const controlsError = ref('')

async function fetchControls() {
  const reqId = selectedId.value
  const fId = frameworkId.value
  const tId = tenantId.value
  if (!reqId || !fId || !tId) return

  isControlsLoading.value = true
  controlsError.value = ''

  try {
    const res = await getRequirementControls(tId, fId, reqId)
    const mappedControls = res.tenantRequirementControlMaps.map((m) => {
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
    })

    if (!linkedItems.value[reqId]) {
      linkedItems.value[reqId] = {
        controls: [],
        documents: [],
        audits: [],
        obligations: [],
      }
    }
    linkedItems.value[reqId].controls = mappedControls
  } catch (err: unknown) {
    controlsError.value = getApiErrorMessage(err, 'Failed to load controls.')
  } finally {
    isControlsLoading.value = false
  }
}

watch(
  () => selectedId.value,
  (newId) => {
    if (newId) {
      void fetchControls()
    }
  },
)

const currentLinkedItems = computed(() => {
  const reqId = selectedId.value
  if (!reqId) {
    return { controls: [], documents: [], audits: [], obligations: [] }
  }
  const item = linkedItems.value[reqId]
  return {
    controls: item?.controls ?? [],
    documents: item?.documents ?? [],
    audits: item?.audits ?? [],
    obligations: item?.obligations ?? [],
  }
})

// ---------------------------------------------------------------------------
// Link dialog state
// ---------------------------------------------------------------------------

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

function allItemsForSection(sectionId: LinkSectionId): LinkItem[] {
  if (sectionId === 'controls') return DUMMY_CONTROLS
  if (sectionId === 'documents') return DUMMY_DOCUMENTS
  if (sectionId === 'audits') return DUMMY_AUDITS
  return DUMMY_OBLIGATIONS
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
    <!-- ─── Sticky page header ──────────────────────────────────────────── -->
    <FrameworkHeader :name="frameworkName" :publisher="frameworkPublisher" @back="goBack" />

    <!-- ─── Two-panel body ──────────────────────────────────────────────── -->
    <div class="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
      <!-- Left: independently scrolling requirement list -->
      <RequirementSidebar
        v-model:selectedId="selectedId"
        :requirements="requirements"
        :isLoading="isLoading"
        :isError="isError"
        :hasMore="hasMore"
        @load-more="loadNextPage"
        @try-again="loadNextPage"
      />

      <!-- Right: independently scrolling requirement detail -->
      <div class="clarus-scroll min-w-0 flex-1 overflow-y-auto bg-background">
        <div v-if="selectedRequirement">
          <!-- Requirement description block -->
          <RequirementInfo :requirement="selectedRequirement" />

          <!-- Tabbed link sections -->
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
      </div>
    </div>

    <!-- ─── Link items dialog ───────────────────────────────────────────── -->
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
