<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhCaretLeft,
  PhCaretRight,
  PhCheckCircle,
  PhClock,
  PhCpu,
  PhDownload,
  PhFile,
  PhFileText,
  PhFolder,
  PhLink,
  PhListBullets,
  PhMagnifyingGlass,
  PhPlus,
  PhSpinner,
  PhSquaresFour,
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
const PAGE_SIZE_GRID = 12
const PAGE_SIZE_LIST = 10

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

const pageSize = computed(() => (viewMode.value === 'controls' ? PAGE_SIZE_GRID : PAGE_SIZE_LIST))

const totalForPagination = computed(() =>
  viewMode.value === 'controls' ? controlGroups.value.length : filteredEvidences.value.length,
)

const pageCount = computed(() => Math.max(1, Math.ceil(totalForPagination.value / pageSize.value)))

const pagedGroups = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return controlGroups.value.slice(start, start + pageSize.value)
})

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredEvidences.value
    .slice()
    .sort(
      (a, b) =>
        new Date(b.collectedAt || b.$createdAt).getTime() -
        new Date(a.collectedAt || a.$createdAt).getTime(),
    )
    .slice(start, start + pageSize.value)
})

const rangeStart = computed(() =>
  totalForPagination.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1,
)
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, totalForPagination.value))

watch([searchQuery, statusFilter, sourceFilter, viewMode], () => {
  page.value = 1
})

// ── Stats ─────────────────────────────────────────────────────────────────────
const totalCount = computed(() => evidencesData.value?.total ?? evidences.value.length)
const verifiedCount = computed(
  () => evidences.value.filter((e) => normalizeStatus(e.status) === 'verified').length,
)
const pendingCount = computed(
  () => evidences.value.filter((e) => normalizeStatus(e.status) === 'pending').length,
)
const failedCount = computed(
  () => evidences.value.filter((e) => normalizeStatus(e.status) === 'failed').length,
)
const autoCount = computed(
  () => evidences.value.filter((e) => normalizeSource(e.sourceType) === 'auto').length,
)
const verifiedCoverage = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((verifiedCount.value / totalCount.value) * 100)
})
const remainingCount = computed(() => Math.max(0, totalCount.value - verifiedCount.value))

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

