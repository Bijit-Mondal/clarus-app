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
  PhMagnifyingGlass,
} from '@phosphor-icons/vue'
import {
  useControlsStore,
  type Evidence,
  type Task,
  type ControlRequirement,
  type Risk,
  type Document,
  type ThirdParty,
} from '@/stores/controls'
import {
  useControlRequirementsQuery,
  useTenantControlQuery,
  useUpdateTenantControlMutation,
  useLinkControlRequirementMutation,
  useUnlinkControlRequirementMutation,
} from '@/composables/useControls'
import { useControlTasksQuery } from '@/composables/useTasks'

import { useTenantRequirementSearchQuery } from '@/composables/useFrameworks'
import type { LinkItem } from '@/components/compliance/types'
import type { UpdateTenantControlInput, ControlRequirementMap } from '@/api/controls'
import { getApiErrorMessage } from '@/lib/api'
import ControlStatusBadge from '@/components/compliance/ControlStatusBadge.vue'
import LinkItemDialog from '@/components/compliance/LinkItemDialog.vue'
import TasksManager from '@/components/compliance/TasksManager.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
      risks: [] as Risk[],
      documents: [] as Document[],
      thirdParties: [] as ThirdParty[],
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
    risks: [] as Risk[],
    documents: [] as Document[],
    thirdParties: [] as ThirdParty[],
  }
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
function formatDate(iso: string) {
  if (!iso) return 'N/A'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return 'N/A'
  return dateFormatter.format(date)
}

// Active Tab
const activeTab = ref<
  'evidences' | 'tasks' | 'requirements' | 'risks' | 'documents' | 'thirdParties'
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

// Evidence Dialog State
const isEvidenceDialogOpen = ref(false)
const evDescription = ref('')
const evFileType = ref('PDF')
const evFileSize = ref('1.5 MB')

function openEvidenceDialog() {
  evDescription.value = ''
  evFileType.value = 'PDF'
  evFileSize.value = '1.5 MB'
  isEvidenceDialogOpen.value = true
}

