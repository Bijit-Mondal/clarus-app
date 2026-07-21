<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounce } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import {
  PhCaretRight,
  PhPlus,
  PhTrash,
  PhFileText,
  PhShieldCheck,
  PhWarning,
  PhGavel,
  PhPencilSimple,
  PhDotsThreeOutline,
} from '@phosphor-icons/vue'
import {
  useControlsStore,
  type Evidence,
  type Task,
  type ControlRequirement,
} from '@/stores/controls'
import {
  useControlRequirementsQuery,
  useControlDocumentsQuery,
  useTenantControlQuery,
  useUpdateTenantControlMutation,
  useLinkControlRequirementMutation,
  useUnlinkControlRequirementMutation,
} from '@/composables/useControls'
import { useControlTasksQuery } from '@/composables/useTasks'
import {
  useControlEvidencesQuery,
  useDeleteEvidenceMutation,
  useDownloadEvidenceMutation,
} from '@/composables/useEvidence'
import AddEvidenceDialog from '@/components/compliance/AddEvidenceDialog.vue'
import EvidenceTab from '@/components/compliance/EvidenceTab.vue'

import { useTenantRequirementSearchQuery } from '@/composables/useFrameworks'
import { normalizeVersionStatus, formatDocumentVersion } from '@/composables/useDocuments'
import type { LinkItem } from '@/components/compliance/types'
import type { UpdateTenantControlInput, ControlRequirementMap } from '@/api/controls'
import { getApiErrorMessage } from '@/lib/api'
import ControlStatusBadge from '@/components/compliance/ControlStatusBadge.vue'
import LinkItemDialog from '@/components/compliance/LinkItemDialog.vue'
import TasksManager from '@/components/compliance/TasksManager.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type ControlStatus } from '@/data/controls'

const route = useRoute()
const router = useRouter()
const controlsStore = useControlsStore()

const controlId = computed(() => route.params.controlId as string)
const orgSlug = computed(() => route.params.organizationSlug as string)

const { data: controlDetailData, isPending: isControlLoading } = useTenantControlQuery(controlId)
const apiControl = computed(() => {
  return controlDetailData.value || window.history.state?.controlData || null
})

const controlDbId = computed(() => apiControl.value?.$id || '')
const tasksLimit = ref(8)
const tasksOffset = ref(0)
const { data: tasksData } = useControlTasksQuery(controlDbId, tasksLimit, tasksOffset)
const controlTasksCount = computed(() => tasksData.value?.total || 0)

function mapStatus(apiStatus: string): ControlStatus {
  if (apiStatus === 'implemented') return 'passing'
  if (
    apiStatus === 'in_progress' ||
    apiStatus === 'partially_implemented' ||
    apiStatus === 'needs_review'
  )
    return 'attention'
  if (apiStatus === 'not_started') return 'not_started'
  if (apiStatus === 'not_applicable') return 'not_applicable'
  return 'failing'
}

const control = computed(() => {
  if (apiControl.value) {
    return {
      id: apiControl.value.$id,
      code: apiControl.value.controlKey,
      name: apiControl.value.name,
      description: apiControl.value.statement || '',
      statement: apiControl.value.statement || '',
      implementationStatus: apiControl.value.implementationStatus || 'not_started',
      status: mapStatus(apiControl.value.implementationStatus),
      archivedAt: apiControl.value.archivedAt || '',
      evidences: [] as Evidence[],
      tasks: [] as Task[],
      requirements: [] as ControlRequirement[],
    }
  }
  return {
    id: '',
    code: controlId.value,
    name: controlId.value,
    description: '',
    statement: '',
    implementationStatus: 'not_started',
    status: 'not_started' as ControlStatus,
    archivedAt: '',
    evidences: [] as Evidence[],
    tasks: [] as Task[],
    requirements: [] as ControlRequirement[],
  }
})

// Active Tab
const activeTab = ref<
  'evidences' | 'tasks' | 'requirements' | 'documents'
>('requirements')

const { data: reqData, isPending: reqIsPending } = useControlRequirementsQuery(controlId)
const requirements = computed(() => reqData.value?.tenantRequirementControlMaps || [])
const controlFrameworks = computed(() => {
  const frameworks = new Map<string, { id: string; name: string; publisher: string }>()

  for (const map of requirements.value) {
    const { tenantFrameworkId, frameworkNode } = map.tenantRequirementAssessment
    frameworks.set(tenantFrameworkId, {
      id: tenantFrameworkId,
      name: frameworkNode.frameworkName,
      publisher: frameworkNode.frameworkPublisher,
    })
  }

  return [...frameworks.values()]
})

