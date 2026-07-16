<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import {
  PhArrowUpRight,
  PhBuildings,
  PhCaretLeft,
  PhCaretRight,
  PhCheckCircle,
  PhClock,
  PhDotsThree,
  PhFunnelSimple,
  PhGear,
  PhMagnifyingGlass,
  PhPlus,
  PhRepeat,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import { useControlsStore } from '@/stores/controls'
import { useOrganizationStore } from '@/stores/organization'
import { useTenantUsersQuery } from '@/composables/useTenants'
import { useTasksQuery, useUpdateTenantTaskMutation, taskKeys } from '@/composables/useTasks'
import type { TenantTasksResponse, TenantTask } from '@/api/tasks'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type TaskFilter = 'all' | 'open' | 'overdue' | 'completed'

const props = withDefaults(
  defineProps<{
    controlId?: string
    controlKey?: string
    controlName?: string
    hideTitleSection?: boolean
    hideControlDetailsLink?: boolean
  }>(),
  {
    controlId: undefined,
    controlKey: undefined,
    controlName: undefined,
    hideTitleSection: false,
    hideControlDetailsLink: false,
  },
)

const emit = defineEmits<{
  (e: 'tasksUpdated', total: number): void
}>()

const controlsStore = useControlsStore()
const organizationStore = useOrganizationStore()
const queryClient = useQueryClient()
const updateTaskMutation = useUpdateTenantTaskMutation()
const router = useRouter()

const search = ref('')
const activeFilter = ref<TaskFilter>('all')
const isTaskDialogOpen = ref(false)

const editingTaskId = ref<string | null>(null)
const isEditing = computed(() => editingTaskId.value !== null)

const taskTitle = ref('')
const taskDescription = ref('')
const taskDueDate = ref('')
const taskControlCode = ref('')
const taskAssigneeId = ref('')
const taskStatus = ref('pending')
const taskDepartment = ref('general')
const taskType = ref('manual')
const taskFrequency = ref('one_time')

const today = new Date('2026-07-15T00:00:00')

const { data: usersData } = useTenantUsersQuery()
const users = computed(() => usersData.value?.users || [])

const PAGE_SIZE = 8
const page = ref(1)

const limit = computed(() => PAGE_SIZE)
const offset = computed(() => (page.value - 1) * PAGE_SIZE)

// Optional backend filters
const apiStatusFilter = computed(() => {
  if (activeFilter.value === 'completed') return 'completed'
  if (activeFilter.value === 'open' || activeFilter.value === 'overdue') return 'pending'
  return undefined
})

const apiSearchQuery = computed(() => {
  const q = search.value.trim()
  return q || undefined
})

// Load tasks using the reactive hook
const {
  data: tasksData,
  isLoading,
  isError,
  error,
} = useTasksQuery(
  computed(() => props.controlId),
  limit,
  offset,
  apiStatusFilter,
  apiSearchQuery,
)

// Watch total count and emit to parent (for detail page tab badges)
watch(
  () => tasksData.value?.total,
  (newTotal) => {
    if (typeof newTotal === 'number') {
      emit('tasksUpdated', newTotal)
    }
  },
  { immediate: true },
)

const tasks = computed(() => {
  if (!tasksData.value?.tenantTasks) return []
  return tasksData.value.tenantTasks.map((t) => {
    const assigneeName = t.assignee?.name || ''
    const assigneeInitials = assigneeName
      ? assigneeName
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '--'

    return {
      id: t.$id,
      title: t.title,
      description: t.description,
      status: t.status,
      dueDate: t.dueDate || t.$createdAt || '',
      assignee: t.assignee
        ? {
            id: t.assignee.$id,
            name: t.assignee.name,
            initials: assigneeInitials,
          }
        : null,
      controlCode: t.control?.controlKey || '',
      controlName: t.control?.name || '',
      frequency: t.frequency || 'one_time',
      type: t.type || 'manual',
      department: t.department || 'general',
    }
  })
})

const totalTasks = computed(() => tasksData.value?.total || 0)
const pageCount = computed(() => Math.max(1, Math.ceil(totalTasks.value / PAGE_SIZE)))
const rangeStart = computed(() => (totalTasks.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1))
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, totalTasks.value))

