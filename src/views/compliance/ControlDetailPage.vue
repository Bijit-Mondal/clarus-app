<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhCaretRight,
  PhPlus,
  PhTrash,
  PhCheckCircle,
  PhClock,
  PhCircle,
  PhFileText,
  PhFolderOpen,
  PhGavel,
  PhShieldCheck,
  PhWarning,
  PhPencilSimple,
  PhDotsThreeOutline,
  PhUser,
  PhChecks,
  PhMagnifyingGlass,
} from '@phosphor-icons/vue'
import { useControlsStore, type Evidence, type Task, type ControlRequirement, type Risk, type Document, type ThirdParty } from '@/stores/controls'
import { useControlRequirementsQuery } from '@/composables/useControls'
import ControlStatusBadge from '@/components/compliance/ControlStatusBadge.vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { FRAMEWORKS, OWNER_LIST, type ControlStatus } from '@/data/controls'

const route = useRoute()
const router = useRouter()
const controlsStore = useControlsStore()

const controlId = computed(() => route.params.controlId as string)
const orgSlug = computed(() => route.params.organizationSlug as string)

const apiControl = computed(() => window.history.state?.controlData || null)

function mapStatus(apiStatus: string): ControlStatus {
  if (apiStatus === 'implemented') return 'passing'
  if (apiStatus === 'in_progress' || apiStatus === 'partially_implemented') return 'attention'
  if (apiStatus === 'not_started') return 'not_started'
  if (apiStatus === 'not_applicable') return 'not_applicable'
  return 'failing'
}

