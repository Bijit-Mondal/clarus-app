<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  PhArrowDown,
  PhArrowUp,
  PhCaretLeft,
  PhCaretRight,
  PhMagnifyingGlass,
  PhPlus,
  PhDotsThreeOutline,
  PhTrash,
  PhEye,
  PhPencilSimple,
  PhFileArrowUp,
  PhCheck,
  PhClock,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import ControlStatusBadge from '@/components/compliance/ControlStatusBadge.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import EvidenceIndicator from '@/components/compliance/EvidenceIndicator.vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  FRAMEWORKS,
  FRAMEWORK_ORDER,
  OWNER_LIST,
  type ControlStatus,
  type FrameworkId,
} from '@/data/controls'
import { useTenantControlsQuery, useUpdateTenantControlMutation } from '@/composables/useControls'
import { useTenantUsersQuery } from '@/composables/useTenants'
import type { TenantControl, UpdateTenantControlInput } from '@/api/controls'

const router = useRouter()
const route = useRoute()

const organizationSlug = computed(() => route.params.organizationSlug as string)

// Pagination & Search & Filtering
const PAGE_SIZE = 8
const search = ref('')
const statusFilter = ref<string>('all')
const frameworkFilter = ref<FrameworkId | 'all'>('all')
const ownerFilter = ref<string>('all')

