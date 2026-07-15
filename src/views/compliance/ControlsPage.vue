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
  PhCheck
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import ControlStatusBadge from '@/components/compliance/ControlStatusBadge.vue'
import EvidenceIndicator from '@/components/compliance/EvidenceIndicator.vue'
import { useControlsStore } from '@/stores/controls'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

const controlsStore = useControlsStore()
const router = useRouter()
const route = useRoute()

const organizationSlug = computed(() => route.params.organizationSlug as string)

// Pagination & Search & Filtering
const PAGE_SIZE = 8
const search = ref('')
const statusFilter = ref<ControlStatus | 'all'>('all')
const frameworkFilter = ref<FrameworkId | 'all'>('all')
const ownerFilter = ref<string>('all')

type SortKey = 'code' | 'nextReview'
const sortKey = ref<SortKey>('code')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return controlsStore.list.filter((c) => {
    if (q && !`${c.code} ${c.name}`.toLowerCase().includes(q)) return false
    if (statusFilter.value !== 'all' && c.status !== statusFilter.value) return false
    if (frameworkFilter.value !== 'all' && !c.frameworks.includes(frameworkFilter.value)) return false
    if (ownerFilter.value !== 'all' && c.owner.id !== ownerFilter.value) return false
    return true
  })
})

const sorted = computed(() => {
  const list = [...filtered.value]
  const dir = sortDir.value === 'asc' ? 1 : -1
  list.sort((a, b) => {
    const av = a[sortKey.value]
    const bv = b[sortKey.value]
    return av < bv ? -dir : av > bv ? dir : 0
  })
  return list
})

const pageCount = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)))
const paged = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return sorted.value.slice(start, start + PAGE_SIZE)
})

const rangeStart = computed(() =>
  sorted.value.length === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, sorted.value.length))

watch([search, statusFilter, frameworkFilter, ownerFilter, sortKey, sortDir], () => {
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
  ownerFilter.value = 'all'
}

function goToDetail(code: string) {
  void router.push({
    name: 'compliance-control-detail',
    params: {
      organizationSlug: organizationSlug.value,
      controlId: code
    }
  })
}



// Add Control Dialog State
const isAddDialogOpen = ref(false)
const newCode = ref('')
const newName = ref('')
const newDescription = ref('')
const newOwnerId = ref('maya')
const newStatus = ref<ControlStatus>('passing')
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
  newStatus.value = 'passing'
  selectedFws.value = { soc2: true, iso27001: false, gdpr: false }
  isAddDialogOpen.value = true
}

function submitAddControl() {
  if (!newCode.value.trim() || !newName.value.trim()) return

  const frameworksList = (Object.keys(selectedFws.value) as FrameworkId[]).filter(
    (key) => selectedFws.value[key]
  )

  const fallbackOwner = { id: 'maya', name: 'Maya Chen', initials: 'MC' }
  const owner = OWNER_LIST.find((o) => o.id === newOwnerId.value) || OWNER_LIST[0] || fallbackOwner

  const success = controlsStore.addControl({
    code: newCode.value.trim(),
    name: newName.value.trim(),
    description: newDescription.value.trim(),
    frameworks: frameworksList,
    owner,
    status: newStatus.value,
    evidence: newStatus.value === 'passing' ? 'fresh' : newStatus.value === 'attention' ? 'expiring' : 'expired'
  })

  if (success) {
    isAddDialogOpen.value = false
  } else {
    alert('A control with this code already exists.')
  }
}

// Edit Control Dialog State
const isEditDialogOpen = ref(false)
const editCode = ref('')
const editName = ref('')
const editDescription = ref('')
const editOwnerId = ref('')

function openEditDialog(code: string) {
  const ctrl = controlsStore.getControlByCode(code)
  if (ctrl) {
    editCode.value = ctrl.code
    editName.value = ctrl.name
    editDescription.value = ctrl.description
    editOwnerId.value = ctrl.owner.id
    isEditDialogOpen.value = true
  }
}

function submitEditControl() {
  if (!editName.value.trim()) return
  controlsStore.updateControlDetails(editCode.value, {
    name: editName.value.trim(),
    description: editDescription.value.trim(),
    ownerId: editOwnerId.value
  })
  isEditDialogOpen.value = false
}

