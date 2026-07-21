<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhCaretRight,
  PhShieldCheck,
  PhWarning,
  PhClock,
  PhCheckCircle,
  PhSliders,
  PhFileText,
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
  useTaskDocumentsQuery,
} from '@/composables/useTasks'
import {
  useTaskEvidencesQuery,
  useDeleteEvidenceMutation,
  useDownloadEvidenceMutation,
} from '@/composables/useEvidence'
import { normalizeVersionStatus, formatDocumentVersion } from '@/composables/useDocuments'
import { getApiErrorMessage } from '@/lib/api'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import TaskDialog from '@/components/compliance/TaskDialog.vue'
import TaskStatusBadge from '@/components/compliance/TaskStatusBadge.vue'
import AddEvidenceDialog from '@/components/compliance/AddEvidenceDialog.vue'
import EvidenceTab from '@/components/compliance/EvidenceTab.vue'
import ControlsTable from '@/components/compliance/ControlsTable.vue'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const { data: taskDocsData, isPending: isTaskDocsLoading } = useTaskDocumentsQuery(taskId)
const taskDocuments = computed(() => taskDocsData.value?.documents || [])

const deleteEvidenceMutation = useDeleteEvidenceMutation()
const downloadEvidenceMutation = useDownloadEvidenceMutation()

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
    return {
      label: 'Rejected',
      classes: 'bg-destructive/10 text-destructive border-destructive/20',
    }
  return { label: 'Draft', classes: 'bg-muted text-muted-foreground border-border' }
}

function getDocTypeLabel(docType: string) {
  if (docType === 'policy') return 'Policy'
  if (docType === 'procedure') return 'Procedure'
  if (docType === 'sop') return 'SOP'
  return docType.charAt(0).toUpperCase() + docType.slice(1)
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
            { id: 'documents', label: 'Documents', count: taskDocuments.length },
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
          <ControlsTable
            v-if="isControlsLoading || taskControls.length"
            :controls="taskControls"
            :is-loading="isControlsLoading"
            :show-actions="false"
            :organization-slug="orgSlug"
          />
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
        </div>

        <!-- Documents Tab -->
        <div v-if="activeTab === 'documents'">
          <table v-if="taskDocuments.length" class="w-full text-left border-collapse text-sm">
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
                v-for="doc in taskDocuments"
                :key="doc.$id"
                class="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors cursor-pointer"
                @click="goToDocument(doc.$id)"
              >
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-2.5">
                    <span
                      class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground"
                    >
                      <PhFileText :size="16" />
                    </span>
                    <span
                      class="font-medium text-foreground text-xs leading-normal hover:text-primary hover:underline"
                    >
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
            v-else-if="isTaskDocsLoading"
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
              Policy documents and procedures mapped to this task will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Evidence Dialog -->
    <AddEvidenceDialog v-model:open="isEvidenceDialogOpen" :tenant-task-id="task.$id" />

    <!-- Reusable Edit Task Dialog -->
    <TaskDialog
      v-if="isEditDialogOpen"
      v-model:open="isEditDialogOpen"
      :task="task"
      @save="saveEdit"
    />
  </div>
</template>
