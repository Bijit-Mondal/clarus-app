<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhArrowUpRight,
  PhCaretDown,
  PhCaretLeft,
  PhCaretRight,
  PhCheckCircle,
  PhClock,
  PhCpu,
  PhDownload,
  PhFile,
  PhFileText,
  PhFolder,
  PhFolderOpen,
  PhLink,
  PhListBullets,
  PhMagnifyingGlass,
  PhPlus,
  PhSquaresFour,
  PhSpinner,
  PhTrash,
  PhUser,
  PhWarningCircle,
  PhX,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import AddEvidenceDialog from '@/components/compliance/AddEvidenceDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  useEvidencesQuery,
  useDeleteEvidenceMutation,
  useDownloadEvidenceMutation,
} from '@/composables/useEvidence'
import { useTenantControlsQuery } from '@/composables/useControls'
import type { Evidence } from '@/api/evidence'
import type { TenantControl } from '@/api/controls'
import { getApiErrorMessage } from '@/lib/api'

const route = useRoute()
const router = useRouter()
const organizationSlug = computed(() => (route.params.organizationSlug as string) || '')

// ── Data ──────────────────────────────────────────────────────────────────────
const controlsLimit = ref(500)
const controlsOffset = ref(0)
const { data: controlsData, isPending: isControlsLoading } = useTenantControlsQuery(
  controlsLimit,
  controlsOffset,
)
const { data: evidencesData, isPending: isEvidencesLoading } = useEvidencesQuery(
  computed(() => ({ limit: 1000, total: true })),
)

const controls = computed(() => controlsData.value?.tenantControls ?? [])
const evidences = computed(() => evidencesData.value?.evidences ?? [])
const isLoading = computed(() => isEvidencesLoading.value || isControlsLoading.value)

const controlById = computed(() => {
  const map = new Map<string, TenantControl>()
  for (const c of controls.value) map.set(c.$id, c)
  return map
})

// ── Filters & view ────────────────────────────────────────────────────────────
type ViewMode = 'controls' | 'list'
type StatusFilter = 'all' | 'verified' | 'pending' | 'failed'
type SourceFilter = 'all' | 'manual' | 'auto'

const searchQuery = ref('')
const statusFilter = ref<StatusFilter>('all')
const sourceFilter = ref<SourceFilter>('all')
const viewMode = ref<ViewMode>('controls')
const page = ref(1)
const PAGE_SIZE = 10
const expandedGroups = ref<Set<string>>(new Set())
const hasInitializedExpand = ref(false)

const statusFilters = [
  { id: 'all' as const, label: 'All statuses' },
  { id: 'verified' as const, label: 'Verified' },
  { id: 'pending' as const, label: 'Pending' },
  { id: 'failed' as const, label: 'Failed' },
]

const sourceFilters = [
  { id: 'all' as const, label: 'All sources' },
  { id: 'manual' as const, label: 'Manual' },
  { id: 'auto' as const, label: 'Automated' },
]

// ── Filtering ─────────────────────────────────────────────────────────────────
function matchesFilters(e: Evidence) {
  const query = searchQuery.value.trim().toLowerCase()
  const matchesSearch =
    !query ||
    e.title.toLowerCase().includes(query) ||
    (e.description?.toLowerCase().includes(query) ?? false) ||
    (e.externalReference?.toLowerCase().includes(query) ?? false) ||
    resolveControlLabel(e.tenantControlId).toLowerCase().includes(query)

  const status = normalizeStatus(e.status)
  const matchesStatus =
    statusFilter.value === 'all' ||
    (statusFilter.value === 'verified' && status === 'verified') ||
    (statusFilter.value === 'pending' && status === 'pending') ||
    (statusFilter.value === 'failed' && status === 'failed')

  const source = normalizeSource(e.sourceType)
  const matchesSource =
    sourceFilter.value === 'all' ||
    (sourceFilter.value === 'manual' && source === 'manual') ||
    (sourceFilter.value === 'auto' && source === 'auto')

  return matchesSearch && matchesStatus && matchesSource
}

const filteredEvidences = computed(() => evidences.value.filter(matchesFilters))

// ── Group by control ──────────────────────────────────────────────────────────
type ControlGroup = {
  key: string
  controlId: string | null
  controlKey: string
  name: string
  evidences: Evidence[]
  verifiedCount: number
  pendingCount: number
  coverage: number
}