// Delete Control
function confirmDelete(code: string) {
  if (confirm(`Are you sure you want to delete control ${code}?`)) {
    controlsStore.deleteControl(code)
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
  // Insert some mock controls after a brief delay
  setTimeout(() => {
    controlsStore.addControl({
      code: 'CC6.8',
      name: 'Unauthorized software prevention',
      description: 'Rules and automated checks are established to prevent unauthorized software installation.',
      frameworks: ['soc2'],
      owner: OWNER_LIST[2] || { id: 'aisha', name: 'Aisha Patel', initials: 'AP' },
      status: 'passing',
      evidence: 'fresh'
    })
    controlsStore.addControl({
      code: 'A.12.4',
      name: 'Event logging',
      description: 'Event logs recording user activities, exceptions, faults and information security events shall be produced.',
      frameworks: ['iso27001'],
      owner: OWNER_LIST[0] || { id: 'maya', name: 'Maya Chen', initials: 'MC' },
      status: 'attention',
      evidence: 'expiring'
    })
  }, 1000)
}
</script>

<template>
  <div class="min-w-0">
    <PageHeader>
      <template #actions>
        <Button variant="outline" size="sm" @click="openImportDialog" class="gap-1.5 font-semibold text-xs">
          <PhFileArrowUp :size="15" aria-hidden="true" />
          Import
        </Button>
        <Button size="sm" @click="openAddDialog" class="gap-1.5 font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90">
          <PhPlus :size="15" weight="bold" aria-hidden="true" />
          New control
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
          <SelectTrigger size="sm" class="w-[130px] bg-card border-border" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            <SelectItem value="passing">Passing</SelectItem>
            <SelectItem value="attention">Attention</SelectItem>
            <SelectItem value="failing">Failing</SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="frameworkFilter">
          <SelectTrigger size="sm" class="w-[140px] bg-card border-border" aria-label="Filter by framework">
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
          <SelectTrigger size="sm" class="w-[140px] bg-card border-border" aria-label="Filter by owner">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            <SelectItem v-for="owner in OWNER_LIST" :key="owner.id" :value="owner.id">
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
              <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[22%]">Category</th>
              <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[16%]">Owner</th>
              <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[15%]">State</th>
              <th scope="col" class="px-5 py-3 font-medium text-muted-foreground w-[10%]">Evidence</th>
              <th scope="col" class="w-[5%] px-5 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="control in paged"
              :key="control.code"
              class="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30 cursor-pointer"
              @click="goToDetail(control.code)"
            >
              <!-- Control Code & Name -->
              <td class="px-5 py-4">
                <div class="flex flex-col gap-0.5">
                  <span class="font-mono text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                    {{ control.code }}
                  </span>
                  <span class="font-medium text-foreground hover:text-primary transition-colors">
                    {{ control.name }}
                  </span>
                </div>
              </td>
              <!-- Frameworks / Category -->
              <td class="px-5 py-4" @click.stop>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="fw in control.frameworks"
                    :key="fw"
                    class="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {{ FRAMEWORKS[fw].label }}
                  </span>
                </div>
              </td>
              <!-- Owner -->
              <td class="px-5 py-4" @click.stop>
                <div class="flex items-center gap-2">
                  <Avatar class="size-6 shrink-0">
                    <AvatarFallback
                      class="bg-secondary text-[10px] font-semibold text-secondary-foreground"
                    >
                      {{ control.owner.initials }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="whitespace-nowrap text-foreground text-xs">{{ control.owner.name }}</span>
                </div>
              </td>
              <!-- Status / State -->
              <td class="px-5 py-4" @click.stop>
                <ControlStatusBadge :status="control.status" />
              </td>
              <!-- Evidence Status -->
              <td class="px-5 py-4" @click.stop>
                <EvidenceIndicator :state="control.evidence" />
              </td>
              <!-- Actions -->
              <td class="px-5 py-4 text-right" @click.stop>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon-sm" class="h-7 w-7 text-muted-foreground hover:text-foreground">
                      <PhDotsThreeOutline :size="15" weight="fill" />
                      <span class="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="w-[140px]">
                    <DropdownMenuItem @click="goToDetail(control.code)" class="gap-2">
                      <PhEye :size="14" />
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="openEditDialog(control.code)" class="gap-2">
                      <PhPencilSimple :size="14" />
                      Edit control
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem @click="confirmDelete(control.code)" class="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <PhTrash :size="14" />
                      Delete control
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div
        v-if="sorted.length === 0"
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
        v-else
        class="flex flex-col gap-3 border-t border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between bg-muted/10"
      >
        <p class="text-xs text-muted-foreground" aria-live="polite">
          Showing <span class="font-medium text-foreground">{{ rangeStart }}–{{ rangeEnd }}</span> of
          <span class="font-medium text-foreground">{{ sorted.length }}</span> controls
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
          <DialogTitle>New Control</DialogTitle>
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
              <Input id="control-name" v-model="newName" placeholder="e.g. Access log reviews" required />
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
                  <SelectItem v-for="owner in OWNER_LIST" :key="owner.id" :value="owner.id">
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
                  <SelectItem value="passing">Passing</SelectItem>
                  <SelectItem value="attention">Needs Attention</SelectItem>
                  <SelectItem value="failing">Failing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label>Map to Frameworks</Label>
            <div class="flex gap-4 pt-1">
              <label v-for="id in FRAMEWORK_ORDER" :key="id" class="flex items-center gap-2 cursor-pointer text-sm">
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
            <Button type="submit" size="sm" class="bg-primary text-primary-foreground hover:bg-primary/90">
              Create control
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Edit Control Dialog -->
    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Control Details</DialogTitle>
          <DialogDescription>
            Update control name and administrative properties.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="submitEditControl" class="space-y-4 py-3">
          <div class="space-y-1.5">
            <Label for="edit-code">Control Code</Label>
            <Input id="edit-code" :value="editCode" disabled class="bg-muted text-muted-foreground" />
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
            <Button type="button" variant="outline" size="sm" @click="isEditDialogOpen = false">
              Cancel
            </Button>
            <Button type="submit" size="sm" class="bg-primary text-primary-foreground hover:bg-primary/90">
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
              dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:bg-muted/20'
            ]"
            @click="simulateImport"
          >
            <PhFileArrowUp :size="36" class="text-muted-foreground/60" />
            <div class="text-center">
              <p class="text-sm font-medium">Click or drag CSV/JSON file to upload</p>
              <p class="text-xs text-muted-foreground mt-1">Supports Unified Compliance Framework, SOC2, or custom templates</p>
            </div>
          </div>
        </div>

        <div v-else class="py-8 flex flex-col items-center justify-center gap-4 text-center">
          <span class="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <PhCheck :size="24" weight="bold" />
          </span>
          <div>
            <h3 class="font-medium text-foreground">Import successful</h3>
            <p class="text-sm text-muted-foreground mt-1">2 new controls were loaded and mapped into your workspace.</p>
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
