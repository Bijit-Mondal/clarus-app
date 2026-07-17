<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  PhDownload,
  PhInfo,
  PhList,
  PhGridFour,
  PhMagnifyingGlass,
  PhX,
  PhCheckCircle,
  PhClock,
  PhWarningCircle,
  PhFile,
  PhFilePdf,
  PhFileImage,
  PhFileDoc,
  PhFileCsv,
  PhFileZip,
  PhLink,
  PhArrowSquareOut,
  PhCaretLeft,
  PhCaretRight,
  PhArrowUpRight,
  PhCopy,
  PhCheck,
} from '@phosphor-icons/vue'

import PageHeader from '@/components/shell/PageHeader.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { Evidence } from '@/api/evidence'
import {
  useEvidencesQuery,
  useDownloadEvidenceMutation,
} from '@/composables/useEvidence'
import { useTenantUsersQuery } from '@/composables/useTenants'
import { useTenantControlsQuery } from '@/composables/useControls'
import { useTenantTasksQuery } from '@/composables/useTasks'
import { getApiErrorMessage } from '@/lib/api'

// Route setup
const route = useRoute()
const organizationSlug = computed(() => route.params.organizationSlug as string)

// View State
const viewMode = ref<'list' | 'grid'>('list')
const isDetailsOpen = ref(true)

// Pagination & Query State
const limit = ref(25)
const offset = ref(0)
const searchQuery = ref('')
const sourceFilter = ref<'all' | 'manual' | 'auto'>('all')
const statusFilter = ref<'all' | 'pending' | 'verified' | 'available'>('all')

const {
  data: evidenceData,
  isPending: isEvidenceLoading,
  error: evidenceError,
  refetch,
} = useEvidencesQuery(
  computed(() => ({
    limit: limit.value,
    offset: offset.value,
    total: true,
  })),
)

// Auxiliary queries to map IDs to Names
const { data: tenantUsersData } = useTenantUsersQuery()
const { data: controlsData } = useTenantControlsQuery(ref(100), ref(0))
const { data: tasksData } = useTenantTasksQuery(100, 0)

// Mutations
const downloadMutation = useDownloadEvidenceMutation()

// Copy ID feedback state
const isCopied = ref(false)

// Compute mappings
const userMap = computed(() => {
  const map: Record<string, string> = {}
  tenantUsersData.value?.users?.forEach((u) => {
    map[u.$id] = u.name
  })
  return map
})

const controlMap = computed(() => {
  const map: Record<string, { key: string; name: string }> = {}
  controlsData.value?.tenantControls?.forEach((c) => {
    map[c.$id] = { key: c.controlKey, name: c.name }
    map[c.controlKey] = { key: c.controlKey, name: c.name }
  })
  return map
})

const taskMap = computed(() => {
  const map: Record<string, { id: string; title: string }> = {}
  tasksData.value?.tenantTasks?.forEach((t) => {
    map[t.$id] = { id: t.$id, title: t.title }
  })
  return map
})

// Process Evidences list
const evidences = computed(() => evidenceData.value?.evidences || [])
const totalCount = computed(() => evidenceData.value?.total || 0)

// Local Client filters
const filteredEvidences = computed(() => {
  let list = [...evidences.value]

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        e.$id.toLowerCase().includes(q),
    )
  }

  if (sourceFilter.value !== 'all') {
    list = list.filter((e) => e.sourceType === sourceFilter.value)
  }

  if (statusFilter.value !== 'all') {
    list = list.filter((e) => e.status === statusFilter.value)
  }

  return list
})

// Pagination Computeds
const pageCount = computed(() => Math.max(1, Math.ceil(totalCount.value / limit.value)))
const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
const rangeStart = computed(() => (totalCount.value === 0 ? 0 : offset.value + 1))
const rangeEnd = computed(() => Math.min(offset.value + limit.value, totalCount.value))

function prevPage() {
  if (offset.value >= limit.value) {
    offset.value -= limit.value
  }
}

function nextPage() {
  if (offset.value + limit.value < totalCount.value) {
    offset.value += limit.value
  }
}

// Active detail view state
const activeId = ref<string | null>(null)

const activeEvidence = computed(() => {
  return evidences.value.find((e) => e.$id === activeId.value) || null
})

// Set active id to the first evidence on load
watch(
  evidences,
  (newEvidences) => {
    const firstEvidence = newEvidences?.[0]
    if (firstEvidence && !activeId.value) {
      activeId.value = firstEvidence.$id
    }
  },
  { immediate: true },
)