function resolveControlLabel(tenantControlId?: string) {
  if (!tenantControlId) return 'Unassigned'
  const control = controlById.value.get(tenantControlId)
  if (!control) return 'Unknown control'
  return `${control.controlKey} · ${control.name}`
}

const controlGroups = computed<ControlGroup[]>(() => {
  const buckets = new Map<string, Evidence[]>()

  for (const e of filteredEvidences.value) {
    const key = e.tenantControlId || '__unassigned__'
    const list = buckets.get(key)
    if (list) list.push(e)
    else buckets.set(key, [e])
  }

  // Also surface controls with zero matching evidence when not searching/filtering
  // so owners can see gaps — only when no filters active and we want full inventory.
  // Keep focused: only groups that have evidence (or unassigned).
  const groups: ControlGroup[] = []

  for (const [key, items] of buckets) {
    const control = key === '__unassigned__' ? null : (controlById.value.get(key) ?? null)
    const verifiedCount = items.filter((e) => normalizeStatus(e.status) === 'verified').length
    const pendingCount = items.filter((e) => normalizeStatus(e.status) === 'pending').length
    const coverage = items.length === 0 ? 0 : Math.round((verifiedCount / items.length) * 100)

    groups.push({
      key,
      controlId: control?.$id ?? (key === '__unassigned__' ? null : key),
      controlKey: control?.controlKey ?? (key === '__unassigned__' ? '—' : '…'),
      name: control?.name ?? (key === '__unassigned__' ? 'Unassigned evidence' : 'Unknown control'),
      evidences: items.sort(
        (a, b) =>
          new Date(b.collectedAt || b.$createdAt).getTime() -
          new Date(a.collectedAt || a.$createdAt).getTime(),
      ),
      verifiedCount,
      pendingCount,
      coverage,
    })
  }

  groups.sort((a, b) => {
    if (a.key === '__unassigned__') return 1
    if (b.key === '__unassigned__') return -1
    return a.controlKey.localeCompare(b.controlKey)
  })

  return groups
})

// Paginate control groups in controls view; flat list in list view
const totalForPagination = computed(() =>
  viewMode.value === 'controls' ? controlGroups.value.length : filteredEvidences.value.length,
)

const pageCount = computed(() => Math.max(1, Math.ceil(totalForPagination.value / PAGE_SIZE)))

const pagedGroups = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return controlGroups.value.slice(start, start + PAGE_SIZE)
})

const pagedList = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredEvidences.value
    .slice()
    .sort(
      (a, b) =>
        new Date(b.collectedAt || b.$createdAt).getTime() -
        new Date(a.collectedAt || a.$createdAt).getTime(),
    )
    .slice(start, start + PAGE_SIZE)
})

const rangeStart = computed(() =>
  totalForPagination.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, totalForPagination.value))

watch([searchQuery, statusFilter, sourceFilter, viewMode], () => {
  page.value = 1
})

// Expand groups that need attention once on first data load
watch(
  pagedGroups,
  (groups) => {
    if (hasInitializedExpand.value || groups.length === 0) return
    const next = new Set<string>()
    for (const g of groups.slice(0, 3)) {
      if (g.pendingCount > 0 || g.coverage < 100) next.add(g.key)
    }
    if (next.size === 0 && groups[0]) next.add(groups[0].key)
    expandedGroups.value = next
    hasInitializedExpand.value = true
  },
  { immediate: true },
)

function toggleGroup(key: string) {
  const next = new Set(expandedGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedGroups.value = next
}

function isExpanded(key: string) {
  return expandedGroups.value.has(key)
}

function expandAllVisible() {
  const next = new Set(expandedGroups.value)
  for (const g of pagedGroups.value) next.add(g.key)
  expandedGroups.value = next
}

function collapseAll() {
  expandedGroups.value = new Set()
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const totalCount = computed(() => evidencesData.value?.total ?? evidences.value.length)
const verifiedCount = computed(
  () => evidences.value.filter((e) => normalizeStatus(e.status) === 'verified').length,
)
const pendingCount = computed(
  () => evidences.value.filter((e) => normalizeStatus(e.status) === 'pending').length,
)
const autoCount = computed(
  () => evidences.value.filter((e) => normalizeSource(e.sourceType) === 'auto').length,
)
const controlsWithEvidence = computed(() => {
  const ids = new Set(
    evidences.value.map((e) => e.tenantControlId).filter((id): id is string => Boolean(id)),
  )
  return ids.size
})
const verifiedCoverage = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((verifiedCount.value / totalCount.value) * 100)
})

