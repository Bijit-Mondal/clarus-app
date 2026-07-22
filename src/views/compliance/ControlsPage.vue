<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  PhCaretLeft,
  PhCaretRight,
  PhMagnifyingGlass,
  PhPlus,
  PhFileArrowUp,
  PhCheck,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import ControlsTable from '@/components/compliance/ControlsTable.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FRAMEWORKS, FRAMEWORK_ORDER, type ControlStatus, type FrameworkId } from '@/data/controls'
import { useTenantControlsQuery, useUpdateTenantControlMutation } from '@/composables/useControls'
import type { TenantControl, UpdateTenantControlInput } from '@/api/controls'

const router = useRouter()
const route = useRoute()

const organizationSlug = computed(() => route.params.organizationSlug as string)

// Pagination & Search & Filtering
const PAGE_SIZE = 8
const search = ref('')
const statusFilter = ref<string>('all')
const frameworkFilter = ref<FrameworkId | 'all'>('all')

type SortKey = 'code'
const sortKey = ref<SortKey>('code')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const limit = ref(200) // Fetch all controls for local filtering and pagination
const offset = ref(0)

const { data, isPending: isLoading } = useTenantControlsQuery(limit, offset)

const controls = computed(() => data.value?.tenantControls || [])

// Filtered and sorted controls
const filteredControls = computed(() => {
  let result = [...controls.value]

  // Search filter
  const query = search.value.trim().toLowerCase()
  if (query) {
    result = result.filter(
      (c) =>
        c.controlKey?.toLowerCase().includes(query) ||
        c.name?.toLowerCase().includes(query) ||
        c.statement?.toLowerCase().includes(query),
    )
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    result = result.filter((c) => c.implementationStatus === statusFilter.value)
  }

  // Sorting
  result.sort((a, b) => {
    const valA = a.controlKey || ''
    const valB = b.controlKey || ''
    if (valA < valB) return sortDir.value === 'asc' ? -1 : 1
    if (valA > valB) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })

  return result
})

const totalControls = computed(() => filteredControls.value.length)
const pageCount = computed(() => Math.max(1, Math.ceil(totalControls.value / PAGE_SIZE)))

const paged = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredControls.value.slice(start, start + PAGE_SIZE)
})

const rangeStart = computed(() =>
  totalControls.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, totalControls.value))