// Back navigation
function goBack() {
  void router.push({
    name: 'compliance-controls',
    params: { organizationSlug: orgSlug.value },
  })
}

// Edit Dialog
const isEditDialogOpen = ref(false)
const editStatement = ref('')
const editImplementationStatus =
  ref<UpdateTenantControlInput['implementationStatus']>('not_started')
const editArchive = ref(false)

const updateMutation = useUpdateTenantControlMutation()
const linkRequirementMutation = useLinkControlRequirementMutation()
const unlinkRequirementMutation = useUnlinkControlRequirementMutation()

const hasControlChanges = computed(() => {
  if (!control.value) return false
  return (
    editStatement.value.trim() !== (control.value.statement || '').trim() ||
    editImplementationStatus.value !== (control.value.implementationStatus || 'not_started') ||
    editArchive.value !== !!control.value.archivedAt
  )
})

function openEditDialog() {
  if (control.value) {
    editStatement.value = control.value.statement
    editImplementationStatus.value = (control.value.implementationStatus ||
      'not_started') as UpdateTenantControlInput['implementationStatus']
    editArchive.value = !!control.value.archivedAt
    isEditDialogOpen.value = true
  }
}

function saveEdit() {
  if (control.value && control.value.id) {
    const updates: UpdateTenantControlInput = {}

    const statementVal = editStatement.value.trim()
    const origStatementVal = (control.value.statement || '').trim()
    if (statementVal !== origStatementVal) {
      updates.statement = statementVal || null
    }

    const origStatus = control.value.implementationStatus || 'not_started'
    if (editImplementationStatus.value !== origStatus) {
      updates.implementationStatus =
        editImplementationStatus.value as UpdateTenantControlInput['implementationStatus']
    }

    const origArchived = !!control.value.archivedAt
    if (editArchive.value !== origArchived) {
      updates.archive = editArchive.value
    }

    if (Object.keys(updates).length === 0) {
      isEditDialogOpen.value = false
      return
    }

    updateMutation.mutate(
      {
        tenantControlId: control.value.id,
        updates,
      },
      {
        onSuccess: () => {
          isEditDialogOpen.value = false
        },
      },
    )
  }
}

// Status dropdown change
function onStatusChange(newVal: unknown) {
  if (control.value && control.value.id && typeof newVal === 'string') {
    updateMutation.mutate({
      tenantControlId: control.value.id,
      updates: {
        implementationStatus: newVal as UpdateTenantControlInput['implementationStatus'],
      },
    })
  }
}

// Delete control
function deleteControl() {
  if (control.value && confirm(`Are you sure you want to delete control ${control.value.code}?`)) {
    controlsStore.deleteControl(control.value.code)
    goBack()
  }
}

// Fetch real control evidences
const { data: evidencesData, isPending: isEvidencesLoading } = useControlEvidencesQuery(controlDbId)
const controlEvidences = computed(() => evidencesData.value?.evidences || [])

const { data: controlDocsData, isPending: isControlDocsLoading } =
  useControlDocumentsQuery(controlDbId)
const controlDocuments = computed(() => controlDocsData.value?.documents || [])

const deleteEvidenceMutation = useDeleteEvidenceMutation()
const downloadEvidenceMutation = useDownloadEvidenceMutation()

// Evidence Dialog State
const isEvidenceDialogOpen = ref(false)

function openEvidenceDialog() {
  isEvidenceDialogOpen.value = true
}

async function removeEvidence(id: string) {
  if (confirm('Are you sure you want to delete this evidence?')) {
    try {
      await deleteEvidenceMutation.mutateAsync(id)
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to delete evidence.'))
    }
  }
}

const downloadingId = ref<string | null>(null)

async function downloadFile(evidenceId: string) {
  downloadingId.value = evidenceId
  try {
    await downloadEvidenceMutation.mutateAsync(evidenceId)
  } catch (err) {
    alert(getApiErrorMessage(err, 'Failed to download evidence file.'))
  } finally {
    downloadingId.value = null
  }
}