// ── Actions ───────────────────────────────────────────────────────────────────
const isEvidenceDialogOpen = ref(false)
const createControlId = ref<string | undefined>(undefined)
const downloadingId = ref<string | null>(null)
const deleteMutation = useDeleteEvidenceMutation()
const downloadMutation = useDownloadEvidenceMutation()

function openCreateDialog(controlId?: string | null) {
  createControlId.value = controlId ?? undefined
  isEvidenceDialogOpen.value = true
}

function exportAll() {
  // Placeholder until export API lands
  alert('Export will download a full evidence index for the active organization.')
}

function goToControl(control: ControlGroup) {
  if (!control.controlId || control.key === '__unassigned__') return
  const resolved = controlById.value.get(control.controlId)
  const controlKey = resolved?.controlKey
  if (!controlKey) return
  void router.push({
    name: 'compliance-control-detail',
    params: {
      organizationSlug: organizationSlug.value,
      controlId: controlKey,
    },
  })
}

async function removeEvidence(id: string) {
  if (!confirm('Delete this evidence item? This cannot be undone.')) return
  try {
    await deleteMutation.mutateAsync(id)
  } catch (err) {
    alert(getApiErrorMessage(err, 'Failed to delete evidence.'))
  }
}

async function downloadFile(evidenceId: string) {
  downloadingId.value = evidenceId
  try {
    await downloadMutation.mutateAsync(evidenceId)
  } catch (err) {
    alert(getApiErrorMessage(err, 'Failed to download evidence file.'))
  } finally {
    downloadingId.value = null
  }
}

function resetFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  sourceFilter.value = 'all'
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeStatus(status: string): 'verified' | 'pending' | 'failed' {
  const s = (status || '').toLowerCase()
  if (s === 'verified' || s === 'approved' || s === 'done') return 'verified'
  if (s === 'failed' || s === 'rejected' || s === 'expired') return 'failed'
  return 'pending'
}

function normalizeSource(source: string): 'manual' | 'auto' | 'other' {
  const s = (source || '').toLowerCase()
  if (s === 'manual') return 'manual'
  if (s === 'auto' || s === 'automated') return 'auto'
  return 'other'
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatDate(iso: string) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
}