watch([search, statusFilter, frameworkFilter], () => {
  page.value = 1
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function resetFilters() {
  search.value = ''
  statusFilter.value = 'all'
  frameworkFilter.value = 'all'
}

function goToDetail(control: TenantControl) {
  void router.push({
    name: 'compliance-control-detail',
    params: {
      organizationSlug: organizationSlug.value,
      controlId: control.controlKey,
    },
    state: {
      controlData: JSON.parse(JSON.stringify(control)),
    },
  })
}

// Add Control Dialog State
const isAddDialogOpen = ref(false)
const newCode = ref('')
const newName = ref('')
const newDescription = ref('')
const newStatus = ref<string>('implemented')
const selectedFws = ref<Record<FrameworkId, boolean>>({
  soc2: true,
  iso27001: false,
  gdpr: false,
})

function openAddDialog() {
  newCode.value = ''
  newName.value = ''
  newDescription.value = ''
  newStatus.value = 'implemented'
  selectedFws.value = { soc2: true, iso27001: false, gdpr: false }
  isAddDialogOpen.value = true
}

function submitAddControl() {
  alert('Not implemented with real API yet')
  isAddDialogOpen.value = false
}

// Edit Control Dialog State
const isEditDialogOpen = ref(false)
const editingControlId = ref('')
const originalControl = ref<TenantControl | null>(null)
const editCode = ref('')
const editName = ref('')
const editStatement = ref('')
const editImplementationStatus =
  ref<UpdateTenantControlInput['implementationStatus']>('not_started')
const editArchive = ref(false)

const updateMutation = useUpdateTenantControlMutation()

function openEditDialog(control: TenantControl) {
  originalControl.value = control
  editingControlId.value = control.$id
  editCode.value = control.controlKey
  editName.value = control.name
  editStatement.value = control.statement || ''
  editImplementationStatus.value = (control.implementationStatus ||
    'not_started') as UpdateTenantControlInput['implementationStatus']
  editArchive.value = !!control.archivedAt
  isEditDialogOpen.value = true
}

function submitEditControl() {
  if (editingControlId.value && originalControl.value) {
    const updates: UpdateTenantControlInput = {}

    const statementVal = editStatement.value.trim()
    const origStatementVal = (originalControl.value.statement || '').trim()
    if (statementVal !== origStatementVal) {
      updates.statement = statementVal || null
    }

    const origStatus = originalControl.value.implementationStatus || 'not_started'
    if (editImplementationStatus.value !== origStatus) {
      updates.implementationStatus = editImplementationStatus.value
    }

    const origArchived = !!originalControl.value.archivedAt
    if (editArchive.value !== origArchived) {
      updates.archive = editArchive.value
    }

    if (Object.keys(updates).length === 0) {
      isEditDialogOpen.value = false
      return
    }

    updateMutation.mutate(
      {
        tenantControlId: editingControlId.value,
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

// Delete Control
function confirmDelete(code: string) {
  if (confirm(`Are you sure you want to delete control ${code}?`)) {
    alert('Not implemented with real API yet')
  }
}

// Import Dialog State
const isImportDialogOpen = ref(false)
const importSuccess = ref(false)
const dragOver = ref(false)

function openImportDialog() {
  importSuccess.value = false
  isImportDialogOpen.value = true
}

function handleFileDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  simulateImport()
}

function simulateImport() {
  importSuccess.value = true
}
</script>

<template>
  <div class="min-w-0">
    <PageHeader>
      <template #actions>
        <Button
          variant="outline"
          size="sm"
          @click="openImportDialog"
          class="gap-1.5 font-semibold text-xs"
        >
          <PhFileArrowUp :size="15" aria-hidden="true" />
          Import
        </Button>
        <Button
          size="sm"
          @click="openAddDialog"
          class="gap-1.5 font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <PhPlus :size="15" weight="bold" aria-hidden="true" />
          Add control
        </Button>
      </template>
    </PageHeader>

    <!-- Filters container -->
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full sm:max-w-xs">
        <PhMagnifyingGlass
          :size="16"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          v-model="search"
          type="search"
          placeholder="Search controls…"
          aria-label="Search controls"
          class="pl-9 bg-card"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Select v-model="statusFilter">
          <SelectTrigger
            size="sm"
            class="w-[130px] bg-card border-border"
            aria-label="Filter by status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="implemented">Implemented</SelectItem>
            <SelectItem value="partially_implemented">Partially Implemented</SelectItem>
            <SelectItem value="not_applicable">Not Applicable</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="frameworkFilter">
          <SelectTrigger
            size="sm"
            class="w-[140px] bg-card border-border"
            aria-label="Filter by framework"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem v-for="id in FRAMEWORK_ORDER" :key="id" :value="id">
              {{ FRAMEWORKS[id].label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- Controls Table -->
    <section class="rounded-lg border border-border bg-card" aria-label="Controls list">
      <ControlsTable
        :controls="paged"
        :is-loading="isLoading"
        :show-actions="true"
        :organization-slug="organizationSlug"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        @toggle-sort="toggleSort('code')"
        @edit="openEditDialog"
        @delete="confirmDelete"
      />

      <!-- Empty State -->
      <div
        v-if="filteredControls.length === 0 && !isLoading"
        class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center bg-card"
      >
        <span
          class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <PhMagnifyingGlass :size="20" />
        </span>
        <div class="space-y-1">
          <p class="font-medium text-foreground">No controls match your filters</p>
          <p class="text-sm text-muted-foreground">
            Try a different search term, or clear the filters to see everything.
          </p>
        </div>
        <Button variant="outline" size="sm" @click="resetFilters">Clear filters</Button>
      </div>

      <!-- Pagination -->
      <div
        v-else-if="controls.length > 0"
        class="flex flex-col gap-3 border-t border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between bg-muted/10"
      >
        <p class="text-xs text-muted-foreground" aria-live="polite">
          Showing
          <span class="font-medium text-foreground">{{ rangeStart }}–{{ rangeEnd }}</span> of
          <span class="font-medium text-foreground">{{ totalControls }}</span> controls
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
    </section>

    <!-- Add Control Dialog -->
    <Dialog :open="isAddDialogOpen" @update:open="isAddDialogOpen = $event">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Control</DialogTitle>
          <DialogDescription>
            Define an internal control procedure to satisfy compliance requirements.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="submitAddControl" class="space-y-4 py-3">
          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-1 space-y-1.5">
              <Label for="control-code">Control Code</Label>
              <Input id="control-code" v-model="newCode" placeholder="e.g. CC6.8" required />
            </div>
            <div class="col-span-2 space-y-1.5">
              <Label for="control-name">Control Name</Label>
              <Input
                id="control-name"
                v-model="newName"
                placeholder="e.g. Middle-out compression validation"
                required
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="control-desc">Statement</Label>
            <textarea
              id="control-desc"
              v-model="newDescription"
              rows="3"
              class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="The objective or rule defined by this control..."
            ></textarea>
          </div>

          <div class="space-y-1.5">
            <Label for="control-status">Status</Label>
            <Select v-model="newStatus">
              <SelectTrigger id="control-status">
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
          </div>

          <div class="space-y-1.5">
            <Label>Map to Frameworks</Label>
            <div class="flex gap-4 pt-1">
              <label
                v-for="id in FRAMEWORK_ORDER"
                :key="id"
                class="flex items-center gap-2 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  v-model="selectedFws[id]"
                  class="rounded border-input text-primary focus:ring-primary size-4"
                />
                {{ FRAMEWORKS[id].label }}
              </label>
            </div>
          </div>

          <DialogFooter class="pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" @click="isAddDialogOpen = false">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              class="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create control
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <!-- Edit Control Dialog -->
    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit Control</DialogTitle>
          <DialogDescription>
            Update the control statement, implementation status, or archive state.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="submitEditControl" class="space-y-4 py-3">
          <!-- Meta Context Banner (read-only code & name) -->
          <div
            class="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 flex flex-col gap-0.5 text-xs"
          >
            <span
              class="font-mono font-semibold text-[10px] text-muted-foreground uppercase tracking-wider"
              >{{ editCode }}</span
            >
            <span class="font-medium text-foreground text-sm leading-tight">{{ editName }}</span>
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

    <!-- Import Controls Dialog -->
    <Dialog :open="isImportDialogOpen" @update:open="isImportDialogOpen = $event">
      <DialogContent class="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Import Controls</DialogTitle>
          <DialogDescription>
            Import control catalog or custom definitions from a file.
          </DialogDescription>
        </DialogHeader>

        <div v-if="!importSuccess" class="py-4 space-y-4">
          <div
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop="handleFileDrop"
            :class="[
              'border border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/10 hover:bg-muted/20',
            ]"
            @click="simulateImport"
          >
            <PhFileArrowUp :size="36" class="text-muted-foreground/60" />
            <div class="text-center">
              <p class="text-sm font-medium">Click or drag CSV/JSON file to upload</p>
              <p class="text-xs text-muted-foreground mt-1">
                Supports Unified Compliance Framework, SOC2, or custom templates
              </p>
            </div>
          </div>
        </div>

        <div v-else class="py-8 flex flex-col items-center justify-center gap-4 text-center">
          <span
            class="flex size-12 items-center justify-center rounded-full bg-success/10 text-success"
          >
            <PhCheck :size="24" weight="bold" />
          </span>
          <div>
            <h3 class="font-medium text-foreground">Import successful</h3>
            <p class="text-sm text-muted-foreground mt-1">
              2 new controls were loaded and mapped into your workspace.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" @click="isImportDialogOpen = false">
            {{ importSuccess ? 'Done' : 'Cancel' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