function clickItem(id: string) {
  activeId.value = id
}

// File extension / Icon Helper
function getFileInfo(evidence: Evidence) {
  if (evidence.externalReference) {
    return {
      name: evidence.title,
      type: 'link',
      extension: 'URL',
      icon: PhLink,
      colorClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      themeColor: 'indigo',
    }
  }

  const filename = evidence.title || 'Attached File'
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return {
      name: filename,
      type: 'image',
      extension: ext.toUpperCase(),
      icon: PhFileImage,
      colorClass: 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:text-pink-400 dark:border-pink-500/30',
      iconColor: 'text-pink-600 dark:text-pink-400',
      themeColor: 'pink',
    }
  }
  if (ext === 'pdf') {
    return {
      name: filename,
      type: 'pdf',
      extension: 'PDF',
      icon: PhFilePdf,
      colorClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400 dark:border-rose-500/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      themeColor: 'rose',
    }
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return {
      name: filename,
      type: 'spreadsheet',
      extension: ext.toUpperCase(),
      icon: PhFileCsv,
      colorClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      themeColor: 'emerald',
    }
  }
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) {
    return {
      name: filename,
      type: 'document',
      extension: ext.toUpperCase(),
      icon: PhFileDoc,
      colorClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      themeColor: 'blue',
    }
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return {
      name: filename,
      type: 'archive',
      extension: 'ZIP',
      icon: PhFileZip,
      colorClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      themeColor: 'amber',
    }
  }

  return {
    name: filename,
    type: 'file',
    extension: ext.toUpperCase() || 'FILE',
    icon: PhFile,
    colorClass: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 dark:border-slate-500/30',
    iconColor: 'text-slate-600 dark:text-slate-400',
    themeColor: 'slate',
  }
}

// Copy attachment ID helper
async function copyAttachmentId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy ID', err)
  }
}

function resetFilters() {
  searchQuery.value = ''
  sourceFilter.value = 'all'
  statusFilter.value = 'all'
}