function goToControl(group: ControlGroup) {
  if (!group.controlId || group.key === '__unassigned__') return
  const resolved = controlById.value.get(group.controlId)
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

// Semantic base colors follow the DocumentsPage color-mix pattern.
const evidenceStatusConfig = {
  verified: {
    label: 'Verified',
    icon: PhCheckCircle,
    base: 'var(--success-emphasis)',
    iconWeight: 'fill' as const,
  },
  pending: {
    label: 'Pending',
    icon: PhClock,
    base: 'var(--warning-emphasis)',
    iconWeight: 'fill' as const,
  },
  failed: {
    label: 'Failed',
    icon: PhWarningCircle,
    base: 'var(--destructive-emphasis)',
    iconWeight: 'fill' as const,
  },
} as const

function statusBadgeStyle(base: string) {
  return {
    backgroundColor: `color-mix(in oklab, ${base} 15%, transparent)`,
    color: base,
  }
}

function statusMeta(status: string) {
  return evidenceStatusConfig[normalizeStatus(status)]
}
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Button variant="outline" size="sm" @click="exportAll">
          <PhDownload :size="15" aria-hidden="true" />
          Export all
        </Button>
        <Button size="sm" @click="openCreateDialog()">
          <PhPlus :size="15" weight="bold" aria-hidden="true" />
          Add evidence
        </Button>
      </template>
    </PageHeader>

    <!-- Stats: Progress + Verified · Pending · Failed · Automated ───────────── -->
    <section
      class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      aria-label="Evidence overview"
    >
      <!-- Progress (wider) -->
      <div class="col-span-2 rounded-lg border border-border bg-card p-4 lg:col-span-2">
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-medium text-muted-foreground">Verification progress</p>
          <p
            class="text-2xl font-semibold tracking-tight text-foreground tabular-nums leading-none"
          >
            {{ isLoading ? '—' : `${verifiedCoverage}%` }}
          </p>
        </div>
        <div
          class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          :aria-valuenow="verifiedCoverage"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Verified coverage ${verifiedCoverage} percent`"
        >
          <div
            class="h-full rounded-full bg-success transition-[width] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            :style="{ width: `${verifiedCoverage}%` }"
          />
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span class="tabular-nums">
            {{ isLoading ? '—' : `${verifiedCount} of ${totalCount} verified` }}
          </span>
          <span v-if="!isLoading" class="tabular-nums">{{ remainingCount }} remaining</span>
        </div>
      </div>

      <!-- Verified -->
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-xs font-medium text-muted-foreground">Verified</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {{ isLoading ? '—' : verifiedCount }}
        </p>
        <p class="mt-0.5 text-xs text-muted-foreground">Ready for audit</p>
      </div>

      <!-- Pending -->
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-xs font-medium text-muted-foreground">Pending</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {{ isLoading ? '—' : pendingCount }}
        </p>
        <p class="mt-0.5 text-xs text-muted-foreground">Needs review</p>
      </div>

      <!-- Failed -->
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-xs font-medium text-muted-foreground">Failed</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {{ isLoading ? '—' : failedCount }}
        </p>
        <p class="mt-0.5 text-xs text-muted-foreground">Action required</p>
      </div>

      <!-- Automated -->
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-xs font-medium text-muted-foreground">Automated</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {{ isLoading ? '—' : autoCount }}
        </p>
        <p class="mt-0.5 text-xs text-muted-foreground">System-collected</p>
      </div>
    </section>

    <!-- Toolbar: search, filters, view toggle ───────────────────────────────── -->
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-1 flex-wrap items-center gap-2 min-w-0">
        <div class="relative w-full sm:max-w-xs">
          <PhMagnifyingGlass
            :size="16"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            v-model="searchQuery"
            type="search"
            class="pl-9 bg-card"
            placeholder="Search evidence or control…"
            aria-label="Search evidence"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
            @click="searchQuery = ''"
          >
            <PhX :size="12" />
          </button>
        </div>

        <Select v-model="statusFilter">
          <SelectTrigger
            size="sm"
            class="w-full sm:w-[140px] bg-card border-border shrink-0"
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
            class="w-full sm:w-[140px] bg-card border-border shrink-0"
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

      <nav class="flex items-center gap-1.5 shrink-0" aria-label="View mode">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          :class="
            viewMode === 'controls'
              ? 'bg-secondary text-secondary-foreground shadow-2xs'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          "
          :aria-pressed="viewMode === 'controls'"
          @click="viewMode = 'controls'"
        >
          <PhSquaresFour :size="14" aria-hidden="true" />
          By control
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          :class="
            viewMode === 'list'
              ? 'bg-secondary text-secondary-foreground shadow-2xs'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          "
          :aria-pressed="viewMode === 'list'"
          @click="viewMode = 'list'"
        >
          <PhListBullets :size="14" aria-hidden="true" />
          List
        </button>
      </nav>
    </div>

    <!-- Loading ─────────────────────────────────────────────────────────────── -->
    <section
      v-if="isLoading && evidences.length === 0"
      class="rounded-lg border border-border bg-card"
    >
      <ClarusLoadingState variant="table-rows" :rows="8" label="Loading evidence" />
    </section>

    <!-- Empty (no data at all) ──────────────────────────────────────────────── -->
    <section
      v-else-if="!isLoading && totalCount === 0"
      class="rounded-lg border border-border bg-card p-8 md:p-12 text-center"
    >
      <div
        class="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-4"
      >
        <PhFolder :size="24" aria-hidden="true" />
      </div>
      <h2 class="text-lg font-semibold text-foreground">No evidence collected yet</h2>
      <p class="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        Attach files or links to controls as proof of implementation. Grouping evidence by control
        keeps audit review clear and fast.
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <Button size="sm" @click="openCreateDialog()">
          <PhPlus :size="15" weight="bold" aria-hidden="true" />
          Add first evidence
        </Button>
      </div>
    </section>

    <!-- Empty filters ───────────────────────────────────────────────────────── -->
    <section
      v-else-if="!isLoading && totalForPagination === 0"
      class="rounded-lg border border-border bg-card"
    >
      <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span
          class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <PhMagnifyingGlass :size="20" />
        </span>
        <div class="space-y-1">
          <p class="font-medium text-foreground">No evidence matches your filters</p>
          <p class="text-sm text-muted-foreground">
            Try a different search term, or clear the filters to see everything.
          </p>
        </div>
        <Button variant="outline" size="sm" @click="resetFilters">Clear filters</Button>
      </div>
    </section>

    <!-- ── By control (card grid) ──────────────────────────────────────────── -->
    <section
      v-else-if="viewMode === 'controls'"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="Evidence grouped by control"
    >
      <article
        v-for="group in pagedGroups"
        :key="group.key"
        class="group relative flex flex-col rounded-lg border border-border bg-card transition-shadow focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        :class="group.key === '__unassigned__' ? '' : 'cursor-pointer hover:shadow-sm'"
        :tabindex="group.key === '__unassigned__' ? undefined : 0"
        :role="group.key === '__unassigned__' ? undefined : 'button'"
        :aria-label="
          group.key === '__unassigned__'
            ? `Unassigned evidence, ${group.evidences.length} items`
            : `Open ${group.controlKey} · ${group.name}`
        "
        @click="goToControl(group)"
        @keydown.enter="goToControl(group)"
        @keydown.space.prevent="goToControl(group)"
      >
        <!-- Top: icon chip + coverage -->
        <div class="flex items-start justify-between p-4 pb-3">
          <div
            class="flex size-9 items-center justify-center rounded-md bg-muted/60 text-foreground"
            aria-hidden="true"
          >
            <PhFolder :size="18" />
          </div>
          <span
            class="text-sm font-semibold tabular-nums leading-none"
            :class="
              group.evidences.length === 0
                ? 'text-muted-foreground'
                : group.coverage >= 100
                  ? 'text-success-emphasis'
                  : 'text-foreground'
            "
          >
            {{ group.coverage }}%
          </span>
        </div>

        <!-- Middle: name + control key -->
        <div class="min-w-0 px-4 pb-4">
          <h3
            class="truncate text-sm font-semibold leading-snug text-foreground"
            :title="group.name"
          >
            {{ group.name }}
          </h3>
          <p
            v-if="group.controlKey && group.controlKey !== '—'"
            class="mt-0.5 truncate font-mono text-xs text-muted-foreground"
          >
            {{ group.controlKey }}
          </p>
        </div>

        <!-- Bottom strip: metadata -->
        <div
          class="mt-auto flex items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground"
        >
          <span class="tabular-nums">
            {{ group.evidences.length }}
            {{ group.evidences.length === 1 ? 'item' : 'items' }}
          </span>
          <template v-if="group.verifiedCount > 0">
            <span aria-hidden="true" class="text-border">·</span>
            <span class="inline-flex items-center gap-1 text-success-emphasis">
              <PhCheckCircle :size="11" weight="fill" aria-hidden="true" />
              {{ group.verifiedCount }} verified
            </span>
          </template>
          <template v-if="group.pendingCount > 0">
            <span aria-hidden="true" class="text-border">·</span>
            <span class="inline-flex items-center gap-1 text-warning-emphasis">
              <PhClock :size="11" weight="fill" aria-hidden="true" />
              {{ group.pendingCount }} pending
            </span>
          </template>
        </div>
      </article>
    </section>

    <!-- ── Flat list ───────────────────────────────────────────────────────── -->
    <section v-else class="rounded-lg border border-border bg-card" aria-label="Evidence list">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-border bg-muted/20 text-xs text-muted-foreground font-medium"
            >
              <th class="px-5 py-3">Evidence</th>
              <th class="px-5 py-3">Control</th>
              <th class="px-5 py-3">Source</th>
              <th class="px-5 py-3">Reference</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Collected</th>
              <th class="relative px-5 py-3 w-12">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="e in pagedList"
              :key="e.$id"
              class="group border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
            >
              <td class="px-5 py-4 align-top max-w-[280px]">
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
              <td class="px-5 py-4 align-top">
                <div class="flex flex-col items-start gap-1 max-w-[200px]">
                  <span
                    v-if="e.tenantControlId && controlById.get(e.tenantControlId)"
                    class="font-mono text-[11px] font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border tracking-wide"
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
              <td class="px-5 py-4 align-top whitespace-nowrap">
                <span
                  v-if="normalizeSource(e.sourceType) === 'manual'"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border leading-none text-muted-foreground"
                  :style="{
                    backgroundColor: `color-mix(in oklab, var(--muted-foreground) 12%, transparent)`,
                    borderColor: `color-mix(in oklab, var(--muted-foreground) 20%, transparent)`,
                  }"
                >
                  <PhUser :size="12" aria-hidden="true" />
                  Manual
                </span>
                <span
                  v-else-if="normalizeSource(e.sourceType) === 'auto'"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border leading-none"
                  :style="{
                    backgroundColor: `color-mix(in oklab, var(--info) 12%, transparent)`,
                    color: 'var(--info)',
                    borderColor: `color-mix(in oklab, var(--info) 20%, transparent)`,
                  }"
                >
                  <PhCpu :size="12" aria-hidden="true" />
                  Automated
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border leading-none text-muted-foreground capitalize"
                  :style="{
                    backgroundColor: `color-mix(in oklab, var(--muted-foreground) 12%, transparent)`,
                    borderColor: `color-mix(in oklab, var(--muted-foreground) 20%, transparent)`,
                  }"
                >
                  {{ e.sourceType || 'Unknown' }}
                </span>
              </td>
              <td class="px-5 py-4 align-top whitespace-nowrap">
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
              <td class="px-5 py-4 align-top whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :style="statusBadgeStyle(statusMeta(e.status).base)"
                >
                  <component
                    :is="statusMeta(e.status).icon"
                    :size="13"
                    :weight="statusMeta(e.status).iconWeight"
                    aria-hidden="true"
                  />
                  {{ statusMeta(e.status).label }}
                </span>
              </td>
              <td
                class="px-5 py-4 align-top whitespace-nowrap text-muted-foreground tabular-nums text-xs"
              >
                {{ formatDate(e.collectedAt || e.$createdAt) }}
              </td>
              <td class="px-5 py-4 text-right align-top">
                <div
                  class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        :aria-label="`Delete ${e.title}`"
                        @click="removeEvidence(e.$id)"
                      >
                        <PhTrash :size="15" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete evidence</TooltipContent>
                  </Tooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div
          v-if="totalForPagination > 0"
          class="flex flex-col gap-3 border-t border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between bg-muted/10"
        >
          <p class="text-xs text-muted-foreground" aria-live="polite">
            Showing
            <span class="font-medium text-foreground">{{ rangeStart }}–{{ rangeEnd }}</span> of
            <span class="font-medium text-foreground">{{ totalForPagination }}</span> items
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
    </section>

    <!-- Pagination for card-grid view (outside the grid) ────────────────────── -->
    <div
      v-if="viewMode === 'controls' && totalForPagination > 0 && !isLoading"
      class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-xs text-muted-foreground" aria-live="polite">
        Showing
        <span class="font-medium text-foreground">{{ rangeStart }}–{{ rangeEnd }}</span> of
        <span class="font-medium text-foreground">{{ totalForPagination }}</span> controls
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

    <AddEvidenceDialog v-model:open="isEvidenceDialogOpen" :tenant-control-id="createControlId" />
  </div>
</template>
