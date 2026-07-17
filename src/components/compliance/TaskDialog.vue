<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useTenantUsersQuery } from '@/composables/useTenants'
import { useControlsStore } from '@/stores/controls'
import type { TenantTask } from '@/api/tasks'

const props = defineProps<{
  open: boolean
  task: TenantTask | any | null // null means adding, non-null means editing
  controlId?: string | null
  controlKey?: string | null
  controlName?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'save', payload: {
    title: string
    description: string
    status: string
    assigneeId: string | null
    department: string
    type: string
    frequency: string
    dueDate: string
    controlCode?: string
  }): void
}>()

const controlsStore = useControlsStore()
const { data: usersData } = useTenantUsersQuery()
const users = computed(() => usersData.value?.users || [])

const isEditing = computed(() => !!props.task)

const taskTitle = ref('')
const taskDescription = ref('')
const taskStatus = ref('pending')
const taskAssigneeId = ref('unassigned')
const taskDepartment = ref('general')
const taskType = ref('manual')
const taskFrequency = ref('one_time')
const taskDueDate = ref('')
const taskControlCode = ref('')

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

// Watch dialog open state and populate fields
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.task) {
        // Editing
        taskTitle.value = props.task.title || ''
        taskDescription.value = props.task.description || ''
        taskStatus.value = props.task.status || 'pending'
        taskAssigneeId.value = props.task.assigneeId || (props.task.assignee?.$id || props.task.assignee?.id) || 'unassigned'
        taskDepartment.value = props.task.department || 'general'
        taskType.value = props.task.type || 'manual'
        taskFrequency.value = props.task.frequency || 'one_time'
        taskDueDate.value = parseDateToInputFormat(props.task.dueDate || props.task.$createdAt)
        taskControlCode.value = props.task.control?.controlKey || props.task.controlCode || ''
      } else {
        // Adding
        taskTitle.value = ''
        taskDescription.value = ''
        taskStatus.value = 'pending'
        taskAssigneeId.value = 'unassigned'
        taskDepartment.value = 'general'
        taskType.value = 'manual'
        taskFrequency.value = 'one_time'
        taskDueDate.value = ''
        taskControlCode.value = props.controlKey || controlsStore.list[0]?.code || ''
      }
    }
  },
  { immediate: true }
)

const isOpenComputed = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

function handleSubmit() {
  if (!taskTitle.value.trim() || !taskDueDate.value) return
  emit('save', {
    title: taskTitle.value.trim(),
    description: taskDescription.value.trim(),
    status: taskStatus.value,
    assigneeId: taskAssigneeId.value === 'unassigned' ? null : taskAssigneeId.value,
    department: taskDepartment.value,
    type: taskType.value,
    frequency: taskFrequency.value,
    dueDate: taskDueDate.value,
    controlCode: taskControlCode.value,
  })
}
</script>

<template>
  <Dialog v-model:open="isOpenComputed">
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
      <form class="space-y-6" @submit.prevent="handleSubmit">
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
                class="flex min-h-[220px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
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
          <Button type="button" variant="outline" @click="isOpenComputed = false">
            Cancel
          </Button>
          <Button type="submit">
            {{ isEditing ? 'Save changes' : 'Add task' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
