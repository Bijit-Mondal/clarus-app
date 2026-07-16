<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  PhArrowUpRight,
  PhCheckCircle,
  PhClock,
  PhDotsThree,
  PhExport,
  PhFunnelSimple,
  PhListChecks,
  PhMagnifyingGlass,
  PhPlus,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OWNER_LIST, frameworkProgress, summarize } from '@/data/controls'
import { useControlsStore, type Task } from '@/stores/controls'

type TaskFilter = 'all' | 'open' | 'overdue' | 'completed'

const controlsStore = useControlsStore()
const search = ref('')
const activeFilter = ref<TaskFilter>('all')
const isTaskDialogOpen = ref(false)
const taskDescription = ref('')
const taskDueDate = ref('')
const taskControlCode = ref('')
const taskAssigneeId = ref('')
const summary = computed(() => summarize(controlsStore.list))
const frameworks = computed(() => frameworkProgress(controlsStore.list))
const owners = OWNER_LIST
const today = new Date('2026-07-15T00:00:00')

const tasks = computed(() =>
  controlsStore.list.flatMap((control) =>
    control.tasks.map((task) => ({
      ...task,
      controlCode: control.code,
      controlName: control.name,
    })),
  ),
)

const taskSummary = computed(() => ({
  total: tasks.value.length,
  open: tasks.value.filter((task) => task.status !== 'completed').length,
  overdue: tasks.value.filter((task) => isOverdue(task)).length,
  completed: tasks.value.filter((task) => task.status === 'completed').length,
}))

const visibleTasks = computed(() => {
  const query = search.value.trim().toLowerCase()
  return tasks.value.filter((task) => {
    const matchesQuery =
      !query ||
      [task.description, task.assignee.name, task.controlCode].some((value) =>
        value.toLowerCase().includes(query),
      )
    const matchesFilter =
      activeFilter.value === 'all' ||
      (activeFilter.value === 'open' && task.status !== 'completed') ||
      (activeFilter.value === 'completed' && task.status === 'completed') ||
      (activeFilter.value === 'overdue' && isOverdue(task))
    return matchesQuery && matchesFilter
  })
})

const chartStyle = computed(() => {
  const total = summary.value.total || 1
  const passing = (summary.value.passing / total) * 100
  const attention = (summary.value.attention / total) * 100
  return {
    background: `conic-gradient(var(--success) 0 ${passing}%, var(--warning) ${passing}% ${passing + attention}%, var(--destructive) ${passing + attention}% 100%)`,
  }
})

function isOverdue(task: Task) {
  return task.status !== 'completed' && new Date(`${task.dueDate}T00:00:00`) < today
}

function formatDueDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(`${date}T00:00:00`),
  )
}

function statusLabel(status: Task['status']) {
  return status === 'not_started' ? 'To do' : status === 'in_progress' ? 'In progress' : 'Completed'
}

function statusVariant(status: Task['status']) {
  return status === 'completed' ? 'secondary' : status === 'in_progress' ? 'outline' : 'secondary'
}

function setFilter(filter: TaskFilter) {
  activeFilter.value = filter
}

function openTaskDialog() {
  taskDescription.value = ''
  taskDueDate.value = ''
  taskControlCode.value = controlsStore.list[0]?.code ?? ''
  taskAssigneeId.value = controlsStore.list[0]?.owner.id ?? owners[0]?.id ?? ''
  isTaskDialogOpen.value = true
}

function addTask() {
  const control = controlsStore.list.find((item) => item.code === taskControlCode.value)
  const assignee = owners.find((owner) => owner.id === taskAssigneeId.value)
  if (!control || !assignee || !taskDescription.value.trim() || !taskDueDate.value) return

  controlsStore.addTask(control.code, {
    description: taskDescription.value.trim(),
    dueDate: taskDueDate.value,
    assignee,
  })
  isTaskDialogOpen.value = false
}