function submitEvidence() {
  if (!evDescription.value.trim()) return
  if (control.value) {
    controlsStore.addEvidence(control.value.code, {
      description: evDescription.value.trim(),
      fileType: evFileType.value,
      fileSize: evFileSize.value,
    })
    isEvidenceDialogOpen.value = false
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

// Risk Linking Dialog
const isRiskDialogOpen = ref(false)
const searchRisk = ref('')

const availableRisks = computed((): Risk[] => [])

function linkRisk(risk: Risk) {
  if (control.value) {
    controlsStore.linkRisk(control.value.code, risk)
    isRiskDialogOpen.value = false
  }
}

// Document Linking Dialog
const isDocDialogOpen = ref(false)
const searchDoc = ref('')

const availableDocs = computed((): Document[] => [])

function linkDoc(doc: Document) {
  if (control.value) {
    controlsStore.linkDocument(control.value.code, doc)
    isDocDialogOpen.value = false
  }
}

// Vendor Linking Dialog
const isVendorDialogOpen = ref(false)
const searchVendor = ref('')

const availableVendors = computed((): ThirdParty[] => [])

function linkVendor(v: ThirdParty) {
  if (control.value) {
    controlsStore.linkThirdParty(control.value.code, v)
    isVendorDialogOpen.value = false
  }
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

const getRiskLevelClass = (level: string) => {
  if (level === 'Critical' || level === 'High')
    return 'bg-destructive/10 text-destructive border-destructive/20'
  if (level === 'Medium') return 'bg-warning/10 text-warning-emphasis border-warning/20'
  return 'bg-muted/80 text-muted-foreground border-border'
}

const getDocStatusClass = (status: string) => {
  if (status === 'Approved') return 'bg-success/10 text-success border-success/20'
  if (status === 'Under Review') return 'bg-warning/10 text-warning-emphasis border-warning/20'
  return 'bg-muted text-muted-foreground border-border'
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
            { id: 'evidences', label: 'Evidences', count: control.evidences.length },
            { id: 'tasks', label: 'Tasks', count: controlTasksCount },
            { id: 'requirements', label: 'Requirements', count: requirements.length },
            { id: 'risks', label: 'Risks', count: control.risks.length },
            { id: 'documents', label: 'Documents', count: control.documents.length },
            { id: 'thirdParties', label: 'Third parties', count: control.thirdParties.length },
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
          <table v-if="control.evidences.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium"
              >
                <th class="px-5 py-2.5">Description</th>
                <th class="px-5 py-2.5">File type</th>
                <th class="px-5 py-2.5">File size</th>
                <th class="px-5 py-2.5">Created at</th>
                <th class="px-5 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="e in control.evidences"
                :key="e.id"
                class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
              >
                <td class="px-5 py-3.5 font-medium text-foreground">{{ e.description }}</td>
                <td class="px-5 py-3.5 text-muted-foreground font-mono text-xs">
                  {{ e.fileType }}
                </td>
                <td class="px-5 py-3.5 text-muted-foreground tabular-nums text-xs">
                  {{ e.fileSize }}
                </td>
                <td class="px-5 py-3.5 text-muted-foreground tabular-nums text-xs">
                  {{ formatDate(e.createdAt) }}
                </td>
                <td class="px-5 py-3.5 text-right">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        @click="controlsStore.removeEvidence(control.code, e.id)"
                      >
                        <PhTrash :size="14" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Unlink evidence</TooltipContent>
                  </Tooltip>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span
              class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3"
            >
              <PhFileText :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No evidence linked yet</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Link documents, settings reports or file logs to satisfy this control.
            </p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
              @click="openEvidenceDialog"
            >
              <PhPlus :size="14" weight="bold" />
              Add evidence
            </Button>
          </div>
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

        <!-- Risks Tab -->
        <div v-if="activeTab === 'risks'">
          <table v-if="control.risks.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium"
              >
                <th class="px-5 py-2.5 w-[20%]">Risk ID</th>
                <th class="px-5 py-2.5 w-[55%]">Description</th>
                <th class="px-5 py-2.5 w-[15%]">Level</th>
                <th class="px-5 py-2.5 w-[10%] text-right"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in control.risks"
                :key="r.id"
                class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
              >
                <td class="px-5 py-3.5 font-mono font-semibold text-xs text-muted-foreground">
                  {{ r.id }}
                </td>
                <td class="px-5 py-3.5 font-medium text-foreground">{{ r.description }}</td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    :class="getRiskLevelClass(r.level)"
                  >
                    {{ r.level }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    @click="controlsStore.unlinkRisk(control.code, r.id)"
                  >
                    <PhTrash :size="14" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span
              class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3"
            >
              <PhWarning :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No linked risks</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Link organizational risks that are mitigated or managed by this control.
            </p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
              @click="isRiskDialogOpen = true"
            >
              <PhPlus :size="14" weight="bold" />
              Link risk
            </Button>
          </div>
        </div>

        <!-- Documents Tab -->
        <div v-if="activeTab === 'documents'">
          <table v-if="control.documents.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium"
              >
                <th class="px-5 py-2.5">Name</th>
                <th class="px-5 py-2.5">Version</th>
                <th class="px-5 py-2.5">Status</th>
                <th class="px-5 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="d in control.documents"
                :key="d.id"
                class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
              >
                <td
                  class="px-5 py-3.5 font-medium text-foreground hover:text-primary hover:underline cursor-pointer"
                >
                  {{ d.name }}
                </td>
                <td class="px-5 py-3.5 text-muted-foreground text-xs font-mono">{{ d.version }}</td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    :class="getDocStatusClass(d.status)"
                  >
                    {{ d.status }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    @click="controlsStore.unlinkDocument(control.code, d.id)"
                  >
                    <PhTrash :size="14" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span
              class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3"
            >
              <PhFileText :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No documents linked</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Link standard policy files or organizational guidelines supporting this control.
            </p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
              @click="isDocDialogOpen = true"
            >
              <PhPlus :size="14" weight="bold" />
              Link document
            </Button>
          </div>
        </div>

        <!-- Third Parties Tab -->
        <div v-if="activeTab === 'thirdParties'">
          <table
            v-if="control.thirdParties.length"
            class="w-full text-left border-collapse text-sm"
          >
            <thead>
              <tr
                class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium"
              >
                <th class="px-5 py-2.5">Vendor</th>
                <th class="px-5 py-2.5">Service</th>
                <th class="px-5 py-2.5">Compliance Status</th>
                <th class="px-5 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in control.thirdParties"
                :key="v.id"
                class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
              >
                <td class="px-5 py-3.5 font-medium text-foreground">{{ v.name }}</td>
                <td class="px-5 py-3.5 text-muted-foreground text-xs">{{ v.service }}</td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border leading-none"
                    :class="
                      v.status === 'Approved'
                        ? 'bg-success/10 border-success/20 text-success'
                        : v.status === 'Critical Risk'
                          ? 'bg-destructive/10 border-destructive/20 text-destructive'
                          : 'bg-warning/10 border-warning/20 text-warning-emphasis'
                    "
                  >
                    {{ v.status }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    @click="controlsStore.unlinkThirdParty(control.code, v.id)"
                  >
                    <PhTrash :size="14" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span
              class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3"
            >
              <PhFolderOpen :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No third parties linked</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Link third-party vendors or external systems that are monitored or scoped in this
              control.
            </p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
              @click="isVendorDialogOpen = true"
            >
              <PhPlus :size="14" weight="bold" />
              Link third party
            </Button>
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
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              class="bg-primary text-primary-foreground hover:bg-primary/90 h-9 font-semibold"
            >
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Evidence Dialog -->
    <Dialog :open="isEvidenceDialogOpen" @update:open="isEvidenceDialogOpen = $event">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Evidence Document</DialogTitle>
          <DialogDescription
            >Simulate uploading an evidence report or settings snapshot.</DialogDescription
          >
        </DialogHeader>
        <form @submit.prevent="submitEvidence" class="space-y-4 py-3">
          <div class="space-y-1.5">
            <Label for="ev-desc">Evidence Description</Label>
            <Input
              id="ev-desc"
              v-model="evDescription"
              placeholder="e.g. AWS Security Group configs Q2"
              required
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="ev-type">File Type</Label>
              <Select v-model="evFileType">
                <SelectTrigger id="ev-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="Spreadsheet">Spreadsheet</SelectItem>
                  <SelectItem value="Image">Image</SelectItem>
                  <SelectItem value="JSON">JSON / Configuration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label for="ev-size">File Size</Label>
              <Input id="ev-size" v-model="evFileSize" placeholder="e.g. 1.2 MB" />
            </div>
          </div>
          <DialogFooter class="pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" @click="isEvidenceDialogOpen = false"
              >Cancel</Button
            >
            <Button type="submit" size="sm" class="bg-primary text-primary-foreground"
              >Add evidence</Button
            >
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

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

    <!-- Link Risk Dialog -->
    <Dialog :open="isRiskDialogOpen" @update:open="isRiskDialogOpen = $event">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Link Risk</DialogTitle>
          <DialogDescription
            >Link catalog risks mitigated by control {{ control.code }}.</DialogDescription
          >
        </DialogHeader>
        <div class="space-y-4 py-3">
          <div class="relative">
            <PhMagnifyingGlass
              :size="16"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input v-model="searchRisk" class="pl-9" placeholder="Search risks..." />
          </div>
          <div
            class="max-h-[280px] overflow-y-auto border border-border rounded-md divide-y divide-border"
          >
            <div
              v-for="risk in availableRisks"
              :key="risk.id"
              class="p-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 cursor-pointer"
              @click="linkRisk(risk)"
            >
              <div class="min-w-0">
                <span
                  class="font-mono text-[10px] font-bold text-muted-foreground bg-muted border px-1.5 py-0.5 rounded"
                >
                  {{ risk.id }}
                </span>
                <p class="text-xs font-medium text-foreground mt-2">{{ risk.description }}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                class="shrink-0 text-[10px] font-semibold border-border"
                >Link</Button
              >
            </div>
            <div
              v-if="!availableRisks.length"
              class="p-8 text-center text-xs text-muted-foreground"
            >
              No risks available to link yet.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Link Document Dialog -->
    <Dialog :open="isDocDialogOpen" @update:open="isDocDialogOpen = $event">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Link Document</DialogTitle>
          <DialogDescription
            >Link policy manuals or procedural guidelines to control
            {{ control.code }}.</DialogDescription
          >
        </DialogHeader>
        <div class="space-y-4 py-3">
          <div class="relative">
            <PhMagnifyingGlass
              :size="16"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input v-model="searchDoc" class="pl-9" placeholder="Search documents..." />
          </div>
          <div
            class="max-h-[280px] overflow-y-auto border border-border rounded-md divide-y divide-border"
          >
            <div
              v-for="doc in availableDocs"
              :key="doc.id"
              class="p-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 cursor-pointer"
              @click="linkDoc(doc)"
            >
              <div class="min-w-0">
                <h4 class="text-xs font-semibold text-foreground">{{ doc.name }}</h4>
                <p class="text-[10px] text-muted-foreground mt-1 font-mono">
                  {{ doc.version }} • {{ doc.status }}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                class="shrink-0 text-[10px] font-semibold border-border"
                >Link</Button
              >
            </div>
            <div v-if="!availableDocs.length" class="p-8 text-center text-xs text-muted-foreground">
              No documents available to link yet.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Link Vendor Dialog -->
    <Dialog :open="isVendorDialogOpen" @update:open="isVendorDialogOpen = $event">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Link Third Party</DialogTitle>
          <DialogDescription
            >Map scoped vendors or external service providers to control
            {{ control.code }}.</DialogDescription
          >
        </DialogHeader>
        <div class="space-y-4 py-3">
          <div class="relative">
            <PhMagnifyingGlass
              :size="16"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input v-model="searchVendor" class="pl-9" placeholder="Search vendors..." />
          </div>
          <div
            class="max-h-[280px] overflow-y-auto border border-border rounded-md divide-y divide-border"
          >
            <div
              v-for="v in availableVendors"
              :key="v.id"
              class="p-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 cursor-pointer"
              @click="linkVendor(v)"
            >
              <div class="min-w-0">
                <h4 class="text-xs font-semibold text-foreground">{{ v.name }}</h4>
                <p class="text-[10px] text-muted-foreground mt-0.5">
                  {{ v.service }} • {{ v.status }}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                class="shrink-0 text-[10px] font-semibold border-border"
                >Link</Button
              >
            </div>
            <div
              v-if="!availableVendors.length"
              class="p-8 text-center text-xs text-muted-foreground"
            >
              No vendors available to link yet.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