const control = computed(() => {
  if (apiControl.value) {
    return {
      code: apiControl.value.controlKey,
      name: apiControl.value.name,
      description: apiControl.value.statement || apiControl.value.implementationDescription || '',
      owner: apiControl.value.owner || { name: 'Unassigned', id: '' },
      frameworks: [] as string[], // Can map this later if API provides it
      status: mapStatus(apiControl.value.implementationStatus),
      nextReview: apiControl.value.nextReviewAt || '',
      evidences: [] as Evidence[],
      tasks: [] as Task[],
      requirements: [] as ControlRequirement[],
      risks: [] as Risk[],
      documents: [] as Document[],
      thirdParties: [] as ThirdParty[]
    }
  }
  return {
    code: controlId.value,
    name: controlId.value,
    description: '',
    owner: { name: 'Unassigned', id: '' },
    frameworks: [] as string[],
    status: 'not_started' as ControlStatus,
    nextReview: '',
    evidences: [] as Evidence[],
    tasks: [] as Task[],
    requirements: [] as ControlRequirement[],
    risks: [] as Risk[],
    documents: [] as Document[],
    thirdParties: [] as ThirdParty[]
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
const activeTab = ref<'evidences' | 'tasks' | 'requirements' | 'risks' | 'documents' | 'thirdParties'>('requirements')

const { data: reqData, isPending: reqIsPending } = useControlRequirementsQuery(controlId)
const requirements = computed(() => reqData.value?.tenantRequirementControlMaps || [])

// Back navigation
function goBack() {
  void router.push({
    name: 'compliance-controls',
    params: { organizationSlug: orgSlug.value }
  })
}

// Edit Dialog
const isEditDialogOpen = ref(false)
const editName = ref('')
const editDescription = ref('')
const editOwnerId = ref('')

function openEditDialog() {
  if (control.value) {
    editName.value = control.value.name
    editDescription.value = control.value.description
    editOwnerId.value = control.value.owner.id
    isEditDialogOpen.value = true
  }
}

function saveEdit() {
  if (control.value) {
    controlsStore.updateControlDetails(control.value.code, {
      name: editName.value.trim(),
      description: editDescription.value.trim(),
      ownerId: editOwnerId.value
    })
    isEditDialogOpen.value = false
  }
}

// Status dropdown change
function onStatusChange(newVal: any) {
  if (control.value && typeof newVal === 'string') {
    controlsStore.updateControlStatus(control.value.code, newVal as ControlStatus)
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
      fileSize: evFileSize.value
    })
    isEvidenceDialogOpen.value = false
  }
}

// Task Dialog State
const isTaskDialogOpen = ref(false)
const taskDescription = ref('')
const taskDueDate = ref(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '')
const taskAssigneeId = ref('daniel')

function openTaskDialog() {
  taskDescription.value = ''
  taskDueDate.value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || ''
  taskAssigneeId.value = control.value?.owner.id || 'daniel'
  isTaskDialogOpen.value = true
}

function submitTask() {
  if (!taskDescription.value.trim()) return
  const rawAssignee = OWNER_LIST.find((o) => o.id === taskAssigneeId.value) || OWNER_LIST[0] || { name: 'Daniel Kim', initials: 'DK' }
  const assignee = {
    name: rawAssignee.name,
    initials: rawAssignee.initials
  }
  if (control.value) {
    controlsStore.addTask(control.value.code, {
      description: taskDescription.value.trim(),
      dueDate: taskDueDate.value || '',
      assignee
    })
    isTaskDialogOpen.value = false
  }
}

// Requirement Linking Dialog (Removed mock implementations)
function unlinkRequirement(mapId: string) {
  alert('Unlink not implemented with real API yet')
}

// Risk Linking Dialog
const isRiskDialogOpen = ref(false)
const searchRisk = ref('')
const mockAllRisks: Risk[] = [
  { id: 'RSK-01', description: 'Unauthorized deployment of production infrastructure changes', level: 'High' },
  { id: 'RSK-02', description: 'Compromised admin credentials via social engineering', level: 'Critical' },
  { id: 'RSK-03', description: 'Data loss due to lack of verified backups and recovery plans', level: 'High' },
  { id: 'RSK-04', description: 'Insecure data transmissions over public networks', level: 'Medium' },
  { id: 'RSK-05', description: 'Unauthorized access via orphaned employee accounts', level: 'High' }
]

const availableRisks = computed(() => {
  const linkedIds = control.value?.risks.map((r) => r.id) || []
  return mockAllRisks
    .filter((risk) => !linkedIds.includes(risk.id))
    .filter((risk) => {
      const q = searchRisk.value.toLowerCase()
      return !q || `${risk.id} ${risk.description}`.toLowerCase().includes(q)
    })
})

function linkRisk(risk: Risk) {
  if (control.value) {
    controlsStore.linkRisk(control.value.code, risk)
    isRiskDialogOpen.value = false
  }
}

// Document Linking Dialog
const isDocDialogOpen = ref(false)
const searchDoc = ref('')
const mockAllDocs: Document[] = [
  { id: 'doc-01', name: 'Information Security Policy', version: 'v3.2', status: 'Approved' },
  { id: 'doc-02', name: 'Access Control Procedure', version: 'v1.4', status: 'Under Review' },
  { id: 'doc-03', name: 'Disaster Recovery Plan', version: 'v2.0', status: 'Approved' },
  { id: 'doc-04', name: 'Vulnerability Management Standard', version: 'v1.1', status: 'Approved' },
  { id: 'doc-05', name: 'Data Classification Guide', version: 'v1.0', status: 'Draft' }
]

const availableDocs = computed(() => {
  const linkedIds = control.value?.documents.map((d) => d.id) || []
  return mockAllDocs
    .filter((doc) => !linkedIds.includes(doc.id))
    .filter((doc) => {
      const q = searchDoc.value.toLowerCase()
      return !q || `${doc.name}`.toLowerCase().includes(q)
    })
})

function linkDoc(doc: Document) {
  if (control.value) {
    controlsStore.linkDocument(control.value.code, doc)
    isDocDialogOpen.value = false
  }
}

// Vendor Linking Dialog
const isVendorDialogOpen = ref(false)
const searchVendor = ref('')
const mockAllVendors: ThirdParty[] = [
  { id: 'tp-01', name: 'Amazon Web Services', service: 'Infrastructure Hosting', status: 'Approved' },
  { id: 'tp-02', name: 'Okta Identity', service: 'Single Sign On & MFA', status: 'Approved' },
  { id: 'tp-03', name: 'Slack Technologies', service: 'Internal Communications', status: 'Approved' },
  { id: 'tp-04', name: 'GitHub Inc', service: 'Source Code Hosting', status: 'Approved' },
  { id: 'tp-05', name: 'Zoom Video', service: 'Video Conferencing', status: 'Pending Review' }
]

const availableVendors = computed(() => {
  const linkedIds = control.value?.thirdParties.map((t) => t.id) || []
  return mockAllVendors
    .filter((v) => !linkedIds.includes(v.id))
    .filter((v) => {
      const q = searchVendor.value.toLowerCase()
      return !q || `${v.name} ${v.service}`.toLowerCase().includes(q)
    })
})

function linkVendor(v: ThirdParty) {
  if (control.value) {
    controlsStore.linkThirdParty(control.value.code, v)
    isVendorDialogOpen.value = false
  }
}

// Helpers
const getFrameworkLabel = (id: string) => FRAMEWORKS[id as keyof typeof FRAMEWORKS]?.label || id.toUpperCase()

const statusConfig = computed(() => {
  const s = control.value?.status
  if (s === 'passing') return { base: 'var(--success-emphasis)', bg: 'color-mix(in oklab, var(--success-emphasis) 10%, transparent)' }
  if (s === 'attention') return { base: 'var(--warning-emphasis)', bg: 'color-mix(in oklab, var(--warning-emphasis) 10%, transparent)' }
  if (s === 'failing') return { base: 'var(--destructive-emphasis)', bg: 'color-mix(in oklab, var(--destructive-emphasis) 10%, transparent)' }
  return { base: 'var(--muted-foreground)', bg: 'transparent' }
})

const getRiskLevelClass = (level: string) => {
  if (level === 'Critical' || level === 'High') return 'bg-destructive/10 text-destructive border-destructive/20'
  if (level === 'Medium') return 'bg-warning/10 text-warning-emphasis border-warning/20'
  return 'bg-muted/80 text-muted-foreground border-border'
}

const getDocStatusClass = (status: string) => {
  if (status === 'Approved') return 'bg-success/10 text-success border-success/20'
  if (status === 'Under Review') return 'bg-warning/10 text-warning-emphasis border-warning/20'
  return 'bg-muted text-muted-foreground border-border'
}

function handleNotImplemented() {
  alert('Not implemented')
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

function goToRequirement(map: any) {
  void router.push({
    name: 'compliance-framework-requirements',
    params: {
      organizationSlug: orgSlug.value,
      frameworkId: map.tenantRequirementAssessment.tenantFrameworkId,
    },
    query: {
      selectedId: map.tenantRequirementAssessment.$id
    }
  })
}
</script>

<template>
  <div v-if="control">
    <!-- Breadcrumb -->
    <div class="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
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
          <span class="inline-flex items-center rounded border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground uppercase leading-none">
            {{ control.code }}
          </span>
          <ControlStatusBadge :status="control.status" />
        </div>
        <h1 class="text-xl font-semibold tracking-tight text-foreground sm:text-2xl" style="text-wrap: balance">
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
        <Button variant="outline" size="sm" @click="openEditDialog" class="gap-1.5 font-semibold text-xs h-8">
          <PhPencilSimple :size="15" />
          Edit
        </Button>

        <Select :model-value="control.status" @update:model-value="onStatusChange">
          <SelectTrigger
            size="sm"
            class="h-8 min-w-[130px] font-semibold text-xs"
            :style="{ backgroundColor: statusConfig.bg, color: statusConfig.base, borderColor: 'color-mix(in oklab, ' + statusConfig.base + ' 25%, transparent)' }"
            aria-label="Change status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="passing">Passing</SelectItem>
            <SelectItem value="attention">Attention</SelectItem>
            <SelectItem value="failing">Failing</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="icon-sm" class="h-8 w-8 text-muted-foreground hover:text-foreground">
              <PhDotsThreeOutline :size="15" weight="fill" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-[140px]">
            <DropdownMenuItem @click="deleteControl" class="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
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
        <PhUser :size="13" class="text-primary" />
        {{ control.owner.name }}
      </span>
      <span class="text-border" aria-hidden="true">·</span>
      <span class="inline-flex items-center gap-1.5">
        <PhShieldCheck :size="13" class="text-success" />
        {{ control.frameworks.map(f => getFrameworkLabel(f)).join(', ') }}
      </span>
      <span class="text-border" aria-hidden="true">·</span>
      <span class="inline-flex items-center gap-1.5">
        <PhClock :size="13" class="text-info" />
        Review {{ formatDate(control.nextReview) }}
      </span>
    </div>

    <!-- Tabbed Lists -->
    <div class="space-y-4">
      <!-- Tabs header -->
      <div class="flex border-b border-border overflow-x-auto scrollbar-none" role="tablist">
        <button
          v-for="t in [
            { id: 'evidences', label: 'Evidences', count: control.evidences.length },
            { id: 'tasks', label: 'Tasks', count: control.tasks.length },
            { id: 'requirements', label: 'Requirements', count: requirements.length },
            { id: 'risks', label: 'Risks', count: control.risks.length },
            { id: 'documents', label: 'Documents', count: control.documents.length },
            { id: 'thirdParties', label: 'Third parties', count: control.thirdParties.length }
          ]"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === t.id"
          @click="activeTab = t.id as any"
          class="relative px-4 pb-3 text-sm font-medium transition-colors focus-visible:outline-none whitespace-nowrap"
          :class="activeTab === t.id ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'"
        >
          {{ t.label }}
          <span
            v-if="t.count > 0"
            class="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            :class="activeTab === t.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'"
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
              <tr class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium">
                <th class="px-5 py-2.5">Description</th>
                <th class="px-5 py-2.5">File type</th>
                <th class="px-5 py-2.5">File size</th>
                <th class="px-5 py-2.5">Created at</th>
                <th class="px-5 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in control.evidences" :key="e.id" class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors">
                <td class="px-5 py-3.5 font-medium text-foreground">{{ e.description }}</td>
                <td class="px-5 py-3.5 text-muted-foreground font-mono text-xs">{{ e.fileType }}</td>
                <td class="px-5 py-3.5 text-muted-foreground tabular-nums text-xs">{{ e.fileSize }}</td>
                <td class="px-5 py-3.5 text-muted-foreground tabular-nums text-xs">{{ formatDate(e.createdAt) }}</td>
                <td class="px-5 py-3.5 text-right">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-destructive hover:bg-destructive/10" @click="controlsStore.removeEvidence(control.code, e.id)">
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
            <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3">
              <PhFileText :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No evidence linked yet</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">Link documents, settings reports or file logs to satisfy this control.</p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button size="sm" variant="ghost" class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5" @click="openEvidenceDialog">
              <PhPlus :size="14" weight="bold" />
              Add evidence
            </Button>
          </div>
        </div>

        <!-- Tasks Tab -->
        <div v-if="activeTab === 'tasks'">
          <table v-if="control.tasks.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium">
                <th class="px-5 py-2.5">Description</th>
                <th class="px-5 py-2.5">Due date</th>
                <th class="px-5 py-2.5">Assignee</th>
                <th class="px-5 py-2.5">Status</th>
                <th class="px-5 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in control.tasks" :key="t.id" class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors">
                <td class="px-5 py-3.5 font-medium" :class="t.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'">
                  {{ t.description }}
                </td>
                <td class="px-5 py-3.5 text-muted-foreground tabular-nums text-xs">{{ formatDate(t.dueDate) }}</td>
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-1.5">
                    <Avatar class="size-5 shrink-0">
                      <AvatarFallback class="bg-secondary text-[8px] font-bold text-secondary-foreground">
                        {{ t.assignee.initials }}
                      </AvatarFallback>
                    </Avatar>
                    <span class="text-xs text-muted-foreground">{{ t.assignee.name }}</span>
                  </div>
                </td>
                <td class="px-5 py-3.5">
                  <button
                    @click="controlsStore.toggleTaskStatus(control.code, t.id)"
                    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border leading-none transition-colors cursor-pointer"
                    :class="
                      t.status === 'completed'
                        ? 'bg-success/10 border-success/20 text-success'
                        : t.status === 'in_progress'
                          ? 'bg-warning/10 border-warning/20 text-warning-emphasis'
                          : 'bg-muted border-border text-muted-foreground'
                    "
                  >
                    <component :is="t.status === 'completed' ? PhChecks : t.status === 'in_progress' ? PhClock : PhCircle" :size="10" />
                    {{ t.status === 'completed' ? 'Completed' : t.status === 'in_progress' ? 'In Progress' : 'Not Started' }}
                  </button>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <Button variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-destructive hover:bg-destructive/10" @click="controlsStore.removeTask(control.code, t.id)">
                    <PhTrash :size="14" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3">
              <PhCheckCircle :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No tasks open</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">Create review tasks or corrective actions to assign to team members.</p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button size="sm" variant="ghost" class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5" @click="openTaskDialog">
              <PhPlus :size="14" weight="bold" />
              Add task
            </Button>
          </div>
        </div>

        <!-- Requirements Tab -->
        <div v-if="activeTab === 'requirements'">
          <table v-if="requirements.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium">
                <th class="px-5 py-2.5 w-[20%]">Reference</th>
                <th class="px-5 py-2.5 w-[65%]">Name</th>
                <th class="px-5 py-2.5 w-[15%] text-right"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="map in requirements" :key="map.$id" class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors">
                <td class="px-5 py-3.5 align-top">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-foreground bg-muted border border-border px-1.5 py-0.5 rounded font-mono">
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
                    v-if="map.tenantRequirementAssessment.frameworkNode.description && map.tenantRequirementAssessment.frameworkNode.description.length > 160"
                    type="button"
                    class="mt-1 text-[10px] font-semibold text-primary hover:text-primary/85 transition-colors focus-visible:outline-none focus-visible:underline cursor-pointer"
                    @click="toggleRequirementDescription(map.$id)"
                  >
                    {{ expandedRequirementIds.has(map.$id) ? 'Show less' : 'Show more' }}
                  </button>
                </td>
                <td class="px-5 py-3.5 text-right align-top">
                  <Button variant="outline" size="sm" class="h-7 text-xs border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-semibold" @click="unlinkRequirement(map.$id)">
                    Unlink
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else-if="reqIsPending" class="py-14 flex flex-col items-center justify-center text-center">
            <p class="text-sm font-medium text-muted-foreground">Loading requirements...</p>
          </div>
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3">
              <PhGavel :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No linked requirements</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">Map this control to framework requirements to prove compliance coverage.</p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button size="sm" variant="ghost" class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5" @click="handleNotImplemented">
              <PhPlus :size="14" weight="bold" />
              Link requirement
            </Button>
          </div>
        </div>

        <!-- Risks Tab -->
        <div v-if="activeTab === 'risks'">
          <table v-if="control.risks.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium">
                <th class="px-5 py-2.5 w-[20%]">Risk ID</th>
                <th class="px-5 py-2.5 w-[55%]">Description</th>
                <th class="px-5 py-2.5 w-[15%]">Level</th>
                <th class="px-5 py-2.5 w-[10%] text-right"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in control.risks" :key="r.id" class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors">
                <td class="px-5 py-3.5 font-mono font-semibold text-xs text-muted-foreground">{{ r.id }}</td>
                <td class="px-5 py-3.5 font-medium text-foreground">{{ r.description }}</td>
                <td class="px-5 py-3.5">
                  <span class="inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-semibold" :class="getRiskLevelClass(r.level)">
                    {{ r.level }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <Button variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-destructive hover:bg-destructive/10" @click="controlsStore.unlinkRisk(control.code, r.id)">
                    <PhTrash :size="14" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3">
              <PhWarning :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No linked risks</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">Link organizational risks that are mitigated or managed by this control.</p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button size="sm" variant="ghost" class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5" @click="isRiskDialogOpen = true">
              <PhPlus :size="14" weight="bold" />
              Link risk
            </Button>
          </div>
        </div>

        <!-- Documents Tab -->
        <div v-if="activeTab === 'documents'">
          <table v-if="control.documents.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium">
                <th class="px-5 py-2.5">Name</th>
                <th class="px-5 py-2.5">Version</th>
                <th class="px-5 py-2.5">Status</th>
                <th class="px-5 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in control.documents" :key="d.id" class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors">
                <td class="px-5 py-3.5 font-medium text-foreground hover:text-primary hover:underline cursor-pointer">{{ d.name }}</td>
                <td class="px-5 py-3.5 text-muted-foreground text-xs font-mono">{{ d.version }}</td>
                <td class="px-5 py-3.5">
                  <span class="inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-semibold" :class="getDocStatusClass(d.status)">
                    {{ d.status }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <Button variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-destructive hover:bg-destructive/10" @click="controlsStore.unlinkDocument(control.code, d.id)">
                    <PhTrash :size="14" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3">
              <PhFileText :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No documents linked</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">Link standard policy files or organizational guidelines supporting this control.</p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button size="sm" variant="ghost" class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5" @click="isDocDialogOpen = true">
              <PhPlus :size="14" weight="bold" />
              Link document
            </Button>
          </div>
        </div>

        <!-- Third Parties Tab -->
        <div v-if="activeTab === 'thirdParties'">
          <table v-if="control.thirdParties.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium">
                <th class="px-5 py-2.5">Vendor</th>
                <th class="px-5 py-2.5">Service</th>
                <th class="px-5 py-2.5">Compliance Status</th>
                <th class="px-5 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in control.thirdParties" :key="v.id" class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors">
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
                  <Button variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-destructive hover:bg-destructive/10" @click="controlsStore.unlinkThirdParty(control.code, v.id)">
                    <PhTrash :size="14" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-14 flex flex-col items-center justify-center text-center">
            <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-3">
              <PhFolderOpen :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No third parties linked</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">Link third-party vendors or external systems that are monitored or scoped in this control.</p>
          </div>
          <div class="border-t border-border p-3 flex justify-center">
            <Button size="sm" variant="ghost" class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5" @click="isVendorDialogOpen = true">
              <PhPlus :size="14" weight="bold" />
              Link third party
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Control Details</DialogTitle>
          <DialogDescription>Update control definitions and configurations.</DialogDescription>
        </DialogHeader>
        <form @submit.prevent="saveEdit" class="space-y-4 py-3">
          <div class="space-y-1.5">
            <Label for="edit-code">Control Code</Label>
            <Input id="edit-code" :value="control.code" disabled class="bg-muted text-muted-foreground" />
          </div>
          <div class="space-y-1.5">
            <Label for="edit-name">Control Name</Label>
            <Input id="edit-name" v-model="editName" required />
          </div>
          <div class="space-y-1.5">
            <Label for="edit-desc">Description</Label>
            <textarea
              id="edit-desc"
              v-model="editDescription"
              rows="3"
              class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            ></textarea>
          </div>
          <div class="space-y-1.5">
            <Label for="edit-owner">Owner</Label>
            <Select v-model="editOwnerId">
              <SelectTrigger id="edit-owner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="owner in OWNER_LIST" :key="owner.id" :value="owner.id">
                  {{ owner.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter class="pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" @click="isEditDialogOpen = false">Cancel</Button>
            <Button type="submit" size="sm" class="bg-primary text-primary-foreground">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Evidence Dialog -->
    <Dialog :open="isEvidenceDialogOpen" @update:open="isEvidenceDialogOpen = $event">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Evidence Document</DialogTitle>
          <DialogDescription>Simulate uploading an evidence report or settings snapshot.</DialogDescription>
        </DialogHeader>
        <form @submit.prevent="submitEvidence" class="space-y-4 py-3">
          <div class="space-y-1.5">
            <Label for="ev-desc">Evidence Description</Label>
            <Input id="ev-desc" v-model="evDescription" placeholder="e.g. AWS Security Group configs Q2" required />
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
            <Button type="button" variant="outline" size="sm" @click="isEvidenceDialogOpen = false">Cancel</Button>
            <Button type="submit" size="sm" class="bg-primary text-primary-foreground">Add evidence</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Task Dialog -->
    <Dialog :open="isTaskDialogOpen" @update:open="isTaskDialogOpen = $event">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Assign a review task or audit prep task to a team member.</DialogDescription>
        </DialogHeader>
        <form @submit.prevent="submitTask" class="space-y-4 py-3">
          <div class="space-y-1.5">
            <Label for="task-desc">Task Description</Label>
            <Input id="task-desc" v-model="taskDescription" placeholder="e.g. Review MFA bypass groups list" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="task-due">Due Date</Label>
              <Input id="task-due" type="date" v-model="taskDueDate" required />
            </div>
            <div class="space-y-1.5">
              <Label for="task-assignee">Assignee</Label>
              <Select v-model="taskAssigneeId">
                <SelectTrigger id="task-assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="owner in OWNER_LIST" :key="owner.id" :value="owner.id">
                    {{ owner.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter class="pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" @click="isTaskDialogOpen = false">Cancel</Button>
            <Button type="submit" size="sm" class="bg-primary text-primary-foreground">Create task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>


    <!-- Link Risk Dialog -->
    <Dialog :open="isRiskDialogOpen" @update:open="isRiskDialogOpen = $event">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Link Risk</DialogTitle>
          <DialogDescription>Link catalog risks mitigated by control {{ control.code }}.</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-3">
          <div class="relative">
            <PhMagnifyingGlass :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="searchRisk" class="pl-9" placeholder="Search risks..." />
          </div>
          <div class="max-h-[280px] overflow-y-auto border border-border rounded-md divide-y divide-border">
            <div
              v-for="risk in availableRisks"
              :key="risk.id"
              class="p-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 cursor-pointer"
              @click="linkRisk(risk)"
            >
              <div class="min-w-0">
                <span class="font-mono text-[10px] font-bold text-muted-foreground bg-muted border px-1.5 py-0.5 rounded">
                  {{ risk.id }}
                </span>
                <p class="text-xs font-medium text-foreground mt-2">{{ risk.description }}</p>
              </div>
              <Button size="sm" variant="outline" class="shrink-0 text-[10px] font-semibold border-border">Link</Button>
            </div>
            <div v-if="!availableRisks.length" class="p-8 text-center text-xs text-muted-foreground">
              No matching risks found.
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
          <DialogDescription>Link policy manuals or procedural guidelines to control {{ control.code }}.</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-3">
          <div class="relative">
            <PhMagnifyingGlass :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="searchDoc" class="pl-9" placeholder="Search documents..." />
          </div>
          <div class="max-h-[280px] overflow-y-auto border border-border rounded-md divide-y divide-border">
            <div
              v-for="doc in availableDocs"
              :key="doc.id"
              class="p-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 cursor-pointer"
              @click="linkDoc(doc)"
            >
              <div class="min-w-0">
                <h4 class="text-xs font-semibold text-foreground">{{ doc.name }}</h4>
                <p class="text-[10px] text-muted-foreground mt-1 font-mono">{{ doc.version }} • {{ doc.status }}</p>
              </div>
              <Button size="sm" variant="outline" class="shrink-0 text-[10px] font-semibold border-border">Link</Button>
            </div>
            <div v-if="!availableDocs.length" class="p-8 text-center text-xs text-muted-foreground">
              No matching documents found.
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
          <DialogDescription>Map scoped vendors or external service providers to control {{ control.code }}.</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-3">
          <div class="relative">
            <PhMagnifyingGlass :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="searchVendor" class="pl-9" placeholder="Search vendors..." />
          </div>
          <div class="max-h-[280px] overflow-y-auto border border-border rounded-md divide-y divide-border">
            <div
              v-for="v in availableVendors"
              :key="v.id"
              class="p-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 cursor-pointer"
              @click="linkVendor(v)"
            >
              <div class="min-w-0">
                <h4 class="text-xs font-semibold text-foreground">{{ v.name }}</h4>
                <p class="text-[10px] text-muted-foreground mt-0.5">{{ v.service }} • {{ v.status }}</p>
              </div>
              <Button size="sm" variant="outline" class="shrink-0 text-[10px] font-semibold border-border">Link</Button>
            </div>
            <div v-if="!availableVendors.length" class="p-8 text-center text-xs text-muted-foreground">
              No matching vendors found.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
  <div v-else class="py-16 flex items-center justify-center">
    <div class="flex flex-col items-center text-center rounded-lg border border-destructive/20 bg-destructive/5 px-10 py-10">
      <span class="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <PhWarning :size="24" />
      </span>
      <h3 class="font-semibold text-foreground">Control Not Found</h3>
      <p class="text-sm text-muted-foreground mt-1.5 max-w-[300px]">The control you are trying to view does not exist or has been deleted.</p>
      <Button size="sm" variant="outline" @click="goBack" class="mt-5">Back to controls</Button>
    </div>
  </div>
</template>