// Requirement Linking Dialog
const isRequirementDialogOpen = ref(false)
const requirementSearchQuery = ref('')
const debouncedRequirementSearchQuery = useDebounce(requirementSearchQuery, 300)
const requirementSearch = useTenantRequirementSearchQuery(
  debouncedRequirementSearchQuery,
  isRequirementDialogOpen,
)

const requirementSearchItems = computed<LinkItem[]>(() =>
  (requirementSearch.data.value?.tenantRequirementAssessments ?? []).map((requirement) => ({
    id: requirement.tenantRequirementAssessmentId,
    name: requirement.title,
    state: requirement.status
      ? requirement.status
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : 'Not Started',
    source: requirement.externalId,
    area: requirement.frameworkName,
  })),
)

const requirementSearchError = computed(() =>
  requirementSearch.error.value
    ? getApiErrorMessage(requirementSearch.error.value, 'Failed to search requirements.')
    : '',
)

const requirementSearchLoading = computed(
  () => requirementSearch.isPending.value || requirementSearch.isFetching.value,
)

function handleRequirementSearchQuery(query: string) {
  requirementSearchQuery.value = query
}

function linkRequirement(item: LinkItem) {
  if (!control.value || !control.value.id) return
  linkRequirementMutation.mutate(
    {
      tenantControlId: control.value.id,
      input: {
        tenantRequirementAssessmentId: item.id,
        coverage: 'full',
        rationale: 'This tenant control addresses the requirement.',
      },
    },
    {
      onSuccess: () => {
        isRequirementDialogOpen.value = false
      },
    },
  )
}

function unlinkRequirement(tenantRequirementAssessmentId: string) {
  if (!control.value || !control.value.id) return
  unlinkRequirementMutation.mutate({
    tenantControlId: control.value.id,
    tenantRequirementAssessmentId,
  })
}

// Helpers
const statusConfig = computed(() => {
  const s = control.value?.status
  if (s === 'passing')
    return {
      base: 'var(--success-emphasis)',
      bg: 'color-mix(in oklab, var(--success-emphasis) 10%, transparent)',
    }
  if (s === 'attention')
    return {
      base: 'var(--warning-emphasis)',
      bg: 'color-mix(in oklab, var(--warning-emphasis) 10%, transparent)',
    }
  if (s === 'failing')
    return {
      base: 'var(--destructive-emphasis)',
      bg: 'color-mix(in oklab, var(--destructive-emphasis) 10%, transparent)',
    }
  return { base: 'var(--muted-foreground)', bg: 'transparent' }
})

function goToDocument(documentId: string) {
  void router.push({
    name: 'compliance-document-detail',
    params: {
      organizationSlug: orgSlug.value,
      documentId,
    },
  })
}

function getVersionStatusConfig(status: string) {
  const normalized = normalizeVersionStatus(status)
  if (normalized === 'approved')
    return { label: 'Approved', classes: 'bg-success/10 text-success border-success/20' }
  if (normalized === 'in-review')
    return { label: 'In Review', classes: 'bg-warning/10 text-warning-emphasis border-warning/20' }
  if (normalized === 'rejected')
    return { label: 'Rejected', classes: 'bg-destructive/10 text-destructive border-destructive/20' }
  return { label: 'Draft', classes: 'bg-muted text-muted-foreground border-border' }
}

function getDocTypeLabel(docType: string) {
  if (docType === 'policy') return 'Policy'
  if (docType === 'procedure') return 'Procedure'
  if (docType === 'sop') return 'SOP'
  return docType.charAt(0).toUpperCase() + docType.slice(1)
}

const isDescriptionExpanded = ref(false)
const expandedRequirementIds = ref<Set<string>>(new Set())

watch(controlId, () => {
  isDescriptionExpanded.value = false
  expandedRequirementIds.value.clear()
  expandedRequirementIds.value = new Set(expandedRequirementIds.value)
})

function toggleRequirementDescription(id: string) {
  if (expandedRequirementIds.value.has(id)) {
    expandedRequirementIds.value.delete(id)
  } else {
    expandedRequirementIds.value.add(id)
  }
  expandedRequirementIds.value = new Set(expandedRequirementIds.value)
}

