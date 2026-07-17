<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhCaretRight,
  PhPlus,
  PhTrash,
  PhShieldCheck,
  PhWarning,
  PhClock,
  PhCheckCircle,
  PhSliders,
  PhFolderOpen,
  PhUser,
  PhBuildings,
  PhPencilSimple,
  PhCircle,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import {
  useTenantTaskQuery,
  useUpdateTenantTaskMutation,
  useTaskControlsQuery,
} from '@/composables/useTasks'
import {
  useTaskEvidencesQuery,
  useDeleteEvidenceMutation,
  useDownloadEvidenceMutation,
} from '@/composables/useEvidence'
import { getApiErrorMessage } from '@/lib/api'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import TaskDialog from '@/components/compliance/TaskDialog.vue'
import TaskStatusBadge from '@/components/compliance/TaskStatusBadge.vue'
import AddEvidenceDialog from '@/components/compliance/AddEvidenceDialog.vue'
import EvidenceTab from '@/components/compliance/EvidenceTab.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

// Fetch task controls
const { data: taskControlsData, isPending: isControlsLoading } = useTaskControlsQuery(taskId)
const taskControls = computed(() => taskControlsData.value?.tenantControls || [])

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

interface EditTaskPayload {
  title?: string
  description?: string
  status?: string
  assigneeId?: string | null
  department?: string
  type?: string
  frequency?: string
}

// Update status
function onStatusChange(newStatus: unknown) {
  if (!task.value) return
  updateTaskMutation.mutate({
    taskId: taskId.value,
    updates: {
      status: String(newStatus),
    },
  })
}

// Edit Task state and functions
const isEditDialogOpen = ref(false)

function openEditDialog() {
  isEditDialogOpen.value = true
}

function saveEdit(payload: EditTaskPayload) {
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

// Fetch evidences
const { data: evidencesData, isPending: isEvidencesLoading } = useTaskEvidencesQuery(taskId)
const evidences = computed(() => evidencesData.value?.evidences || [])

const deleteEvidenceMutation = useDeleteEvidenceMutation()
const downloadEvidenceMutation = useDownloadEvidenceMutation()

const mockDocuments = ref<
  Array<{
    id: string
    name: string
    version: string
    status: 'Approved' | 'Under Review' | 'Draft'
  }>
>([
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

// Link Document Dialog
const isDocumentDialogOpen = ref(false)
const newDocName = ref('')
const newDocVersion = ref('v1.0')
const newDocStatus = ref<'Draft' | 'Under Review' | 'Approved'>('Draft')

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
    status: newDocStatus.value,
  })
  isDocumentDialogOpen.value = false
}

function unlinkDocument(id: string) {
  mockDocuments.value = mockDocuments.value.filter((d) => d.id !== id)
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
            { id: 'evidences', label: 'Evidence', count: evidences.length },
            { id: 'controls', label: 'Controls', count: taskControls.length },
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
          <EvidenceTab
            :evidences="evidences"
            :is-loading="isEvidencesLoading"
            :downloading-id="downloadingId"
            empty-description="Add screenshots or reports as proof of this task being completed."
            @download="downloadFile"
            @delete="removeEvidence"
            @add="openEvidenceDialog"
          />
        </div>

        <!-- Controls Tab -->
        <div v-if="activeTab === 'controls'">
          <div
            v-if="isControlsLoading"
            class="py-14 flex flex-col items-center justify-center text-center"
          >
            <p class="text-xs text-muted-foreground">Loading controls...</p>
          </div>
          <template v-else>
            <table v-if="taskControls.length" class="w-full text-left border-collapse text-sm">
              <thead>
                <tr
                  class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium"
                >
                  <th class="px-5 py-2.5 w-[25%]">Control ID</th>
                  <th class="px-5 py-2.5 w-[55%]">Name</th>
                  <th class="px-5 py-2.5 w-[20%]">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in taskControls"
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
                No controls are currently linked to this task.
              </p>
            </div>
          </template>
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
    <AddEvidenceDialog v-model:open="isEvidenceDialogOpen" :tenant-task-id="task.$id" />

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