const visibleTasks = computed(() => {
  const query = search.value.trim().toLowerCase()
  return tasks.value.filter((task) => {
    const matchesQuery =
      !query ||
      [task.title, task.description, task.assignee?.name || 'Unassigned', task.controlCode].some(
        (value) => value && value.toLowerCase().includes(query),
      )
    const matchesFilter =
      activeFilter.value === 'all' ||
      (activeFilter.value === 'open' && task.status !== 'completed') ||
      (activeFilter.value === 'completed' && task.status === 'completed') ||
      (activeFilter.value === 'overdue' && isOverdue(task))
    return matchesQuery && matchesFilter
  })
})

watch([search, activeFilter], () => {
  page.value = 1
})

function isOverdue(task: { status: string; dueDate?: string }) {
  if (task.status === 'completed') return false
  if (!task.dueDate) return false
  const dateValue = new Date(task.dueDate)
  return !isNaN(dateValue.getTime()) && dateValue < today
}

function formatDueDate(date: string) {
  if (!date) return 'No due date'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'No due date'
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  } catch {
    return 'No due date'
  }
}

function statusLabel(status: string) {
  if (status === 'completed') return 'Completed'
  if (status === 'pending') return 'Pending'
  if (status === 'in_progress') return 'In progress'
  if (status === 'not_started') return 'To do'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusVariant(status: string) {
  return status === 'completed' ? 'secondary' : 'outline'
}

function setFilter(filter: TaskFilter) {
  activeFilter.value = filter
}

function formatFrequency(freq: string) {
  if (!freq) return 'One-time'
  const mapping: Record<string, string> = {
    one_time: 'One-time',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    annual: 'Annually',
  }
  return mapping[freq.toLowerCase()] || freq.charAt(0).toUpperCase() + freq.slice(1)
}

function formatType(type: string) {
  if (!type) return 'Manual'
  const mapping: Record<string, string> = {
    manual: 'Manual',
    automated: 'Automated',
    evidence: 'Evidence collection',
  }
  return mapping[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1)
}

function formatDepartment(dept: string) {
  if (!dept) return 'General'
  const mapping: Record<string, string> = {
    general: 'General',
    engineering: 'Engineering',
    hr: 'HR',
    security: 'Security',
    legal: 'Legal',
    operations: 'Operations',
  }
  return mapping[dept.toLowerCase()] || dept.charAt(0).toUpperCase() + dept.slice(1)
}

function parseDateToInputFormat(dateStr: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

function openTaskDialog() {
  editingTaskId.value = null
  taskTitle.value = ''
  taskDescription.value = ''
  taskDueDate.value = ''
  taskControlCode.value = props.controlKey || controlsStore.list[0]?.code || ''
  taskAssigneeId.value = 'unassigned'
  taskStatus.value = 'pending'
  taskDepartment.value = 'general'
  taskType.value = 'manual'
  taskFrequency.value = 'one_time'
  isTaskDialogOpen.value = true
}

function openEditTaskDialog(task: (typeof tasks.value)[number]) {
  editingTaskId.value = task.id
  taskTitle.value = task.title
  taskDescription.value = task.description || ''
  taskDueDate.value = parseDateToInputFormat(task.dueDate)
  taskControlCode.value = task.controlCode || ''
  taskAssigneeId.value = task.assignee?.id || 'unassigned'
  taskStatus.value = task.status || 'pending'
  taskDepartment.value = task.department || 'general'
  taskType.value = task.type || 'manual'
  taskFrequency.value = task.frequency || 'one_time'
  isTaskDialogOpen.value = true
}

function submitTask() {
  if (isEditing.value) {
    saveTask()
  } else {
    addTask()
  }
}

function addTask() {
  const control = controlsStore.list.find((item) => item.code === taskControlCode.value)
  const assignee =
    taskAssigneeId.value === 'unassigned'
      ? undefined
      : users.value.find((u) => u.$id === taskAssigneeId.value)
  if (!taskTitle.value.trim() || !taskDueDate.value) return

  const tenantId = organizationStore.activeOrganization?.id || ''
  const queryKey = props.controlId
    ? taskKeys.controlList(
        tenantId,
        props.controlId,
        limit.value,
        offset.value,
        apiStatusFilter.value,
        apiSearchQuery.value,
      )
    : taskKeys.list(
        tenantId,
        limit.value,
        offset.value,
        apiStatusFilter.value,
        apiSearchQuery.value,
      )
  const previousData = queryClient.getQueryData<TenantTasksResponse>(queryKey)

  const newApiTask: TenantTask = {
    $id: `task-${Date.now()}`,
    $createdAt: new Date(taskDueDate.value).toISOString(),
    $updatedAt: new Date().toISOString(),
    commonTaskId: `common-${Date.now()}`,
    assigneeId: assignee?.$id || null,
    status: taskStatus.value,
    title: taskTitle.value.trim(),
    description: taskDescription.value.trim(),
    department: taskDepartment.value,
    type: taskType.value,
    frequency: taskFrequency.value,
    lastCompletedAt: '',
    approverId: null,
    approvedAt: '',
    dueDate: taskDueDate.value,
    assignee: assignee
      ? {
          $id: assignee.$id,
          name: assignee.name,
          email: `${assignee.$id}@clarus.app`,
        }
      : null,
    control: {
      $id: props.controlId || control?.code || `ctrl-${Date.now()}`,
      controlKey: props.controlKey || control?.code || taskControlCode.value,
      name: props.controlName || control?.name || '',
      implementationStatus: 'not_started',
    },
  }

  // Update current page query cache
  if (previousData) {
    queryClient.setQueryData(queryKey, {
      total: (previousData.total || 0) + 1,
      tenantTasks: [newApiTask, ...(previousData.tenantTasks || [])],
    })
  } else {
    queryClient.setQueryData(queryKey, {
      total: 1,
      tenantTasks: [newApiTask],
    })
  }

  isTaskDialogOpen.value = false
}

function saveTask() {
  if (!editingTaskId.value) return
  if (!taskTitle.value.trim() || !taskDueDate.value) return

  const updates = {
    title: taskTitle.value.trim(),
    description: taskDescription.value.trim(),
    status: taskStatus.value,
    assigneeId: taskAssigneeId.value === 'unassigned' ? '' : taskAssigneeId.value,
    department: taskDepartment.value,
    type: taskType.value,
    frequency: taskFrequency.value,
  }

  updateTaskMutation.mutate({
    taskId: editingTaskId.value,
    updates,
  })

  isTaskDialogOpen.value = false
}

function toggleTask(task: (typeof tasks.value)[number]) {
  const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
  updateTaskMutation.mutate({
    taskId: task.id,
    updates: {
      status: nextStatus,
    },
  })
}

function goToControlDetail(controlKey: string) {
  if (!controlKey) return
  const activeOrgSlug = router.currentRoute.value.params.organizationSlug || ''
  void router.push({
    name: 'compliance-control-detail',
    params: {
      organizationSlug: activeOrgSlug as string,
      controlId: controlKey,
    },
  })
}

defineExpose({
  openTaskDialog,
})
</script>

<template>
  <section :class="[controlId ? '' : 'mt-7']" aria-labelledby="tasks-heading">
    <!-- Header: Hidden if hideTitleSection is true -->
    <div
      v-if="!hideTitleSection"
      class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h2 id="tasks-heading" class="text-lg font-semibold text-foreground">Tasks</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Keep the work moving toward audit readiness.
        </p>
      </div>
      <Button variant="ghost" size="sm" class="w-fit text-muted-foreground">
        <PhArrowUpRight :size="15" aria-hidden="true" />
        View task space
      </Button>
    </div>

    <!-- Filters status pills -->
    <div class="mb-4 flex flex-wrap gap-2" :class="[controlId ? 'px-4 pt-4' : '']">
      <Button
        v-for="item in [
          { key: 'all', label: 'All tasks', icon: PhListChecks },
          { key: 'open', label: 'Open', icon: PhClock },
          { key: 'overdue', label: 'Overdue', icon: PhWarningCircle },
          { key: 'completed', label: 'Completed', icon: PhCheckCircle },
        ]"
        :key="item.key"
        variant="outline"
        size="sm"
        class="gap-1.5"
        :class="
          activeFilter === item.key
            ? 'bg-accent text-accent-foreground border-primary/50'
            : 'bg-card'
        "
        @click="setFilter(item.key as TaskFilter)"
      >
        <component :is="item.icon" :size="15" aria-hidden="true" />
        {{ item.label }}
        <span
          v-if="activeFilter === item.key && !isLoading && !isError"
          class="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground"
        >
          {{ totalTasks }}
        </span>
      </Button>
    </div>

    <!-- Main Tasks Container -->
    <div :class="[controlId ? '' : 'overflow-hidden rounded-lg border border-border bg-card']">
      <!-- Toolbar -->
      <div
        class="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between bg-card"
      >
        <div class="relative max-w-sm flex-1">
          <PhMagnifyingGlass
            :size="17"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            v-model="search"
            class="pl-9"
            placeholder="Search tasks or assignees"
            aria-label="Search tasks or assignees"
          />
        </div>
        <div class="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm" class="w-fit">
                <PhFunnelSimple :size="16" aria-hidden="true" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-44">
              <DropdownMenuLabel>Show tasks</DropdownMenuLabel>
              <DropdownMenuItem @click="setFilter('all')">All tasks</DropdownMenuItem>
              <DropdownMenuItem @click="setFilter('open')">Open</DropdownMenuItem>
              <DropdownMenuItem @click="setFilter('overdue')">Overdue</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="setFilter('completed')">Completed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <!-- Add Task Button directly inside control-specific view -->
          <Button
            v-if="controlId"
            size="sm"
            class="gap-1.5 font-semibold text-xs h-8"
            @click="openTaskDialog"
          >
            <PhPlus :size="14" weight="bold" />
            Add task
          </Button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="divide-y divide-border bg-card">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-start gap-3 px-4 py-4 sm:items-center sm:px-5 animate-pulse"
        >
          <div class="size-5 rounded-full bg-muted shrink-0" />
          <div class="min-w-0 flex-1 space-y-2">
            <div class="h-4 w-1/3 rounded bg-muted" />
            <div class="h-3 w-1/2 rounded bg-muted" />
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <div class="hidden size-7 rounded-full bg-muted sm:block" />
            <div class="h-5 w-16 rounded-full bg-muted" />
            <div class="h-4 w-12 rounded bg-muted" />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="isError"
        class="flex flex-col items-center px-6 py-14 text-center bg-card"
      >
        <div
          class="mb-3 flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
        >
          <PhWarningCircle :size="24" aria-hidden="true" />
        </div>
        <p class="font-medium text-foreground">Failed to load tasks</p>
        <p class="mt-1 max-w-sm text-sm text-muted-foreground">
          {{
            error?.message || 'There was an issue retrieving your tasks from the compliance engine.'
          }}
        </p>
      </div>

      <!-- Tasks List -->
      <div v-else-if="visibleTasks.length" class="divide-y divide-border bg-card">
        <div
          v-for="task in visibleTasks"
          :key="task.id"
          class="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/50 sm:items-center sm:px-5 cursor-pointer"
          @click="goToControlDetail(task.controlCode)"
        >
          <!-- Complete Task Checkbox Button -->
          <button
            type="button"
            class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 text-transparent transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-0"
            :class="
              task.status === 'completed' ? 'border-success bg-success text-success-foreground' : ''
            "
            :aria-label="`${task.status === 'completed' ? 'Reopen' : 'Complete'} task: ${task.title}`"
            @click.stop="toggleTask(task)"
          >
            <PhCheckCircle
              v-if="task.status === 'completed'"
              :size="14"
              weight="fill"
              aria-hidden="true"
            />
          </button>

          <!-- Task Title and Description -->
          <div class="min-w-0 flex-1">
            <p
              class="font-medium text-foreground"
              :class="
                task.status === 'completed' ? 'text-muted-foreground line-through opacity-70' : ''
              "
            >
              {{ task.title }}
            </p>
            <p
              v-if="task.description"
              class="text-xs text-muted-foreground mt-0.5 line-clamp-1"
              :class="task.status === 'completed' ? 'line-through opacity-50' : ''"
            >
              {{ task.description }}
            </p>

            <!-- Metadata labels -->
            <div
              class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground"
            >
              <span v-if="!controlId" class="font-medium text-foreground">
                {{ task.controlName }}
              </span>

              <span v-if="!controlId" aria-hidden="true" class="text-muted-foreground/30">•</span>

              <span
                class="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-sm"
              >
                <component :is="PhBuildings" :size="12" class="opacity-70" />
                {{ formatDepartment(task.department) }}
              </span>

              <span aria-hidden="true" class="text-muted-foreground/30">•</span>

              <span
                class="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-sm"
              >
                <component :is="PhRepeat" :size="12" class="opacity-70" />
                {{ formatFrequency(task.frequency) }}
              </span>

              <span aria-hidden="true" class="text-muted-foreground/30">•</span>

              <span
                class="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-sm"
              >
                <component :is="PhGear" :size="12" class="opacity-70" />
                {{ formatType(task.type) }}
              </span>
            </div>
          </div>

          <!-- Assignee & Action Buttons -->
          <div class="flex shrink-0 items-center gap-3">
            <Avatar v-if="task.assignee" class="hidden size-7 sm:flex" :aria-label="task.assignee.name">
              <AvatarFallback class="bg-muted text-[10px] font-medium text-muted-foreground">
                {{ task.assignee.initials }}
              </AvatarFallback>
            </Avatar>
            <Avatar v-else class="hidden size-7 sm:flex" aria-label="Unassigned">
              <AvatarFallback class="bg-muted text-[10px] font-medium text-muted-foreground">
                --
              </AvatarFallback>
            </Avatar>

            <div class="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <Badge
                :variant="statusVariant(task.status)"
                :class="
                  task.status === 'completed'
                    ? 'text-success-emphasis bg-success/10 border-success/20'
                    : task.status === 'pending' || task.status === 'in_progress'
                      ? 'text-info bg-info/10 border-info/20'
                      : 'text-muted-foreground'
                "
              >
                {{ statusLabel(task.status) }}
              </Badge>
              <span
                class="flex items-center gap-1 text-xs"
                :class="
                  isOverdue(task) ? 'font-medium text-destructive-emphasis' : 'text-muted-foreground'
                "
              >
                <PhWarningCircle v-if="isOverdue(task)" :size="14" aria-hidden="true" />
                <PhClock v-else :size="14" aria-hidden="true" />
                {{ formatDueDate(task.dueDate) }}
              </span>
            </div>

            <!-- Task Options Dropdown -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                  :aria-label="`Options for ${task.title}`"
                  @click.stop
                >
                  <PhDotsThree :size="20" weight="bold" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click.stop="openEditTaskDialog(task)">
                  Edit task
                </DropdownMenuItem>
                <DropdownMenuItem @click.stop="toggleTask(task)">
                  {{ task.status === 'completed' ? 'Reopen task' : 'Complete task' }}
                </DropdownMenuItem>
                <template v-if="!hideControlDetailsLink">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click.stop="goToControlDetail(task.controlCode)">
                    View control details
                  </DropdownMenuItem>
                </template>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex flex-col items-center px-6 py-14 text-center bg-card">
        <div
          class="mb-3 flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        >
          <PhCheckCircle :size="24" aria-hidden="true" />
        </div>
        <p class="font-medium text-foreground">No tasks match this view</p>
        <p class="mt-1 max-w-sm text-sm text-muted-foreground">
          Try another status or search term to find the work you need.
        </p>
      </div>

      <!-- Pagination -->
      <div
        v-if="!isLoading && !isError && totalTasks > 0"
        class="flex flex-col gap-3 border-t border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between bg-muted/10"
      >
        <p class="text-xs text-muted-foreground" aria-live="polite">
          Showing
          <span class="font-medium text-foreground">{{ rangeStart }}–{{ rangeEnd }}</span> of
          <span class="font-medium text-foreground">{{ totalTasks }}</span> tasks
        </p>
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            :disabled="page === 1"
            aria-label="Previous page"
            @click="page = Math.max(1, page - 1)"
          >
            <PhCaretLeft :size="14" aria-hidden="true" />
          </Button>
          <span class="px-2 text-xs tabular-nums text-muted-foreground">
            Page {{ page }} of {{ pageCount }}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            :disabled="page === pageCount"
            aria-label="Next page"
            @click="page = Math.min(pageCount, page + 1)"
          >
            <PhCaretRight :size="14" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Task Dialog (Add / Edit) -->
    <Dialog v-model:open="isTaskDialogOpen">
      <DialogContent class="sm:max-w-3xl" @pointer-down-outside.prevent>
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Edit task' : 'Add task' }}</DialogTitle>
          <DialogDescription>
            {{
              isEditing
                ? 'Update the details and properties of this task.'
                : 'Create a task and assign it to the right owner.'
            }}
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-6" @submit.prevent="submitTask">
          <div class="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <!-- Left Column: Title & Description -->
            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="task-title">Title</Label>
                <Input
                  id="task-title"
                  v-model="taskTitle"
                  placeholder="Describe the work to be done"
                  required
                />
              </div>
              <div class="space-y-2">
                <Label for="task-description">Description</Label>
                <textarea
                  id="task-description"
                  v-model="taskDescription"
                  rows="8"
                  class="flex min-h-[220px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Add details or instructions..."
                />
              </div>
            </div>

            <!-- Right Column: Metadata Panel -->
            <div class="space-y-4 bg-muted/20 p-4 rounded-lg border border-border">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label for="task-status">Status</Label>
                  <Select v-model="taskStatus">
                    <SelectTrigger id="task-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">To do</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="task-assignee">Assignee</Label>
                  <Select v-model="taskAssigneeId">
                    <SelectTrigger id="task-assignee">
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <SelectItem v-for="user in users" :key="user.$id" :value="user.$id">
                        {{ user.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label for="task-department">Department</Label>
                  <Select v-model="taskDepartment">
                    <SelectTrigger id="task-department">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="task-type">Type</Label>
                  <Select v-model="taskType">
                    <SelectTrigger id="task-type">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automated">Automated</SelectItem>
                      <SelectItem value="evidence">Evidence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label for="task-frequency">Frequency</Label>
                  <Select v-model="taskFrequency">
                    <SelectTrigger id="task-frequency">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="task-due-date">Due date</Label>
                  <Input
                    id="task-due-date"
                    v-model="taskDueDate"
                    type="date"
                    :disabled="isEditing"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter class="border-t border-border pt-4">
            <Button type="button" variant="outline" @click="isTaskDialogOpen = false">
              Cancel
            </Button>
            <Button type="submit">
              {{ isEditing ? 'Save changes' : 'Add task' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>
</template>
