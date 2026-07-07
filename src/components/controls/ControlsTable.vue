<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  PhArrowDown,
  PhArrowUp,
  PhCaretLeft,
  PhCaretRight,
  PhMagnifyingGlass,
} from '@phosphor-icons/vue'
import ControlStatusBadge from '@/components/controls/ControlStatusBadge.vue'
import EvidenceIndicator from '@/components/controls/EvidenceIndicator.vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FRAMEWORKS,
  FRAMEWORK_ORDER,
  OWNER_LIST,
  type Control,
  type ControlStatus,
  type FrameworkId,
} from '@/data/controls'

const props = defineProps<{ controls: Control[] }>()

const PAGE_SIZE = 8

const search = ref('')
const statusFilter = ref<ControlStatus | 'all'>('all')
const frameworkFilter = ref<FrameworkId | 'all'>('all')
const ownerFilter = ref<string>('all')

type SortKey = 'code' | 'nextReview'
const sortKey = ref<SortKey>('nextReview')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)

const hasActiveFilters = computed(
  () =>
    search.value.trim() !== '' ||
    statusFilter.value !== 'all' ||
    frameworkFilter.value !== 'all' ||
    ownerFilter.value !== 'all',
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return props.controls.filter((c) => {
    if (q && !`${c.code} ${c.name}`.toLowerCase().includes(q)) return false
    if (statusFilter.value !== 'all' && c.status !== statusFilter.value) return false
    if (
      frameworkFilter.value !== 'all' &&
      !c.frameworks.includes(frameworkFilter.value)
    )
      return false
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
const rangeEnd = computed(() =>
  Math.min(page.value * PAGE_SIZE, sorted.value.length),
)

// Reset to first page whenever the result set changes.
watch([search, statusFilter, frameworkFilter, ownerFilter, sortKey, sortDir], () => {
  page.value = 1
})
watch(pageCount, (count) => {
  if (page.value > count) page.value = count
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function ariaSort(key: SortKey) {
  if (sortKey.value !== key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

function resetFilters() {
  search.value = ''
  statusFilter.value = 'all'
  frameworkFilter.value = 'all'
  ownerFilter.value = 'all'
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}
</script>

<template>
  <section
    class="rounded-xl border border-border bg-card"
    aria-label="Controls"
  >
    <div class="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="relative w-full lg:max-w-xs">
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
          class="pl-9"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Select v-model="statusFilter">
          <SelectTrigger size="sm" class="w-[130px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="passing">Passing</SelectItem>
            <SelectItem value="attention">Attention</SelectItem>
            <SelectItem value="failing">Failing</SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="frameworkFilter">
          <SelectTrigger size="sm" class="w-[140px]" aria-label="Filter by framework">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All frameworks</SelectItem>
            <SelectItem v-for="id in FRAMEWORK_ORDER" :key="id" :value="id">
              {{ FRAMEWORKS[id].label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="ownerFilter">
          <SelectTrigger size="sm" class="w-[140px]" aria-label="Filter by owner">
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

    <div class="overflow-x-auto">
      <table class="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-border text-left align-middle">
            <th scope="col" class="px-4 py-2.5 font-medium text-muted-foreground" :aria-sort="ariaSort('code')">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @click="toggleSort('code')"
              >
                Control
                <PhArrowUp v-if="sortKey === 'code' && sortDir === 'asc'" :size="12" aria-hidden="true" />
                <PhArrowDown v-else-if="sortKey === 'code' && sortDir === 'desc'" :size="12" aria-hidden="true" />
              </button>
            </th>
            <th scope="col" class="px-4 py-2.5 font-medium text-muted-foreground">Frameworks</th>
            <th scope="col" class="px-4 py-2.5 font-medium text-muted-foreground">Owner</th>
            <th scope="col" class="px-4 py-2.5 font-medium text-muted-foreground">Status</th>
            <th scope="col" class="px-4 py-2.5 font-medium text-muted-foreground">Evidence</th>
            <th scope="col" class="px-4 py-2.5 font-medium text-muted-foreground" :aria-sort="ariaSort('nextReview')">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @click="toggleSort('nextReview')"
              >
                Next review
                <PhArrowUp v-if="sortKey === 'nextReview' && sortDir === 'asc'" :size="12" aria-hidden="true" />
                <PhArrowDown v-else-if="sortKey === 'nextReview' && sortDir === 'desc'" :size="12" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="control in paged"
            :key="control.code"
            class="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/50"
          >
            <td class="px-4 py-3">
              <div class="flex flex-col">
                <span class="font-mono text-xs text-muted-foreground">{{ control.code }}</span>
                <span class="font-medium text-foreground">{{ control.name }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="fw in control.frameworks"
                  :key="fw"
                  class="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {{ FRAMEWORKS[fw].label }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <Avatar class="size-6">
                  <AvatarFallback class="bg-secondary text-[0.625rem] font-medium text-secondary-foreground">
                    {{ control.owner.initials }}
                  </AvatarFallback>
                </Avatar>
                <span class="whitespace-nowrap text-foreground">{{ control.owner.name }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <ControlStatusBadge :status="control.status" />
            </td>
            <td class="px-4 py-3">
              <EvidenceIndicator :state="control.evidence" />
            </td>
            <td class="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
              {{ formatDate(control.nextReview) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="sorted.length === 0"
      class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
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

    <div
      v-else
      class="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-sm text-muted-foreground" aria-live="polite">
        Showing <span class="font-medium text-foreground">{{ rangeStart }}–{{ rangeEnd }}</span>
        of <span class="font-medium text-foreground">{{ sorted.length }}</span> controls
      </p>
      <div class="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          :disabled="page === 1"
          aria-label="Previous page"
          @click="page = Math.max(1, page - 1)"
        >
          <PhCaretLeft :size="15" aria-hidden="true" />
        </Button>
        <span class="px-2 text-sm tabular-nums text-muted-foreground">
          Page {{ page }} of {{ pageCount }}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          :disabled="page === pageCount"
          aria-label="Next page"
          @click="page = Math.min(pageCount, page + 1)"
        >
          <PhCaretRight :size="15" aria-hidden="true" />
        </Button>
      </div>
    </div>
  </section>
</template>
