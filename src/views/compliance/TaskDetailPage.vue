<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhCaretRight,
  PhPlus,
  PhTrash,
  PhFileText,
  PhShieldCheck,
  PhWarning,
  PhClock,
  PhCheckCircle,
  PhDownload,
  PhSliders,
  PhLink,
  PhFolderOpen,
  PhUser,
  PhBuildings,
  PhPencilSimple,
  PhCircle,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import { useTenantTaskQuery, useUpdateTenantTaskMutation } from '@/composables/useTasks'
import { useTenantControlsQuery } from '@/composables/useControls'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import TaskDialog from '@/components/compliance/TaskDialog.vue'
import TaskStatusBadge from '@/components/compliance/TaskStatusBadge.vue'

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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const route = useRoute()
const router = useRouter()

const taskId = computed(() => route.params.taskId as string)
const orgSlug = computed(() => route.params.organizationSlug as string)

// Fetch task data
const { data: task, isPending: isTaskLoading, isError, error } = useTenantTaskQuery(taskId)

// Update task mutation
const updateTaskMutation = useUpdateTenantTaskMutation()

// Fetch tenant controls for linking controls
const { data: controlsData } = useTenantControlsQuery(ref(100), ref(0))
const allControls = computed(() => controlsData.value?.tenantControls || [])

// Back navigation
function goBack() {
  void router.push({
    name: 'compliance-overview',
    params: { organizationSlug: orgSlug.value },
  })
}