function goToRequirement(map: ControlRequirementMap) {
  void router.push({
    name: 'compliance-framework-requirements',
    params: {
      organizationSlug: orgSlug.value,
      frameworkId: map.tenantRequirementAssessment.tenantFrameworkId,
    },
    query: {
      selectedAssessmentId: map.tenantRequirementAssessment.$id,
      name: map.tenantRequirementAssessment.frameworkNode.frameworkName,
      publisher: map.tenantRequirementAssessment.frameworkNode.frameworkPublisher,
    },
  })
}
</script>

<template>
  <ClarusLoadingState
    v-if="isControlLoading && !apiControl"
    variant="control-header"
    label="Loading control"
  />
  <div v-else-if="control">
    <!-- Breadcrumb -->
    <div
      class="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground"
      aria-label="Breadcrumb"
    >
      <button @click="goBack" class="hover:text-foreground transition-colors cursor-pointer">
        Controls
      </button>
      <PhCaretRight :size="10" class="opacity-60" />
      <span class="font-medium text-foreground">{{ control.code }}</span>
    </div>

    <!-- Header & Actions -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-2 flex-1 min-w-0">
        <div class="flex items-center gap-3">
          <span
            class="inline-flex items-center rounded border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground uppercase leading-none"
          >
            {{ control.code }}
          </span>
          <ControlStatusBadge :status="control.status" />
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          style="text-wrap: balance"
        >
          {{ control.name }}
        </h1>
        <p
          class="text-sm leading-relaxed text-muted-foreground max-w-3xl"
          :class="{ 'line-clamp-3': !isDescriptionExpanded }"
        >
          {{ control.description }}
        </p>
        <button
          v-if="control.description && control.description.length > 240"
          type="button"
          class="mt-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:underline cursor-pointer"
          @click="isDescriptionExpanded = !isDescriptionExpanded"
        >
          {{ isDescriptionExpanded ? 'Show less' : 'Show more' }}
        </button>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          @click="openEditDialog"
          class="gap-1.5 font-semibold text-xs h-8"
        >
          <PhPencilSimple :size="15" />
          Edit
        </Button>

        <Select :model-value="control.implementationStatus" @update:model-value="onStatusChange">
          <SelectTrigger
            size="sm"
            class="h-8 min-w-[130px] font-semibold text-xs"
            :style="{
              backgroundColor: statusConfig.bg,
              color: statusConfig.base,
              borderColor: 'color-mix(in oklab, ' + statusConfig.base + ' 25%, transparent)',
            }"
            aria-label="Change status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="implemented">Implemented</SelectItem>
            <SelectItem value="partially_implemented">Partially Implemented</SelectItem>
            <SelectItem value="not_applicable">Not Applicable</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="outline"
              size="icon-sm"
              class="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <PhDotsThreeOutline :size="15" weight="fill" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-[140px]">
            <DropdownMenuItem
              @click="deleteControl"
              class="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <PhTrash :size="14" />
              Delete control
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Meta strip -->
    <div class="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span class="inline-flex items-center gap-1.5">
        <PhShieldCheck :size="13" class="text-success" />
        <span v-if="reqIsPending">Loading frameworks…</span>
        <span v-else-if="controlFrameworks.length">
          {{ controlFrameworks.map((framework) => framework.name).join(', ') }}
        </span>
        <span v-else>No linked frameworks</span>
      </span>
    </div>

    <!-- Tabbed Lists -->
    <div class="space-y-4">
      <!-- Tabs header -->
      <div class="flex border-b border-border overflow-x-auto scrollbar-none" role="tablist">
        <button
          v-for="t in [
            { id: 'evidences', label: 'Evidences', count: controlEvidences.length },
            { id: 'tasks', label: 'Tasks', count: controlTasksCount },
            { id: 'requirements', label: 'Requirements', count: requirements.length },
            { id: 'documents', label: 'Documents', count: controlDocuments.length },
          ]"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === t.id"
          @click="activeTab = t.id as any"
          class="relative px-4 pb-3 text-sm font-medium transition-colors focus-visible:outline-none whitespace-nowrap"
          :class="
            activeTab === t.id
              ? 'text-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          "
        >
          {{ t.label }}
          <span
            v-if="t.count > 0"
            class="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            :class="
              activeTab === t.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            "
          >
            {{ t.count }}
          </span>
          <span
            v-if="activeTab === t.id"
            class="absolute inset-x-0 bottom-0 h-[2px] rounded-t bg-primary"
          />
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="rounded-lg border border-border bg-card overflow-hidden">
        <!-- Evidence Tab -->
        <div v-if="activeTab === 'evidences'">
          <EvidenceTab
            :evidences="controlEvidences"
            :is-loading="isEvidencesLoading"
            :downloading-id="downloadingId"
            empty-description="Link documents, settings reports or file logs to satisfy this control."
            @download="downloadFile"
            @delete="removeEvidence"
            @add="openEvidenceDialog"
          />
        </div>

        <!-- Tasks Tab -->
        <div v-if="activeTab === 'tasks'">
          <TasksManager
            v-if="control && control.id"
            :controlId="control.id"
            :controlKey="control.code"
            :controlName="control.name"
            :hideTitleSection="true"
            :hideControlDetailsLink="true"
          />
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <p class="text-sm font-medium text-foreground">Loading tasks...</p>
          </div>
        </div>

        <!-- Requirements Tab -->
        <div v-if="activeTab === 'requirements'">
          <table v-if="requirements.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium"
              >
                <th class="px-5 py-2.5 w-[20%]">Reference</th>
                <th class="px-5 py-2.5 w-[65%]">Name</th>
                <th class="px-5 py-2.5 w-[15%] text-right"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="map in requirements"
                :key="map.$id"
                class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
              >
                <td class="px-5 py-3.5 align-top">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-xs font-semibold text-foreground bg-muted border border-border px-1.5 py-0.5 rounded font-mono"
                    >
                      {{ map.tenantRequirementAssessment.frameworkNode.externalId }}
                    </span>
                  </div>
                </td>
                <td class="px-5 py-3.5">
                  <p
                    class="font-medium text-foreground text-xs leading-normal hover:text-primary hover:underline cursor-pointer"
                    @click="goToRequirement(map)"
                  >
                    {{ map.tenantRequirementAssessment.frameworkNode.title }}
                  </p>
                  <p
                    class="text-xs text-muted-foreground mt-1 leading-relaxed"
                    :class="{ 'line-clamp-2': !expandedRequirementIds.has(map.$id) }"
                  >
                    {{ map.tenantRequirementAssessment.frameworkNode.description }}
                  </p>
                  <button
                    v-if="
                      map.tenantRequirementAssessment.frameworkNode.description &&
                      map.tenantRequirementAssessment.frameworkNode.description.length > 160
                    "
                    type="button"
                    class="mt-1 text-[10px] font-semibold text-primary hover:text-primary/85 transition-colors focus-visible:outline-none focus-visible:underline cursor-pointer"
                    @click="toggleRequirementDescription(map.$id)"
                  >
                    {{ expandedRequirementIds.has(map.$id) ? 'Show less' : 'Show more' }}
                  </button>
                </td>
                <td class="px-5 py-3.5 text-right align-top">
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 text-xs border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-semibold"
                    @click="unlinkRequirement(map.tenantRequirementAssessmentId)"
                  >
                    Unlink
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <ClarusLoadingState
            v-else-if="reqIsPending"
            variant="table-rows"
            :rows="3"
            label="Loading requirements"
          />
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span
              class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3"
            >
              <PhGavel :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No linked requirements</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Map this control to framework requirements to prove compliance coverage.
            </p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
              @click="isRequirementDialogOpen = true"
            >
              <PhPlus :size="14" weight="bold" />
              Link requirement
            </Button>
          </div>
        </div>

        <!-- Documents Tab -->
        <div v-if="activeTab === 'documents'">
          <table v-if="controlDocuments.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium"
              >
                <th class="px-5 py-2.5 w-[45%]">Title</th>
                <th class="px-5 py-2.5 w-[15%]">Type</th>
                <th class="px-5 py-2.5 w-[15%]">Version</th>
                <th class="px-5 py-2.5 w-[15%]">Status</th>
                <th class="px-5 py-2.5 w-[10%]">Classification</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="doc in controlDocuments"
                :key="doc.$id"
                class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors cursor-pointer"
                @click="goToDocument(doc.$id)"
              >
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-2.5">
                    <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                      <PhFileText :size="16" />
                    </span>
                    <span class="font-medium text-foreground text-xs leading-normal hover:text-primary hover:underline">
                      {{ doc.title }}
                    </span>
                  </div>
                </td>
                <td class="px-5 py-3.5">
                  <span class="text-xs text-muted-foreground">
                    {{ getDocTypeLabel(doc.documentType) }}
                  </span>
                </td>
                <td class="px-5 py-3.5">
                  <span class="text-xs font-mono text-muted-foreground">
                    {{ formatDocumentVersion(doc) }}
                  </span>
                </td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    :class="getVersionStatusConfig(doc.versionStatus).classes"
                  >
                    {{ getVersionStatusConfig(doc.versionStatus).label }}
                  </span>
                </td>
                <td class="px-5 py-3.5">
                  <span class="text-xs text-muted-foreground capitalize">
                    {{ doc.classification }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <ClarusLoadingState
            v-else-if="isControlDocsLoading"
            variant="table-rows"
            :rows="3"
            label="Loading documents"
          />
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span
              class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3"
            >
              <PhFileText :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No documents linked</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Policy documents and procedures mapped to this control will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit Control</DialogTitle>
          <DialogDescription>
            Update the control statement, implementation status, or archive state.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="saveEdit" class="space-y-4 py-3">
          <!-- Meta Context Banner (read-only code & name) -->
          <div
            class="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 flex flex-col gap-0.5 text-xs"
          >
            <span
              class="font-mono font-semibold text-[10px] text-muted-foreground uppercase tracking-wider"
              >{{ control.code }}</span
            >
            <span class="font-medium text-foreground text-sm leading-tight">{{
              control.name
            }}</span>
          </div>

          <!-- Control Statement -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label for="edit-statement" class="text-xs font-semibold text-foreground"
                >Control Statement</Label
              >
              <span class="text-[10px] text-muted-foreground">Markdown</span>
            </div>
            <textarea
              id="edit-statement"
              v-model="editStatement"
              rows="5"
              class="flex min-h-[120px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="The objective or rule defined by this control..."
            ></textarea>
          </div>

          <div class="space-y-1.5">
            <Label for="edit-status" class="text-xs font-semibold text-foreground">Status</Label>
            <Select v-model="editImplementationStatus">
              <SelectTrigger id="edit-status" class="h-9 bg-card">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="implemented">Implemented</SelectItem>
                <SelectItem value="partially_implemented">Partially Implemented</SelectItem>
                <SelectItem value="not_applicable">Not Applicable</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Archive Control Switch -->
          <div class="rounded-lg border border-border bg-card p-3 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <Label for="edit-archive" class="text-xs font-semibold text-foreground cursor-pointer"
                >Archive Control</Label
              >
              <Switch
                id="edit-archive"
                :checked="editArchive"
                @update:checked="editArchive = $event"
              />
            </div>
            <p class="text-[10px] text-muted-foreground leading-normal">
              Excludes control from active frameworks while preserving evidence.
            </p>
          </div>

          <DialogFooter class="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="isEditDialogOpen = false"
              class="h-9"
            >
              {{ hasControlChanges ? 'Cancel' : 'Close' }}
            </Button>
            <Button
              type="submit"
              size="sm"
              :disabled="!hasControlChanges"
              class="bg-primary text-primary-foreground hover:bg-primary/90 h-9 font-semibold"
            >
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Evidence Dialog -->
    <AddEvidenceDialog v-model:open="isEvidenceDialogOpen" :tenant-control-id="controlDbId" />

    <LinkItemDialog
      :isOpen="isRequirementDialogOpen"
      label="Requirements"
      :icon="PhGavel"
      searchPlaceholder="Search requirements…"
      :availableItems="requirementSearchItems"
      :linkedItemIds="requirements.map((map) => map.tenantRequirementAssessment.$id)"
      :isLoading="requirementSearchLoading"
      :error="requirementSearchError"
      @close="isRequirementDialogOpen = false"
      @link="linkRequirement"
      @search-query="handleRequirementSearchQuery"
    />

  </div>
  <div v-else class="py-16 flex items-center justify-center">
    <div
      class="flex flex-col items-center text-center rounded-lg border border-destructive/20 bg-destructive/5 px-10 py-10"
    >
      <span
        class="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4"
      >
        <PhWarning :size="24" />
      </span>
      <h3 class="font-semibold text-foreground">Control Not Found</h3>
      <p class="text-sm text-muted-foreground mt-1.5 max-w-[300px]">
        The control you are trying to view does not exist or has been deleted.
      </p>
      <Button size="sm" variant="outline" @click="goBack" class="mt-5">Back to controls</Button>
    </div>
  </div>
</template>