function toggleTask(task: (typeof tasks.value)[number]) {
  controlsStore.toggleTaskStatus(task.controlCode, task.id)
}
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Button variant="outline" size="sm">
          <PhExport :size="16" aria-hidden="true" />
          Export
        </Button>
        <Button size="sm" @click="openTaskDialog">
          <PhPlus :size="16" weight="bold" aria-hidden="true" />
          Add task
        </Button>
      </template>
    </PageHeader>

    <section
      class="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]"
      aria-label="Compliance summary"
    >
      <article
        class="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm sm:p-6"
      >
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-semibold text-foreground">Readiness overview</h2>
            <p class="mt-1 text-sm text-muted-foreground">Your program at a glance</p>
          </div>
          <Badge variant="secondary" class="gap-1 text-success-emphasis">
            <PhArrowUpRight :size="13" aria-hidden="true" />
            {{ summary.readiness }}% ready
          </Badge>
        </div>
        <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div
            class="relative flex size-40 shrink-0 items-center justify-center rounded-full"
            :style="chartStyle"
            role="img"
            :aria-label="`${summary.passing} passing, ${summary.attention} need attention, ${summary.failing} failing`"
          >
            <div class="flex size-28 flex-col items-center justify-center rounded-full bg-card">
              <span class="text-3xl font-semibold tracking-tight text-foreground">{{
                summary.total
              }}</span>
              <span class="text-xs text-muted-foreground">controls</span>
            </div>
          </div>
          <ul class="grid w-full grid-cols-3 gap-3" role="list">
            <li
              v-for="item in [
                {
                  label: 'Passing',
                  value: summary.passing,
                  color: 'bg-success',
                  text: 'text-success-emphasis',
                },
                {
                  label: 'Attention',
                  value: summary.attention,
                  color: 'bg-warning',
                  text: 'text-warning-emphasis',
                },
                {
                  label: 'Failing',
                  value: summary.failing,
                  color: 'bg-destructive',
                  text: 'text-destructive-emphasis',
                },
              ]"
              :key="item.label"
              class="min-w-0"
            >
              <div class="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span class="size-2 rounded-full" :class="item.color" aria-hidden="true" />
                {{ item.label }}
              </div>
              <span class="text-xl font-semibold tabular-nums" :class="item.text">{{
                item.value
              }}</span>
            </li>
          </ul>
        </div>
      </article>

      <article
        class="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm sm:p-6"
      >
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-semibold text-foreground">Framework coverage</h2>
            <p class="mt-1 text-sm text-muted-foreground">Readiness across active frameworks</p>
          </div>
          <PhListChecks :size="20" class="text-muted-foreground" aria-hidden="true" />
        </div>
        <ul class="space-y-4" role="list">
          <li v-for="framework in frameworks" :key="framework.id">
            <div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span class="font-medium text-foreground">{{ framework.label }}</span>
              <span class="tabular-nums text-muted-foreground"
                >{{ framework.summary.readiness }}%</span
              >
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
              <div
                class="h-full rounded-full bg-success transition-[width] duration-300"
                :style="{ width: `${framework.summary.readiness}%` }"
              />
            </div>
          </li>
        </ul>
      </article>
    </section>

    <section class="mt-7" aria-labelledby="tasks-heading">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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

      <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          v-for="item in [
            { key: 'all', label: 'All tasks', value: taskSummary.total, icon: PhListChecks },
            { key: 'open', label: 'Open', value: taskSummary.open, icon: PhClock },
            { key: 'overdue', label: 'Overdue', value: taskSummary.overdue, icon: PhWarningCircle },
            {
              key: 'completed',
              label: 'Completed',
              value: taskSummary.completed,
              icon: PhCheckCircle,
            },
          ]"
          :key="item.key"
          type="button"
          class="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="activeFilter === item.key ? 'border-primary/60 bg-accent/40' : 'border-border'"
          @click="setFilter(item.key as TaskFilter)"
        >
          <div class="flex items-center justify-between gap-2 text-muted-foreground">
            <span class="text-xs font-medium">{{ item.label }}</span>
            <component :is="item.icon" :size="16" aria-hidden="true" />
          </div>
          <p class="mt-2 text-xl font-semibold tabular-nums text-foreground">{{ item.value }}</p>
        </button>
      </div>

      <div class="overflow-hidden rounded-lg border border-border bg-card">
        <div
          class="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"
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
        </div>

        <div v-if="visibleTasks.length" class="divide-y divide-border">
          <div
            v-for="task in visibleTasks"
            :key="task.id"
            class="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/50 sm:items-center sm:px-5"
          >
            <button
              type="button"
              class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 text-transparent transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-0"
              :class="
                task.status === 'completed'
                  ? 'border-success bg-success text-success-foreground'
                  : ''
              "
              :aria-label="`${task.status === 'completed' ? 'Reopen' : 'Complete'} task: ${task.description}`"
              @click="toggleTask(task)"
            >
              <PhCheckCircle
                v-if="task.status === 'completed'"
                :size="14"
                weight="fill"
                aria-hidden="true"
              />
            </button>
            <div class="min-w-0 flex-1">
              <p
                class="font-medium text-foreground"
                :class="task.status === 'completed' ? 'text-muted-foreground line-through' : ''"
              >
                {{ task.description }}
              </p>
              <div
                class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
              >
                <span class="font-mono text-[11px]">{{ task.controlCode }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ task.controlName }}</span>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <Avatar class="hidden size-7 sm:flex" :aria-label="task.assignee.name">
                <AvatarFallback class="bg-muted text-[10px] font-medium text-muted-foreground">{{
                  task.assignee.initials
                }}</AvatarFallback>
              </Avatar>
              <div class="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <Badge
                  :variant="statusVariant(task.status)"
                  :class="
                    task.status === 'completed'
                      ? 'text-success-emphasis'
                      : task.status === 'in_progress'
                        ? 'text-info'
                        : 'text-muted-foreground'
                  "
                  >{{ statusLabel(task.status) }}</Badge
                >
                <span
                  class="flex items-center gap-1 text-xs"
                  :class="
                    isOverdue(task)
                      ? 'font-medium text-destructive-emphasis'
                      : 'text-muted-foreground'
                  "
                >
                  <PhWarningCircle v-if="isOverdue(task)" :size="14" aria-hidden="true" />
                  <PhClock v-else :size="14" aria-hidden="true" />
                  {{ formatDueDate(task.dueDate) }}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    type="button"
                    class="flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                    :aria-label="`Options for ${task.description}`"
                  >
                    <PhDotsThree :size="20" weight="bold" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click="toggleTask(task)">{{
                    task.status === 'completed' ? 'Reopen task' : 'Complete task'
                  }}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col items-center px-6 py-14 text-center">
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
      </div>
    </section>

    <Dialog v-model:open="isTaskDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>Create a task and assign it to the right owner.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="addTask">
          <div class="space-y-2">
            <Label for="task-description">Task</Label>
            <Input
              id="task-description"
              v-model="taskDescription"
              placeholder="Describe the work to be done"
              required
            />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="task-control">Related control</Label>
              <Select v-model="taskControlCode">
                <SelectTrigger id="task-control"
                  ><SelectValue placeholder="Select a control"
                /></SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="control in controlsStore.list"
                    :key="control.code"
                    :value="control.code"
                    >{{ control.code }} · {{ control.name }}</SelectItem
                  >
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label for="task-assignee">Assignee</Label>
              <Select v-model="taskAssigneeId">
                <SelectTrigger id="task-assignee"
                  ><SelectValue placeholder="Select an owner"
                /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="owner in owners" :key="owner.id" :value="owner.id">{{
                    owner.name
                  }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="space-y-2">
            <Label for="task-due-date">Due date</Label>
            <Input id="task-due-date" v-model="taskDueDate" type="date" required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="isTaskDialogOpen = false"
              >Cancel</Button
            >
            <Button type="submit">Add task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