// User Initials helper
function getUserInitials(name: string) {
  if (!name) return '--'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Status badge styling helper
const statusConfig = computed(() => {
  const status = task.value?.status?.toLowerCase() || 'pending'
  if (status === 'completed') {
    return {
      label: 'Completed',
      icon: PhCheckCircle,
      base: 'var(--success-emphasis)',
      bg: 'color-mix(in oklab, var(--success-emphasis) 12%, transparent)',
    }
  }
  if (status === 'in_progress') {
    return {
      label: 'In progress',
      icon: PhClock,
      base: 'var(--primary)',
      bg: 'color-mix(in oklab, var(--primary) 12%, transparent)',
    }
  }
  if (status === 'not_started' || status === 'to_do' || status === 'todo') {
    return {
      label: 'To do',
      icon: PhCircle,
      base: 'var(--muted-foreground)',
      bg: 'color-mix(in oklab, var(--muted-foreground) 12%, transparent)',
    }
  }
  return {
    label: 'Pending',
    icon: PhWarningCircle,
    base: 'var(--warning-emphasis)',
    bg: 'color-mix(in oklab, var(--warning-emphasis) 12%, transparent)',
  }
})

// Update status
function onStatusChange(newStatus: any) {
  if (!task.value) return
  updateTaskMutation.mutate({
    taskId: taskId.value,
    updates: {
      status: String(newStatus),
    },
  })
}

// Update assignee
function onAssigneeChange(newAssigneeId: any) {
  if (!task.value) return
  updateTaskMutation.mutate({
    taskId: taskId.value,
    updates: {
      assigneeId: newAssigneeId === 'unassigned' ? null : String(newAssigneeId),
    },
  })
}

// Edit Task state and functions
const isEditDialogOpen = ref(false)

function openEditDialog() {
  isEditDialogOpen.value = true
}

function saveEdit(payload: any) {
  if (!task.value) return
  const updates = {
    title: payload.title,
    description: payload.description,
    status: payload.status,
    assigneeId: payload.assigneeId,
    department: payload.department,
    type: payload.type,
    frequency: payload.frequency,
  }
  updateTaskMutation.mutate(
    {
      taskId: taskId.value,
      updates,
    },
    {
      onSuccess: () => {
        isEditDialogOpen.value = false
      },
    },
  )
}

// Tabs state
const activeTab = ref<'evidences' | 'controls' | 'documents'>('evidences')

// Local mock states for GRC items (since API is coming soon)
const mockEvidences = ref([
  {
    id: 'ev-1',
    description: 'Secrets manager configuration screenshot',
    fileType: 'PNG',
    fileSize: '2.4 MB',
    createdAt: '2026-07-16T16:01:07.527Z',
  },
  {
    id: 'ev-2',
    description: 'AWS KMS Key rotation policy review',
    fileType: 'PDF',
    fileSize: '1.8 MB',
    createdAt: '2026-07-16T16:05:00.000Z',
  },
])

const mockControls = ref([
  {
    id: 'c-1',
    controlKey: 'CC6.1',
    name: 'Access Authorization & Role Management',
    implementationStatus: 'implemented',
  },
  {
    id: 'c-2',
    controlKey: 'CC6.3',
    name: 'Access Modification & Offboarding Reviews',
    implementationStatus: 'in_progress',
  },
])

const mockDocuments = ref([
  {
    id: 'doc-1',
    name: 'Secrets Management Policy & Procedures',
    version: 'v2.1',
    status: 'Approved',
  },
  {
    id: 'doc-2',
    name: 'Access Control Guideline Standard',
    version: 'v1.4',
    status: 'Under Review',
  },
])

// Add Evidence Dialog
const isEvidenceDialogOpen = ref(false)
const newEvidenceDesc = ref('')
const newEvidenceType = ref('PDF')
const newEvidenceSize = ref('1.2 MB')

function openEvidenceDialog() {
  newEvidenceDesc.value = ''
  newEvidenceType.value = 'PDF'
  newEvidenceSize.value = '1.2 MB'
  isEvidenceDialogOpen.value = true
}

function handleAddEvidence() {
  if (!newEvidenceDesc.value.trim()) return
  mockEvidences.value.push({
    id: `ev-${Date.now()}`,
    description: newEvidenceDesc.value.trim(),
    fileType: newEvidenceType.value,
    fileSize: newEvidenceSize.value,
    createdAt: new Date().toISOString(),
  })
  isEvidenceDialogOpen.value = false
}

function removeEvidence(id: string) {
  mockEvidences.value = mockEvidences.value.filter((e) => e.id !== id)
}

// Link Control Dialog
const isControlDialogOpen = ref(false)
const selectedControlId = ref('')

const availableControlsToLink = computed(() => {
  return allControls.value.filter(
    (c) => !mockControls.value.some((mc) => mc.controlKey === c.controlKey),
  )
})

function openControlDialog() {
  selectedControlId.value = ''
  isControlDialogOpen.value = true
}

function handleLinkControl() {
  if (!selectedControlId.value) return
  const controlToLink = allControls.value.find((c) => c.$id === selectedControlId.value)
  if (controlToLink) {
    mockControls.value.push({
      id: controlToLink.$id,
      controlKey: controlToLink.controlKey,
      name: controlToLink.name,
      implementationStatus: controlToLink.implementationStatus,
    })
  }
  isControlDialogOpen.value = false
}

function unlinkControl(controlKey: string) {
  mockControls.value = mockControls.value.filter((c) => c.controlKey !== controlKey)
}

// Link Document Dialog
const isDocumentDialogOpen = ref(false)
const newDocName = ref('')
const newDocVersion = ref('v1.0')
const newDocStatus = ref('Draft')

function openDocumentDialog() {
  newDocName.value = ''
  newDocVersion.value = 'v1.0'
  newDocStatus.value = 'Draft'
  isDocumentDialogOpen.value = true
}

function handleLinkDocument() {
  if (!newDocName.value.trim()) return
  mockDocuments.value.push({
    id: `doc-${Date.now()}`,
    name: newDocName.value.trim(),
    version: newDocVersion.value,
    status: newDocStatus.value as any,
  })
  isDocumentDialogOpen.value = false
}

function unlinkDocument(id: string) {
  mockDocuments.value = mockDocuments.value.filter((d) => d.id !== id)
}

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

function getControlStatusClass(status: string) {
  if (status === 'implemented') return 'bg-success/10 text-success border-success/20'
  if (status === 'in_progress' || status === 'partially_implemented' || status === 'needs_review')
    return 'bg-warning/10 text-warning-emphasis border-warning/20'
  return 'bg-muted text-muted-foreground border-border'
}

function getDocStatusClass(status: string) {
  if (status === 'Approved') return 'bg-success/10 text-success border-success/20'
  if (status === 'Under Review') return 'bg-warning/10 text-warning-emphasis border-warning/20'
  return 'bg-muted text-muted-foreground border-border'
}
</script>

<template>
  <ClarusLoadingState
    v-if="isTaskLoading && !task"
    variant="control-header"
    label="Loading task details"
  />

  <div v-else-if="isError" class="py-14 flex flex-col items-center justify-center text-center">
    <span
      class="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3"
    >
      <PhWarning :size="22" />
    </span>
    <p class="text-sm font-medium text-foreground">Failed to load task</p>
    <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
      {{
        error?.message || 'The requested task could not be retrieved from the compliance engine.'
      }}
    </p>
    <Button size="sm" variant="outline" class="mt-4" @click="goBack"> Back to overview </Button>
  </div>

  <div v-else-if="task">
    <!-- Breadcrumb -->
    <div
      class="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground"
      aria-label="Breadcrumb"
    >
      <button @click="goBack" class="hover:text-foreground transition-colors cursor-pointer">
        Compliance Overview
      </button>
      <PhCaretRight :size="10" class="opacity-60" />
      <span class="font-medium text-foreground">Task Details</span>
    </div>

    <!-- Header & Actions -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-2 flex-1 min-w-0">
        <div class="flex items-center gap-3">
          <span
            class="inline-flex items-center rounded border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase leading-none"
          >
            Task details
          </span>
          <TaskStatusBadge :status="task.status" />
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          style="text-wrap: balance"
        >
          {{ task.title }}
        </h1>
        <p class="text-sm leading-relaxed text-muted-foreground max-w-3xl whitespace-pre-line">
          {{ task.description }}
        </p>
      </div>

      <!-- Quick Actions (Status Toggle) -->
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

        <Select :model-value="task.status" @update:model-value="onStatusChange">
          <SelectTrigger
            size="sm"
            class="h-8 min-w-[130px] font-semibold text-xs"
            :style="{
              backgroundColor: statusConfig.bg,
              color: statusConfig.base,
              borderColor: 'color-mix(in oklab, ' + statusConfig.base + ' 25%, transparent)',
            }"
            aria-label="Change task status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- Metadata Section -->
    <div
      class="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground bg-muted/30 px-3.5 py-2.5 rounded-lg border border-border/60"
    >
      <!-- Assignee -->
      <div class="inline-flex items-center gap-1.5">
        <PhUser :size="14" class="text-primary/70" />
        <span class="text-muted-foreground">Assignee:</span>
        <span
          v-if="task.assignee"
          class="font-medium text-foreground inline-flex items-center gap-1.5"
        >
          <Avatar class="size-4 shrink-0">
            <AvatarFallback class="text-[8px] font-bold">{{
              getUserInitials(task.assignee.name)
            }}</AvatarFallback>
          </Avatar>
          {{ task.assignee.name }}
        </span>
        <span v-else class="text-muted-foreground italic">Unassigned</span>
      </div>

      <span class="text-muted-foreground/35 select-none" aria-hidden="true">•</span>

      <!-- Department -->
      <div class="inline-flex items-center gap-1.5">
        <PhBuildings :size="14" class="text-info/80" />
        <span class="text-muted-foreground">Department:</span>
        <span class="font-semibold text-foreground capitalize">{{
          task.department || 'general'
        }}</span>
      </div>

      <span class="text-muted-foreground/35 select-none" aria-hidden="true">•</span>

      <!-- Type -->
      <div class="inline-flex items-center gap-1.5">
        <PhSliders :size="14" class="text-success/85" />
        <span class="text-muted-foreground">Type:</span>
        <span class="font-medium text-foreground capitalize">{{ task.type || 'manual' }}</span>
      </div>

      <span class="text-muted-foreground/35 select-none" aria-hidden="true">•</span>

      <!-- Frequency -->
      <div class="inline-flex items-center gap-1.5">
        <PhClock :size="14" class="text-warning-emphasis/80" />
        <span class="text-muted-foreground">Frequency:</span>
        <span class="font-medium text-foreground capitalize">{{
          task.frequency || 'one-time'
        }}</span>
      </div>
    </div>

    <!-- Tabbed Lists -->
    <div class="space-y-4">
      <!-- Tabs header -->
      <div class="flex border-b border-border overflow-x-auto scrollbar-none" role="tablist">
        <button
          v-for="t in [
            { id: 'evidences', label: 'Evidence', count: mockEvidences.length },
            { id: 'controls', label: 'Controls', count: mockControls.length },
            { id: 'documents', label: 'Documents', count: mockDocuments.length },
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
          <table v-if="mockEvidences.length" class="w-full text-left border-collapse text-sm">
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
                v-for="e in mockEvidences"
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
                        @click="removeEvidence(e.id)"
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
              Add screenshots or reports as proof of this task being completed.
            </p>
          </div>
          <div class="border-t border-border p-3 flex justify-center bg-muted/5">
            <Button
              size="sm"
              variant="ghost"
              class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 font-semibold"
              @click="openEvidenceDialog"
            >
              <PhPlus :size="14" weight="bold" />
              Add evidence
            </Button>
          </div>
        </div>

        <!-- Controls Tab -->
        <div v-if="activeTab === 'controls'">
          <table v-if="mockControls.length" class="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium"
              >
                <th class="px-5 py-2.5 w-[20%]">Control ID</th>
                <th class="px-5 py-2.5 w-[60%]">Name</th>
                <th class="px-5 py-2.5 w-[15%]">Status</th>
                <th class="px-5 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in mockControls"
                :key="c.controlKey"
                class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
              >
                <td class="px-5 py-3.5 align-top">
                  <span
                    class="inline-flex items-center rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs font-semibold text-muted-foreground uppercase leading-none"
                  >
                    {{ c.controlKey }}
                  </span>
                </td>
                <td class="px-5 py-3.5">
                  <router-link
                    :to="{
                      name: 'compliance-control-detail',
                      params: { organizationSlug: orgSlug, controlId: c.controlKey },
                    }"
                    class="font-medium text-foreground text-xs leading-normal hover:text-primary hover:underline"
                  >
                    {{ c.name }}
                  </router-link>
                </td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border capitalize"
                    :class="getControlStatusClass(c.implementationStatus)"
                  >
                    {{ c.implementationStatus.replace('_', ' ') }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    @click="unlinkControl(c.controlKey)"
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
              <PhShieldCheck :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No controls linked</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Link this task to framework controls to establish your compliance posture.
            </p>
          </div>
          <div class="border-t border-border p-3 flex justify-center bg-muted/5">
            <Button
              size="sm"
              variant="ghost"
              class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 font-semibold"
              @click="openControlDialog"
            >
              <PhPlus :size="14" weight="bold" />
              Link control
            </Button>
          </div>
        </div>

        <!-- Documents Tab -->
        <div v-if="activeTab === 'documents'">
          <table v-if="mockDocuments.length" class="w-full text-left border-collapse text-sm">
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
                v-for="d in mockDocuments"
                :key="d.id"
                class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
              >
                <td class="px-5 py-3.5 font-medium text-foreground">{{ d.name }}</td>
                <td class="px-5 py-3.5 text-muted-foreground text-xs font-mono">{{ d.version }}</td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
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
                    @click="unlinkDocument(d.id)"
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
            <p class="text-sm font-medium text-foreground">No documents linked</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Link related policy documents or organizational rules governing these controls.
            </p>
          </div>
          <div class="border-t border-border p-3 flex justify-center bg-muted/5">
            <Button
              size="sm"
              variant="ghost"
              class="w-full max-w-xs gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 font-semibold"
              @click="openDocumentDialog"
            >
              <PhPlus :size="14" weight="bold" />
              Link document
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Evidence Dialog -->
    <Dialog :open="isEvidenceDialogOpen" @update:open="isEvidenceDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Evidence</DialogTitle>
          <DialogDescription>
            Upload or reference evidence items proving task execution.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="handleAddEvidence" class="space-y-4 py-3">
          <div class="space-y-1.5">
            <Label for="ev-desc" class="text-xs font-semibold text-foreground"
              >Evidence Description</Label
            >
            <Input
              id="ev-desc"
              v-model="newEvidenceDesc"
              placeholder="e.g., Key Vault Policy screenshot"
              required
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="ev-type" class="text-xs font-semibold text-foreground">File Type</Label>
              <Select v-model="newEvidenceType">
                <SelectTrigger id="ev-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF Document</SelectItem>
                  <SelectItem value="PNG">PNG Image</SelectItem>
                  <SelectItem value="JPEG">JPEG Image</SelectItem>
                  <SelectItem value="JSON">JSON Log</SelectItem>
                  <SelectItem value="TXT">TXT File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label for="ev-size" class="text-xs font-semibold text-foreground">File Size</Label>
              <Input id="ev-size" v-model="newEvidenceSize" placeholder="e.g., 2.4 MB" />
            </div>
          </div>
          <DialogFooter class="pt-3">
            <Button type="button" variant="outline" size="sm" @click="isEvidenceDialogOpen = false">
              Cancel
            </Button>
            <Button type="submit" size="sm"> Add Evidence </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Link Control Dialog -->
    <Dialog :open="isControlDialogOpen" @update:open="isControlDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Control</DialogTitle>
          <DialogDescription>
            Map this task to one of the active tenant controls.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="handleLinkControl" class="space-y-4 py-3">
          <div class="space-y-1.5">
            <Label for="control-select" class="text-xs font-semibold text-foreground"
              >Select Control</Label
            >
            <Select v-model="selectedControlId">
              <SelectTrigger id="control-select" class="w-full text-left">
                <SelectValue placeholder="Choose a control..." />
              </SelectTrigger>
              <SelectContent class="max-h-[220px]">
                <SelectItem v-for="c in availableControlsToLink" :key="c.$id" :value="c.$id">
                  <div class="flex items-center gap-2">
                    <span
                      class="font-mono text-[10px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.25 rounded border border-border"
                    >
                      {{ c.controlKey }}
                    </span>
                    <span class="truncate">{{ c.name }}</span>
                  </div>
                </SelectItem>
                <div
                  v-if="!availableControlsToLink.length"
                  class="p-3 text-center text-xs text-muted-foreground"
                >
                  No unlinked controls available.
                </div>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter class="pt-3">
            <Button type="button" variant="outline" size="sm" @click="isControlDialogOpen = false">
              Cancel
            </Button>
            <Button type="submit" size="sm" :disabled="!selectedControlId"> Link Control </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Link Document Dialog -->
    <Dialog :open="isDocumentDialogOpen" @update:open="isDocumentDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Document</DialogTitle>
          <DialogDescription>
            Reference a security policy or procedure document for this task.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="handleLinkDocument" class="space-y-4 py-3">
          <div class="space-y-1.5">
            <Label for="doc-name" class="text-xs font-semibold text-foreground"
              >Document Name</Label
            >
            <Input
              id="doc-name"
              v-model="newDocName"
              placeholder="e.g., Cryptographic Key Management Standard"
              required
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="doc-version" class="text-xs font-semibold text-foreground">Version</Label>
              <Input id="doc-version" v-model="newDocVersion" placeholder="e.g., v1.0" />
            </div>
            <div class="space-y-1.5">
              <Label for="doc-status" class="text-xs font-semibold text-foreground">Status</Label>
              <Select v-model="newDocStatus">
                <SelectTrigger id="doc-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter class="pt-3">
            <Button type="button" variant="outline" size="sm" @click="isDocumentDialogOpen = false">
              Cancel
            </Button>
            <Button type="submit" size="sm"> Link Document </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Reusable Edit Task Dialog -->
    <TaskDialog
      v-if="isEditDialogOpen"
      v-model:open="isEditDialogOpen"
      :task="task"
      @save="saveEdit"
    />
  </div>
</template>