function formatRelativeTime(isoString: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`
    }
    return `${diffHours}h ago`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDate(isoString: string) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(isoString: string) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Map status helper for color / iconography (success=available/verified, warning=pending, destructive=failed/rejected)
function getStatusDetails(status?: string) {
  const s = status?.toLowerCase() || 'pending'
  if (s === 'verified' || s === 'available' || s === 'approved' || s === 'active') {
    return {
      label: 'Verified',
      icon: PhCheckCircle,
      badgeClass: 'bg-success/10 text-success-emphasis border-success/20 dark:bg-success/15 dark:text-success dark:border-success/30',
      iconColor: 'text-success-emphasis dark:text-success',
    }
  }
  if (s === 'failed' || s === 'rejected' || s === 'revoked') {
    return {
      label: 'Failed',
      icon: PhWarningCircle,
      badgeClass: 'bg-destructive/10 text-destructive-emphasis border-destructive/20 dark:bg-destructive/15 dark:text-destructive dark:border-destructive/30',
      iconColor: 'text-destructive-emphasis dark:text-destructive',
    }
  }
  return {
    label: 'Pending Review',
    icon: PhClock,
    badgeClass: 'bg-warning/10 text-warning-emphasis border-warning/20 dark:bg-warning/15 dark:text-warning dark:border-warning/30',
    iconColor: 'text-warning-emphasis dark:text-warning',
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader />

    <!-- Filters container -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
      <!-- Search Bar -->
      <div class="relative w-full md:max-w-sm">
        <PhMagnifyingGlass
          :size="16"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80"
          aria-hidden="true"
        />
        <Input
          v-model="searchQuery"
          type="search"
          placeholder="Search evidence files..."
          aria-label="Search evidence files"
          class="pl-9 bg-card border-border h-9.5 text-sm"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          @click="searchQuery = ''"
          aria-label="Clear search"
        >
          <PhX :size="14" />
        </button>
      </div>

      <!-- Filters & View Modes -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Source Filter -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-muted-foreground font-medium hidden sm:inline">Source:</span>
          <Select v-model="sourceFilter">
            <SelectTrigger
              size="sm"
              class="w-[140px] bg-card border-border h-9 text-xs"
              aria-label="Filter by source"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="manual">Manual Upload</SelectItem>
              <SelectItem value="auto">Integration</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Status Filter -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-muted-foreground font-medium hidden sm:inline">Status:</span>
          <Select v-model="statusFilter">
            <SelectTrigger
              size="sm"
              class="w-[140px] bg-card border-border h-9 text-xs"
              aria-label="Filter by status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="available">Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="h-5 w-px bg-border/80 hidden sm:block"></div>

        <!-- View Mode Toggler -->
        <div class="flex items-center gap-1 bg-muted/40 border border-border p-1 rounded-lg h-9">
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md transition-all cursor-pointer"
            :class="
              viewMode === 'list'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="viewMode = 'list'"
            title="List view"
          >
            <PhList :size="14" />
          </button>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md transition-all cursor-pointer"
            :class="
              viewMode === 'grid'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="viewMode = 'grid'"
            title="Grid view"
          >
            <PhGridFour :size="14" />
          </button>
        </div>

        <!-- Details Pane Toggler -->
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all cursor-pointer"
          :class="
            isDetailsOpen && activeEvidence
              ? 'bg-secondary border-border text-secondary-foreground shadow-2xs font-semibold'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          "
          @click="isDetailsOpen = !isDetailsOpen"
          title="Toggle Details Panel"
        >
          <PhInfo :size="15" />
        </button>
      </div>
    </div>

    <!-- Main Content & Details split layout -->
    <div class="flex flex-col lg:flex-row gap-6 items-start">
      <!-- Main Content Area -->
      <div class="flex-1 w-full min-w-0">
        <!-- Error State -->
        <div
          v-if="evidenceError"
          class="flex flex-col items-center justify-center p-8 border border-destructive/20 rounded-lg bg-destructive/5 text-center animate-fade-in"
        >
          <PhWarningCircle :size="32" class="text-destructive mb-2" />
          <h3 class="text-sm font-semibold text-foreground">Failed to load evidence</h3>
          <p class="text-xs text-muted-foreground mt-1">
            {{ getApiErrorMessage(evidenceError) }}
          </p>
          <Button
            variant="outline"
            size="sm"
            class="mt-4 border-destructive/20 hover:bg-destructive/10"
            @click="refetch"
          >
            Try again
          </Button>
        </div>

        <!-- Loading State -->
        <ClarusLoadingState
          v-else-if="isEvidenceLoading"
          variant="table-rows"
          class="border border-border/60 rounded-lg py-12"
        />

        <!-- Empty State -->
        <div
          v-else-if="filteredEvidences.length === 0"
          class="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border rounded-lg bg-card text-center animate-fade-in"
        >
          <div
            class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4"
          >
            <PhFile :size="24" />
          </div>
          <h3 class="text-sm font-semibold text-foreground">No evidence matches your filters</h3>
          <p class="text-xs text-muted-foreground mt-1 max-w-sm">
            Try adjusting your search query, source filter, or status filter to see other evidence files.
          </p>
          <div class="flex gap-3 mt-5">
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer h-8 text-xs"
              @click="resetFilters"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        <!-- Views -->
        <div v-else class="animate-fade-in">
          <!-- List View -->
          <div
            v-if="viewMode === 'list'"
            class="rounded-lg border border-border bg-card overflow-hidden"
          >
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-left text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground">
                    <th scope="col" class="px-5 py-3 font-medium">Name</th>
                    <th scope="col" class="px-5 py-3 font-medium">Mapped Control</th>
                    <th scope="col" class="px-5 py-3 font-medium">Source</th>
                    <th scope="col" class="px-5 py-3 font-medium">Status</th>
                    <th scope="col" class="px-5 py-3 font-medium">Collected</th>
                    <th scope="col" class="px-5 py-3 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr
                    v-for="item in filteredEvidences"
                    :key="item.$id"
                    class="group hover:bg-muted/40 cursor-pointer transition-colors"
                    :class="{ 'bg-secondary/40': activeId === item.$id }"
                    @click="clickItem(item.$id)"
                  >
                    <!-- Name & File Icon -->
                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-3">
                        <span
                          class="flex size-8 items-center justify-center rounded-lg border shrink-0"
                          :class="getFileInfo(item).colorClass"
                        >
                          <component :is="getFileInfo(item).icon" :size="15" />
                        </span>
                        <div class="min-w-0 flex flex-col">
                          <span
                            class="font-medium text-foreground truncate max-w-[260px]"
                            :title="item.title"
                          >
                            {{ item.title }}
                          </span>
                          <span class="text-[10px] text-muted-foreground truncate max-w-[260px]">
                            ID: {{ item.$id }}
                          </span>
                        </div>
                      </div>
                    </td>

                    <!-- Mapped Control -->
                    <td class="px-5 py-3.5">
                      <div v-if="item.tenantControlId" class="flex flex-col gap-0.5">
                        <router-link
                          :to="{
                            name: 'compliance-control-detail',
                            params: {
                              organizationSlug,
                              controlId:
                                controlMap[item.tenantControlId]?.key || item.tenantControlId,
                            },
                          }"
                          class="font-mono text-xs font-semibold text-primary hover:underline w-fit"
                          @click.stop
                        >
                          {{ controlMap[item.tenantControlId]?.key || item.tenantControlId }}
                        </router-link>
                        <span class="text-[10px] text-muted-foreground max-w-[160px] truncate">
                          {{ controlMap[item.tenantControlId]?.name || 'Internal Control' }}
                        </span>
                      </div>
                      <span v-else class="text-xs text-muted-foreground">—</span>
                    </td>

                    <!-- Source -->
                    <td class="px-5 py-3.5">
                      <Badge
                        variant="outline"
                        class="capitalize text-[10px] font-semibold py-0 px-1.5 h-5 bg-background border-border text-muted-foreground"
                      >
                        {{ item.sourceType === 'manual' ? 'Manual Upload' : 'Integration' }}
                      </Badge>
                    </td>

                    <!-- Status Badge -->
                    <td class="px-5 py-3.5">
                      <Badge
                        variant="outline"
                        class="gap-1.5 text-[10px] font-semibold py-0 px-2 h-5.5 select-none"
                        :class="getStatusDetails(item.status).badgeClass"
                      >
                        <component
                          :is="getStatusDetails(item.status).icon"
                          :size="11"
                        />
                        {{ getStatusDetails(item.status).label }}
                      </Badge>
                    </td>

                    <!-- Collected Date -->
                    <td class="px-5 py-3.5 text-xs text-muted-foreground">
                      {{ formatDateShort(item.collectedAt) }}
                    </td>

                    <!-- Actions -->
                    <td class="px-5 py-3.5 text-right" @click.stop>
                      <a
                        v-if="item.externalReference"
                        :href="item.externalReference"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                        title="Open external link"
                      >
                        <PhArrowSquareOut :size="14" />
                      </a>
                      <Button
                        v-else
                        variant="ghost"
                        size="icon-sm"
                        class="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        @click.stop="downloadMutation.mutate(item.$id)"
                        title="Download attachment"
                      >
                        <PhDownload :size="14" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Grid View -->
          <div
            v-else-if="viewMode === 'grid'"
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <div
              v-for="item in filteredEvidences"
              :key="item.$id"
              class="group relative flex flex-col justify-between rounded-lg border p-4 bg-card cursor-pointer hover:bg-muted/20 transition-all duration-200"
              :class="activeId === item.$id ? 'border-primary ring-1 ring-primary bg-accent/10 shadow-sm' : 'border-border'"
              @click="clickItem(item.$id)"
            >
              <!-- Card Top Row: File icon & Action button -->
              <div class="flex items-start justify-between">
                <span
                  class="flex h-10 w-10 items-center justify-center rounded-lg border shrink-0 animate-fade-in"
                  :class="getFileInfo(item).colorClass"
                >
                  <component :is="getFileInfo(item).icon" :size="20" />
                </span>

                <!-- Action -->
                <div @click.stop>
                  <a
                    v-if="item.externalReference"
                    :href="item.externalReference"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors animate-fade-in"
                    title="Open external link"
                  >
                    <PhArrowSquareOut :size="14" />
                  </a>
                  <Button
                    v-else
                    variant="ghost"
                    size="icon-sm"
                    class="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer animate-fade-in"
                    @click.stop="downloadMutation.mutate(item.$id)"
                    title="Download attachment"
                  >
                    <PhDownload :size="14" />
                  </Button>
                </div>
              </div>

              <!-- Title and ID -->
              <div class="mt-4 flex-1">
                <h4
                  class="text-xs font-semibold text-foreground line-clamp-2"
                  :title="item.title"
                >
                  {{ item.title }}
                </h4>
                <p class="mt-1 text-[9px] font-mono text-muted-foreground truncate">
                  ID: {{ item.$id }}
                </p>
              </div>

              <!-- Mapped control and status -->
              <div class="mt-4 pt-3 border-t border-border/45 flex items-center justify-between gap-2">
                <!-- Status Badge -->
                <Badge
                  variant="outline"
                  class="gap-1 text-[9px] font-semibold py-0 px-1.5 h-4.5 select-none"
                  :class="getStatusDetails(item.status).badgeClass"
                >
                  <component
                    :is="getStatusDetails(item.status).icon"
                    :size="9"
                  />
                  {{ getStatusDetails(item.status).label }}
                </Badge>

                <!-- Mapped Control key -->
                <span
                  v-if="item.tenantControlId"
                  class="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground"
                >
                  {{ controlMap[item.tenantControlId]?.key || item.tenantControlId }}
                </span>
              </div>
            </div>
          </div>

          <!-- Pagination Bar -->
          <div class="mt-6 flex items-center justify-between border-t border-border pt-4">
            <span class="text-xs text-muted-foreground">
              Showing <strong class="font-medium text-foreground">{{ rangeStart }}</strong> to
              <strong class="font-medium text-foreground">{{ rangeEnd }}</strong> of
              <strong class="font-medium text-foreground">{{ totalCount }}</strong> items
            </span>

            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                class="h-8 w-8 p-0 cursor-pointer border-border"
                :disabled="offset === 0"
                @click="prevPage"
                title="Previous page"
              >
                <PhCaretLeft :size="15" />
              </Button>
              <span class="text-xs font-medium text-foreground">
                Page {{ currentPage }} of {{ pageCount }}
              </span>
              <Button
                variant="outline"
                size="sm"
                class="h-8 w-8 p-0 cursor-pointer border-border"
                :disabled="offset + limit >= totalCount"
                @click="nextPage"
                title="Next page"
              >
                <PhCaretRight :size="15" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Collapsible Details Pane -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform translate-x-4 opacity-0 lg:translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="transform translate-x-4 opacity-0 lg:translate-x-0"
      >
        <aside
          v-if="isDetailsOpen && activeEvidence"
          class="w-full lg:w-80 shrink-0 rounded-lg border border-border bg-card p-4 space-y-5 animate-fade-in"
          aria-label="Evidence details pane"
        >
          <!-- Pane Header -->
          <div class="flex items-center justify-between border-b border-border pb-3">
            <div class="flex items-center gap-2">
              <PhInfo :size="16" class="text-muted-foreground" />
              <h3 class="text-sm font-semibold text-foreground">Details</h3>
            </div>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              @click="isDetailsOpen = false"
              title="Close Details Pane"
            >
              <PhX :size="16" />
            </button>
          </div>

          <!-- File Large Preview -->
          <div
            class="flex flex-col items-center justify-center p-5 border border-border/40 rounded-lg bg-muted/20"
          >
            <span
              class="flex h-14 w-14 items-center justify-center rounded-lg border text-sm"
              :class="getFileInfo(activeEvidence).colorClass"
            >
              <component :is="getFileInfo(activeEvidence).icon" :size="24" />
            </span>
            <span
              class="mt-2 text-[10px] font-mono font-bold text-muted-foreground tracking-wider uppercase"
            >
              {{ getFileInfo(activeEvidence).extension }}
            </span>
            <h4 class="mt-2.5 text-xs font-semibold text-foreground text-center break-all px-2 select-all leading-snug">
              {{ activeEvidence.title }}
            </h4>
          </div>

          <!-- Details Properties List -->
          <div class="space-y-4 text-xs">
            <!-- Status Detail -->
            <div class="py-1">
              <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block mb-1">Verification Status</span>
              <div class="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  class="gap-1.5 text-[10px] font-semibold py-0 px-2 h-5.5 select-none"
                  :class="getStatusDetails(activeEvidence.status).badgeClass"
                >
                  <component
                    :is="getStatusDetails(activeEvidence.status).icon"
                    :size="11"
                  />
                  {{ getStatusDetails(activeEvidence.status).label }}
                </Badge>
              </div>
            </div>

            <!-- Mapped Control -->
            <div class="py-1">
              <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block mb-1">Mapped Control</span>
              <div v-if="activeEvidence.tenantControlId" class="flex flex-col gap-0.5">
                <router-link
                  :to="{
                    name: 'compliance-control-detail',
                    params: {
                      organizationSlug,
                      controlId:
                        controlMap[activeEvidence.tenantControlId]?.key ||
                        activeEvidence.tenantControlId,
                    },
                  }"
                  class="font-mono text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 w-fit"
                >
                  {{
                    controlMap[activeEvidence.tenantControlId]?.key ||
                    activeEvidence.tenantControlId
                  }}
                  <PhArrowUpRight :size="12" class="opacity-60" />
                </router-link>
                <span class="text-[10px] text-muted-foreground truncate">
                  {{
                    controlMap[activeEvidence.tenantControlId]?.name ||
                    'Internal compliance control'
                  }}
                </span>
              </div>
              <span v-else class="text-xs text-muted-foreground italic">None linked</span>
            </div>

            <!-- Linked Task -->
            <div class="py-1">
              <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block mb-1">Linked Task</span>
              <div v-if="activeEvidence.tenantTaskId" class="flex flex-col gap-0.5">
                <router-link
                  :to="{
                    name: 'compliance-task-detail',
                    params: { organizationSlug, taskId: activeEvidence.tenantTaskId },
                  }"
                  class="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 w-fit"
                >
                  {{ taskMap[activeEvidence.tenantTaskId]?.title || 'View linked task' }}
                  <PhArrowUpRight :size="12" class="opacity-60" />
                </router-link>
                <span class="text-[10px] text-muted-foreground font-mono">
                  ID: {{ activeEvidence.tenantTaskId }}
                </span>
              </div>
              <span v-else class="text-xs text-muted-foreground italic">None linked</span>
            </div>

            <div class="h-px bg-border/60"></div>

            <!-- Source Type -->
            <div class="flex justify-between gap-4 py-0.5">
              <span class="text-muted-foreground font-medium">Source type</span>
              <span class="font-medium text-foreground capitalize">{{
                activeEvidence.sourceType === 'manual' ? 'Manual Upload' : 'Integration'
              }}</span>
            </div>

            <!-- Collected date -->
            <div class="flex justify-between gap-4 py-0.5">
              <span class="text-muted-foreground font-medium">Collected</span>
              <span class="font-medium text-foreground text-right">{{
                formatDate(activeEvidence.collectedAt)
              }}</span>
            </div>

            <!-- Created by -->
            <div class="flex justify-between gap-4 py-0.5">
              <span class="text-muted-foreground font-medium">Uploaded by</span>
              <span class="font-medium text-foreground text-right">
                {{ userMap[activeEvidence.createdById] || activeEvidence.createdById || 'System' }}
              </span>
            </div>

            <!-- Last modified -->
            <div class="flex justify-between gap-4 py-0.5">
              <span class="text-muted-foreground font-medium">Last modified</span>
              <span class="font-medium text-foreground text-right">{{
                formatDate(activeEvidence.$updatedAt)
              }}</span>
            </div>

            <div class="h-px bg-border/60"></div>

            <!-- Attachment ID -->
            <div v-if="activeEvidence.attachmentId" class="py-1">
              <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block mb-1">Attachment ID</span>
              <div class="flex items-center gap-1 bg-muted p-1.5 rounded-md border border-border">
                <span class="font-mono text-[10px] text-foreground truncate flex-1 select-all">
                  {{ activeEvidence.attachmentId }}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  @click="copyAttachmentId(activeEvidence.attachmentId)"
                  :title="isCopied ? 'Copied!' : 'Copy ID'"
                >
                  <component :is="isCopied ? PhCheck : PhCopy" :size="12" :class="{ 'text-success': isCopied }" />
                </Button>
              </div>
            </div>

            <!-- External Reference link -->
            <div v-if="activeEvidence.externalReference" class="py-1">
              <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block mb-1">External Link</span>
              <a
                :href="activeEvidence.externalReference"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 font-semibold text-primary hover:underline break-all"
              >
                {{ activeEvidence.externalReference }}
                <PhArrowSquareOut :size="12" />
              </a>
            </div>

            <!-- Description -->
            <div v-if="activeEvidence.description" class="py-1">
              <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block mb-1">Description</span>
              <p class="text-foreground leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border/40 italic">
                "{{ activeEvidence.description }}"
              </p>
            </div>
          </div>

          <!-- Primary Action Button -->
          <div class="pt-2">
            <a
              v-if="activeEvidence.externalReference"
              :href="activeEvidence.externalReference"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <PhArrowSquareOut :size="14" />
              Open external link
            </a>
            <Button
              v-else
              variant="default"
              class="w-full gap-2 cursor-pointer h-9 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm"
              @click="downloadMutation.mutate(activeEvidence.$id)"
            >
              <PhDownload :size="14" />
              Download attachment
            </Button>
          </div>
        </aside>
      </transition>
    </div>
  </div>
</template>