type SortKey = 'code' | 'nextReview'
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
        c.statement?.toLowerCase().includes(query) ||
        c.implementationDescription?.toLowerCase().includes(query),
    )
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    result = result.filter((c) => c.implementationStatus === statusFilter.value)
  }

  // Owner filter
  if (ownerFilter.value !== 'all') {
    result = result.filter(
      (c) =>
        c.ownerId === ownerFilter.value ||
        c.owner?.$id === ownerFilter.value ||
        c.owner?.id === ownerFilter.value,
    )
  }

  // Sorting
  result.sort((a, b) => {
    let valA = ''
    let valB = ''

    if (sortKey.value === 'code') {
      valA = a.controlKey || ''
      valB = b.controlKey || ''
    } else if (sortKey.value === 'nextReview') {
      valA = a.nextReviewAt || ''
      valB = b.nextReviewAt || ''
    }

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

watch([search, statusFilter, frameworkFilter, ownerFilter], () => {
  page.value = 1
})

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
  ownerFilter.value = 'all'
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
const newOwnerId = ref('maya')
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
  newOwnerId.value = 'maya'
  newStatus.value = 'implemented'
  selectedFws.value = { soc2: true, iso27001: false, gdpr: false }
  isAddDialogOpen.value = true
}

function submitAddControl() {
  alert('Not implemented with real API yet')
  isAddDialogOpen.value = false
}

const { data: usersData } = useTenantUsersQuery()

const getInitials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

const ownersList = computed(() => {
  const users = usersData.value?.users || []
  if (users.length === 0) return OWNER_LIST
  return users
    .filter((u) => u.status === 'active')
    .map((u) => ({
      id: u.$id,
      name: u.name,
      initials: getInitials(u.name),
    }))
})

// Edit Control Dialog State
const isEditDialogOpen = ref(false)
const editingControlId = ref('')
const originalControl = ref<TenantControl | null>(null)
const editCode = ref('')
const editName = ref('')
const editStatement = ref('')
const editImplementationDescription = ref('')
const editReviewFrequency = ref('')
const editOwnerId = ref('')
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
  editImplementationDescription.value = control.implementationDescription || ''
  editReviewFrequency.value = control.reviewFrequency || ''
  editOwnerId.value = control.ownerId || control.owner?.$id || control.owner?.id || ''
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

    const implDescVal = editImplementationDescription.value.trim()
    const origImplDescVal = (originalControl.value.implementationDescription || '').trim()
    if (implDescVal !== origImplDescVal) {
      updates.implementationDescription = implDescVal || null
    }

    const reviewFreqVal = editReviewFrequency.value.trim()
    const origReviewFreqVal = (originalControl.value.reviewFrequency || '').trim()
    if (reviewFreqVal !== origReviewFreqVal) {
      updates.reviewFrequency = reviewFreqVal || null
    }

    const origOwnerId =
      originalControl.value.ownerId ||
      originalControl.value.owner?.$id ||
      originalControl.value.owner?.id ||
      ''
    if (editOwnerId.value !== origOwnerId) {
      updates.ownerId = editOwnerId.value || null
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

        <Select v-model="ownerFilter">
          <SelectTrigger
            size="sm"
            class="w-[140px] bg-card border-border"
            aria-label="Filter by owner"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            <SelectItem v-for="owner in ownersList" :key="owner.id" :value="owner.id">
              {{ owner.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- Controls Table -->
    <section class="rounded-lg border border-border bg-card" aria-label="Controls list">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[850px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border text-left align-middle bg-muted/20">
              <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[32%]">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  @click="toggleSort('code')"
                >
                  Control
                  <PhArrowUp
                    v-if="sortKey === 'code' && sortDir === 'asc'"
                    :size="12"
                    aria-hidden="true"
                  />
                  <PhArrowDown
                    v-else-if="sortKey === 'code' && sortDir === 'desc'"
                    :size="12"
                    aria-hidden="true"
                  />
                </button>
              </th>
              <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[22%]">
                Category
              </th>
              <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[16%]">Owner</th>
              <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[15%]">State</th>
              <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[10%]">
                Evidence
              </th>
              <th scope="col" class="w-[5%] px-5 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody v-if="!isLoading">
            <tr
              v-for="control in paged"
              :key="control.$id"
              class="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30 cursor-pointer"
              @click="goToDetail(control)"
            >
              <!-- Control Code & Name -->
              <td class="px-5 py-4">
                <div class="flex flex-col gap-0.5">
                  <span
                    class="font-mono text-[10px] font-semibold text-muted-foreground tracking-wider uppercase"
                  >
                    {{ control.controlKey }}
                  </span>
                  <span class="font-medium text-foreground hover:text-primary transition-colors">
                    {{ control.name }}
                  </span>
                  <span class="text-xs text-muted-foreground/90 flex items-center gap-1 mt-0.5">
                    <PhClock :size="12" class="text-muted-foreground/70" />
                    Review: {{ control.reviewFrequency || 'Not specified' }}
                  </span>
                </div>
              </td>
              <!-- Frameworks / Category -->
              <td class="px-5 py-4" @click.stop>
                <div class="flex flex-wrap gap-1"></div>
              </td>
              <!-- Owner -->
              <td class="px-5 py-4" @click.stop>
                <div v-if="control.owner" class="flex items-center gap-2">
                  <Avatar class="size-6 shrink-0">
                    <AvatarFallback
                      class="bg-secondary text-[10px] font-semibold text-secondary-foreground"
                    >
                      {{ control.owner.name?.charAt(0) || '?' }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="whitespace-nowrap text-foreground text-xs">{{
                    control.owner.name
                  }}</span>
                </div>
                <div v-else class="text-xs text-muted-foreground">-</div>
              </td>
              <!-- Status / State -->
              <td class="px-5 py-4" @click.stop>
                <ControlStatusBadge :status="mapStatus(control.implementationStatus)" />
              </td>
              <!-- Evidence Status -->
              <td class="px-5 py-4" @click.stop>
                <EvidenceIndicator state="fresh" />
              </td>
              <!-- Actions -->
              <td class="px-5 py-4 text-right" @click.stop>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      class="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <PhDotsThreeOutline :size="15" weight="fill" />
                      <span class="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="w-[140px]">
                    <DropdownMenuItem @click="goToDetail(control)" class="gap-2">
                      <PhEye :size="14" />
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="openEditDialog(control)" class="gap-2">
                      <PhPencilSimple :size="14" />
                      Edit control
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      @click="confirmDelete(control.controlKey)"
                      class="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <PhTrash :size="14" />
                      Delete control
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="6" class="p-0">
                <ClarusLoadingState variant="table-rows" :rows="5" label="Loading controls" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div
        v-if="controls.length === 0 && !isLoading"
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
                placeholder="e.g. Access log reviews"
                required
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="control-desc">Description</Label>
            <textarea
              id="control-desc"
              v-model="newDescription"
              rows="3"
              class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe the policies or actions this control enforces..."
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="control-owner">Owner</Label>
              <Select v-model="newOwnerId">
                <SelectTrigger id="control-owner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="owner in ownersList" :key="owner.id" :value="owner.id">
                    {{ owner.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
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
      <DialogContent class="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Edit Control Details</DialogTitle>
          <DialogDescription>
            Update control definition, ownership, implementation status, and archive state.
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

          <div class="grid grid-cols-1 md:grid-cols-5 gap-5">
            <!-- Left Column: Statements (col-span-3) -->
            <div class="md:col-span-3 space-y-4">
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
                  rows="4"
                  class="flex min-h-[100px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="The objective or rule defined by this control..."
                ></textarea>
              </div>

              <!-- Implementation Description -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <Label for="edit-impl-desc" class="text-xs font-semibold text-foreground"
                    >Implementation Description</Label
                  >
                  <span class="text-[10px] text-muted-foreground">Markdown</span>
                </div>
                <textarea
                  id="edit-impl-desc"
                  v-model="editImplementationDescription"
                  rows="4"
                  class="flex min-h-[100px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Detailed description of how this control is enforced..."
                ></textarea>
              </div>
            </div>

            <!-- Right Column: Metadata / Admin (col-span-2) -->
            <div class="md:col-span-2 space-y-4">
              <div class="space-y-1.5">
                <Label for="edit-owner" class="text-xs font-semibold text-foreground">Owner</Label>
                <Select v-model="editOwnerId">
                  <SelectTrigger id="edit-owner" class="h-9 bg-card">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="owner in ownersList" :key="owner.id" :value="owner.id">
                      {{ owner.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-1.5">
                <Label for="edit-status" class="text-xs font-semibold text-foreground"
                  >Status</Label
                >
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

              <div class="space-y-1.5">
                <Label for="edit-review-freq" class="text-xs font-semibold text-foreground"
                  >Review Frequency</Label
                >
                <Input
                  id="edit-review-freq"
                  v-model="editReviewFrequency"
                  placeholder="e.g. Annually, Quarterly"
                  class="h-9 bg-card"
                />
              </div>

              <!-- Archive Control Switch -->
              <div class="rounded-lg border border-border bg-card p-3 shadow-sm space-y-2">
                <div class="flex items-center justify-between">
                  <Label
                    for="edit-archive"
                    class="text-xs font-semibold text-foreground cursor-pointer"
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
            </div>
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