function statusMeta(status: string) {
  const n = normalizeStatus(status)
  if (n === 'verified') {
    return {
      label: 'Verified',
      icon: PhCheckCircle,
      class: 'bg-success/10 text-success-emphasis border-success/20',
    }
  }
  if (n === 'failed') {
    return {
      label: status || 'Failed',
      icon: PhWarningCircle,
      class: 'bg-destructive/10 text-destructive-emphasis border-destructive/20',
    }
  }
  return {
    label: status === 'pending' ? 'Pending' : status || 'Pending',
    icon: PhClock,
    class: 'bg-warning/10 text-warning-emphasis border-warning/20',
  }
}
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Button variant="outline" @click="exportAll">
          <PhDownload aria-hidden="true" />
          Export all
        </Button>
        <Button @click="openCreateDialog()">
          <PhPlus weight="bold" aria-hidden="true" />
          Add evidence
        </Button>
      </template>
    </PageHeader>

    <!-- Coverage + stats -->
    <section
      class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))]"
    >
      <!-- Progress frame -->
      <div class="rounded-lg border border-border bg-card p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Verification coverage</p>
            <p class="mt-1 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {{ isLoading ? '—' : `${verifiedCoverage}%` }}
            </p>
          </div>
          <span
            class="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground"
          >
            <PhCheckCircle
              :size="12"
              class="text-success-emphasis"
              weight="fill"
              aria-hidden="true"
            />
            {{ verifiedCount }} of {{ totalCount }} verified
          </span>
        </div>
        <div
          class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          :aria-valuenow="verifiedCoverage"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Verification coverage ${verifiedCoverage} percent`"
        >
          <div
            class="h-full rounded-full bg-primary transition-[width] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            :style="{ width: `${verifiedCoverage}%` }"
          />
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          {{ controlsWithEvidence }}
          {{ controlsWithEvidence === 1 ? 'control' : 'controls' }} with linked evidence
        </p>
      </div>

      <div
        v-for="stat in [
          {
            label: 'Total',
            value: totalCount,
            description: 'Collected items',
            icon: PhFileText,
            tone: 'text-foreground',
          },
          {
            label: 'Verified',
            value: verifiedCount,
            description: 'Ready for audit',
            icon: PhCheckCircle,
            tone: 'text-success-emphasis',
          },
          {
            label: 'Pending',
            value: pendingCount,
            description: 'Needs review',
            icon: PhClock,
            tone: 'text-warning-emphasis',
          },
          {
            label: 'Automated',
            value: autoCount,
            description: 'System-collected',
            icon: PhCpu,
            tone: 'text-info',
          },
        ]"
        :key="stat.label"
        class="rounded-lg border border-border bg-card p-4 sm:p-6"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-medium text-muted-foreground">{{ stat.label }}</p>
          <component
            :is="stat.icon"
            :size="14"
            class="opacity-70"
            :class="stat.tone"
            aria-hidden="true"
          />
        </div>
        <p class="mt-2 text-2xl font-semibold tracking-tight tabular-nums" :class="stat.tone">
          {{ isLoading ? '—' : stat.value }}
        </p>
        <p class="mt-0.5 text-xs text-muted-foreground">{{ stat.description }}</p>
      </div>
    </section>

    <!-- Main surface -->
    <div class="rounded-lg border border-border bg-card">
      <!-- Toolbar -->
      <div
        class="flex flex-col gap-3 border-b border-border p-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1 min-w-0">
          <div class="relative w-full sm:max-w-xs">
            <PhMagnifyingGlass
              :size="16"
              class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              v-model="searchQuery"
              class="pl-9 bg-background"
              placeholder="Search evidence or control…"
              aria-label="Search evidence"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
              @click="searchQuery = ''"
            >
              <PhX :size="14" />
            </button>
          </div>

          <Select v-model="statusFilter">
            <SelectTrigger
              size="sm"
              class="w-full sm:w-[140px] bg-background border-border shrink-0"
              aria-label="Filter by status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in statusFilters" :key="s.id" :value="s.id">
                {{ s.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="sourceFilter">
            <SelectTrigger
              size="sm"
              class="w-full sm:w-[140px] bg-background border-border shrink-0"
              aria-label="Filter by source"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in sourceFilters" :key="s.id" :value="s.id">
                {{ s.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <div
            v-if="viewMode === 'controls' && pagedGroups.length > 0"
            class="hidden sm:flex items-center gap-1 mr-1"
          >
            <Button
              variant="ghost"
              size="sm"
              class="h-8 text-xs text-muted-foreground"
              @click="expandAllVisible"
            >
              Expand
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 text-xs text-muted-foreground"
              @click="collapseAll"
            >
              Collapse
            </Button>
          </div>

          <div
            class="inline-flex rounded-md border border-border bg-muted/40 p-0.5"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              :class="
                viewMode === 'controls'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              "
              :aria-pressed="viewMode === 'controls'"
              @click="viewMode = 'controls'"
            >
              <PhSquaresFour :size="14" aria-hidden="true" />
              By control
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              :class="
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              "
              :aria-pressed="viewMode === 'list'"
              @click="viewMode = 'list'"
            >
              <PhListBullets :size="14" aria-hidden="true" />
              List
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading && evidences.length === 0" class="p-0">
        <ClarusLoadingState variant="table-rows" :rows="8" label="Loading evidence" />
      </div>

      <!-- Empty (no data at all) -->
      <div
        v-else-if="!isLoading && totalCount === 0"
        class="flex flex-col items-center justify-center gap-3 px-5 py-20 text-center"
      >
        <span
          class="flex size-12 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground"
        >
          <PhFolder :size="24" aria-hidden="true" />
        </span>
        <div class="max-w-sm">
          <p class="text-sm font-semibold text-foreground">No evidence collected yet</p>
          <p class="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Attach files or links to controls as proof of implementation. Grouping by control keeps
            audit review clear and fast.
          </p>
        </div>
        <Button size="sm" class="mt-2 gap-1.5 font-semibold text-xs" @click="openCreateDialog()">
          <PhPlus :size="14" weight="bold" aria-hidden="true" />
          Add first evidence
        </Button>
      </div>

      <!-- Empty filters -->
      <div
        v-else-if="!isLoading && totalForPagination === 0"
        class="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center"
      >
        <span
          class="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <PhFileText :size="20" aria-hidden="true" />
        </span>
        <div class="max-w-xs">
          <p class="text-sm font-medium text-foreground">No matching evidence</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Try a different search or clear filters to see the full library.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          class="mt-1 text-xs font-semibold"
          @click="resetFilters"
        >
          Clear filters
        </Button>
      </div>

      <!-- ── By control (grouped) ─────────────────────────────────────────── -->
      <div v-else-if="viewMode === 'controls'" class="divide-y divide-border">
        <section
          v-for="group in pagedGroups"
          :key="group.key"
          class="bg-card"
          :aria-labelledby="`group-${group.key}`"
        >
          <!-- Group header -->
          <div
            class="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 transition-colors"
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1.5 -m-1.5 hover:bg-muted/60 transition-colors"
              :aria-expanded="isExpanded(group.key)"
              :aria-controls="`group-panel-${group.key}`"
              @click="toggleGroup(group.key)"
            >
              <span
                class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground"
                aria-hidden="true"
              >
                <component :is="isExpanded(group.key) ? PhFolderOpen : PhFolder" :size="16" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <span
                    v-if="group.controlKey !== '—'"
                    class="font-mono text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm border border-border/40"
                  >
                    {{ group.controlKey }}
                  </span>
                  <span
                    :id="`group-${group.key}`"
                    class="text-sm font-semibold text-foreground text-balance"
                  >
                    {{ group.name }}
                  </span>
                </span>
                <span class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {{ group.evidences.length }}
                    {{ group.evidences.length === 1 ? 'item' : 'items' }}
                  </span>
                  <span class="text-border" aria-hidden="true">·</span>
                  <span class="inline-flex items-center gap-1">
                    <PhCheckCircle
                      :size="12"
                      class="text-success-emphasis"
                      weight="fill"
                      aria-hidden="true"
                    />
                    {{ group.verifiedCount }} verified
                  </span>
                  <template v-if="group.pendingCount > 0">
                    <span class="text-border" aria-hidden="true">·</span>
                    <span class="inline-flex items-center gap-1 text-warning-emphasis">
                      <PhClock :size="12" weight="fill" aria-hidden="true" />
                      {{ group.pendingCount }} pending
                    </span>
                  </template>
                </span>
              </span>
              <PhCaretDown
                :size="14"
                class="mt-2 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none"
                :class="{ 'rotate-180': isExpanded(group.key) }"
                aria-hidden="true"
              />
            </button>

            <div class="flex items-center gap-2 sm:pl-2 shrink-0">
              <!-- Mini coverage -->
              <div class="hidden sm:flex items-center gap-2 mr-1">
                <div class="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full bg-primary transition-[width] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                    :style="{ width: `${group.coverage}%` }"
                  />
                </div>
                <span class="text-xs font-medium tabular-nums text-muted-foreground w-8 text-right">
                  {{ group.coverage }}%
                </span>
              </div>

              <Button
                v-if="group.controlId && group.key !== '__unassigned__'"
                variant="ghost"
                size="sm"
                class="h-8 gap-1 text-xs text-muted-foreground"
                @click="goToControl(group)"
              >
                Open control
                <PhArrowUpRight :size="12" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="h-8 gap-1.5 text-xs font-semibold"
                @click="openCreateDialog(group.controlId)"
              >
                <PhPlus :size="13" weight="bold" aria-hidden="true" />
                Add
              </Button>
            </div>
          </div>

          <!-- Group body with smooth height transition -->
          <div
            :id="`group-panel-${group.key}`"
            class="grid transition-[grid-template-rows] duration-200 ease-out"
            :class="isExpanded(group.key) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
            :aria-hidden="!isExpanded(group.key)"
          >
            <div class="overflow-hidden border-t border-border/60 bg-muted/5">
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr
                      class="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground"
                    >
                      <th class="px-4 sm:px-6 py-2.5 font-medium">Evidence</th>
                      <th class="px-4 sm:px-6 py-2.5 font-medium">Source</th>
                      <th class="px-4 sm:px-6 py-2.5 font-medium">Reference</th>
                      <th class="px-4 sm:px-6 py-2.5 font-medium">Status</th>
                      <th class="px-4 sm:px-6 py-2.5 font-medium">Collected</th>
                      <th class="relative px-4 sm:px-6 py-2.5 w-12">
                        <span class="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="e in group.evidences"
                      :key="e.$id"
                      class="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td class="px-4 sm:px-6 py-3 align-top max-w-[280px]">
                        <div
                          class="font-medium text-foreground text-sm leading-normal truncate"
                          :title="e.title"
                        >
                          {{ e.title }}
                        </div>
                        <div
                          v-if="e.description"
                          class="text-xs text-muted-foreground mt-0.5 leading-normal truncate"
                          :title="e.description"
                        >
                          {{ e.description }}
                        </div>
                      </td>
                      <td class="px-4 sm:px-6 py-3 align-top whitespace-nowrap">
                        <span
                          v-if="normalizeSource(e.sourceType) === 'manual'"
                          class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border/80"
                        >
                          <PhUser :size="12" aria-hidden="true" />
                          Manual
                        </span>
                        <span
                          v-else-if="normalizeSource(e.sourceType) === 'auto'"
                          class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-info/10 text-info border border-info/20"
                        >
                          <PhCpu :size="12" aria-hidden="true" />
                          Automated
                        </span>
                        <span
                          v-else
                          class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border/80 capitalize"
                        >
                          {{ e.sourceType || 'Unknown' }}
                        </span>
                      </td>
                      <td class="px-4 sm:px-6 py-3 align-top whitespace-nowrap">
                        <Button
                          v-if="e.attachmentId"
                          variant="outline"
                          size="sm"
                          class="h-7 px-2 text-xs gap-1"
                          :disabled="downloadingId === e.$id"
                          @click="downloadFile(e.$id)"
                        >
                          <component
                            :is="downloadingId === e.$id ? PhSpinner : PhFile"
                            :size="12"
                            :class="{ 'animate-spin': downloadingId === e.$id }"
                            aria-hidden="true"
                          />
                          View file
                        </Button>
                        <a
                          v-else-if="e.externalReference"
                          :href="e.externalReference"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <PhLink :size="12" class="text-muted-foreground" aria-hidden="true" />
                          Open link
                        </a>
                        <span v-else class="text-xs text-muted-foreground italic">None</span>
                      </td>
                      <td class="px-4 sm:px-6 py-3 align-top whitespace-nowrap">
                        <span
                          class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border capitalize"
                          :class="statusMeta(e.status).class"
                        >
                          <component
                            :is="statusMeta(e.status).icon"
                            :size="12"
                            class="shrink-0"
                            aria-hidden="true"
                          />
                          {{ statusMeta(e.status).label }}
                        </span>
                      </td>
                      <td
                        class="px-4 sm:px-6 py-3 align-top text-muted-foreground tabular-nums text-xs whitespace-nowrap"
                      >
                        {{ formatDate(e.collectedAt || e.$createdAt) }}
                      </td>
                      <td class="px-4 sm:px-6 py-3 text-right align-top">
                        <Tooltip>
                          <TooltipTrigger as-child>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              :aria-label="`Delete ${e.title}`"
                              @click="removeEvidence(e.$id)"
                            >
                              <PhTrash :size="13" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete evidence</TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- ── Flat list ────────────────────────────────────────────────────── -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground"
            >
              <th class="px-4 sm:px-6 py-2.5">Evidence</th>
              <th class="px-4 sm:px-6 py-2.5">Control</th>
              <th class="px-4 sm:px-6 py-2.5">Source</th>
              <th class="px-4 sm:px-6 py-2.5">Reference</th>
              <th class="px-4 sm:px-6 py-2.5">Status</th>
              <th class="px-4 sm:px-6 py-2.5">Collected</th>
              <th class="relative px-4 sm:px-6 py-2.5 w-12">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="e in pagedList"
              :key="e.$id"
              class="group hover:bg-muted/20 transition-colors"
            >
              <td class="px-4 sm:px-6 py-3 align-top max-w-[280px]">
                <div class="flex items-start gap-3">
                  <div
                    class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
                    aria-hidden="true"
                  >
                    <PhFileText :size="16" />
                  </div>
                  <div class="min-w-0">
                    <div
                      class="font-medium text-foreground text-sm leading-normal truncate"
                      :title="e.title"
                    >
                      {{ e.title }}
                    </div>
                    <p
                      v-if="e.description"
                      class="mt-0.5 text-xs text-muted-foreground line-clamp-1"
                    >
                      {{ e.description }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 sm:px-6 py-3 align-top">
                <div class="flex flex-col items-start gap-1 max-w-[200px]">
                  <span
                    v-if="e.tenantControlId && controlById.get(e.tenantControlId)"
                    class="font-mono text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm border border-border/40"
                  >
                    {{ controlById.get(e.tenantControlId)!.controlKey }}
                  </span>
                  <span v-else class="text-xs text-muted-foreground italic">Unassigned</span>
                  <p
                    v-if="e.tenantControlId && controlById.get(e.tenantControlId)"
                    class="text-xs text-muted-foreground line-clamp-2 mt-0.5"
                    :title="controlById.get(e.tenantControlId)!.name"
                  >
                    {{ controlById.get(e.tenantControlId)!.name }}
                  </p>
                </div>
              </td>
              <td class="px-4 sm:px-6 py-3 align-top whitespace-nowrap">
                <span
                  v-if="normalizeSource(e.sourceType) === 'manual'"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border/80"
                >
                  <PhUser :size="12" aria-hidden="true" />
                  Manual
                </span>
                <span
                  v-else-if="normalizeSource(e.sourceType) === 'auto'"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-info/10 text-info border border-info/20"
                >
                  <PhCpu :size="12" aria-hidden="true" />
                  Automated
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border/80 capitalize"
                >
                  {{ e.sourceType || 'Unknown' }}
                </span>
              </td>
              <td class="px-4 sm:px-6 py-3 align-top whitespace-nowrap">
                <Button
                  v-if="e.attachmentId"
                  variant="outline"
                  size="sm"
                  class="h-7 px-2 text-xs gap-1"
                  :disabled="downloadingId === e.$id"
                  @click="downloadFile(e.$id)"
                >
                  <component
                    :is="downloadingId === e.$id ? PhSpinner : PhFile"
                    :size="12"
                    :class="{ 'animate-spin': downloadingId === e.$id }"
                    aria-hidden="true"
                  />
                  View file
                </Button>
                <a
                  v-else-if="e.externalReference"
                  :href="e.externalReference"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <PhLink :size="12" class="text-muted-foreground" aria-hidden="true" />
                  Open link
                </a>
                <span v-else class="text-xs text-muted-foreground italic">None</span>
              </td>
              <td class="px-4 sm:px-6 py-3 align-top whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border capitalize"
                  :class="statusMeta(e.status).class"
                >
                  <component
                    :is="statusMeta(e.status).icon"
                    :size="12"
                    class="shrink-0"
                    aria-hidden="true"
                  />
                  {{ statusMeta(e.status).label }}
                </span>
              </td>
              <td
                class="px-4 sm:px-6 py-3 align-top text-muted-foreground tabular-nums text-xs whitespace-nowrap"
              >
                {{ formatDate(e.collectedAt || e.$createdAt) }}
              </td>
              <td class="px-4 sm:px-6 py-3 text-right align-top">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      :aria-label="`Delete ${e.title}`"
                      @click="removeEvidence(e.$id)"
                    >
                      <PhTrash :size="13" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete evidence</TooltipContent>
                </Tooltip>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="totalForPagination > 0"
        class="flex items-center justify-between border-t border-border px-4 sm:px-6 py-3 bg-muted/10"
      >
        <p class="text-xs text-muted-foreground">
          Showing
          <span class="font-medium text-foreground">{{ rangeStart }}–{{ rangeEnd }}</span>
          of
          <span class="font-medium text-foreground">{{ totalForPagination }}</span>
          {{ viewMode === 'controls' ? 'controls' : 'items' }}
        </p>
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            class="size-8"
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
            class="size-8"
            :disabled="page === pageCount"
            aria-label="Next page"
            @click="page = Math.min(pageCount, page + 1)"
          >
            <PhCaretRight :size="14" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>

    <AddEvidenceDialog v-model:open="isEvidenceDialogOpen" :tenant-control-id="createControlId" />
  </div>
</template>
