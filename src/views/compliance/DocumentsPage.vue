<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhFileText,
  PhPlus,
  PhMagnifyingGlass,
  PhCheckCircle,
  PhClock,
  PhNoteBlank,
  PhDownload,
  PhArrowUpRight,
  PhX,
  PhCaretLeft,
  PhCaretRight,
  PhShield,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  useDocuments,
  useDocumentsQuery,
  mapTenantDocumentToItem,
  type DocumentItem,
} from '@/composables/useDocuments'
import { useTenantUsersQuery } from '@/composables/useTenants'

const route = useRoute()
const router = useRouter()
const orgSlug = computed(() => (route.params.organizationSlug as string) || '')

const { documents, createDocument } = useDocuments()
const { data: tenantUsersData } = useTenantUsersQuery()
const tenantUsers = computed(() => tenantUsersData.value?.users ?? [])

// Search & filter state
const searchQuery = ref('')
const activeCategory = ref<'all' | 'policy' | 'procedure' | 'sop'>('all')
const activeStatus = ref<string>('all')

// Pagination parameters
const PAGE_SIZE = 8
const page = ref(1)

// Query params for the active paginated view
const queryParams = computed(() => ({
  limit: PAGE_SIZE,
  offset: (page.value - 1) * PAGE_SIZE,
  documentType: activeCategory.value !== 'all' ? activeCategory.value : undefined,
}))

const { data: documentsData, isPending: isListLoading } = useDocumentsQuery(queryParams)

// Fetch all documents for global statistics and local search fallback
const { data: allDocumentsData, isPending: isStatsLoading } = useDocumentsQuery(
  computed(() => ({
    limit: 1000,
  })),
)

const isLoading = computed(() => isListLoading.value || (searchQuery.value && isStatsLoading.value))

// Convert documents to UI items
const paginatedList = computed(() => {
  return (documentsData.value?.documents || []).map(mapTenantDocumentToItem)
})

const allList = computed(() => {
  return (allDocumentsData.value?.documents || []).map(mapTenantDocumentToItem)
})

// Filtered list based on search/filters
const filteredAllList = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return allList.value.filter((doc) => {
    const matchesSearch =
      !query ||
      doc.title.toLowerCase().includes(query) ||
      doc.documentKey.toLowerCase().includes(query)

    const matchesCategory = activeCategory.value === 'all' || doc.category === activeCategory.value

    const matchesStatus = activeStatus.value === 'all' || doc.status === activeStatus.value

    return matchesSearch && matchesCategory && matchesStatus
  })
})

// The final documents to display on the current page
const pagedDocuments = computed(() => {
  // If searching or filtering by status (which is also local), use the locally filtered and paged list
  if (searchQuery.value || activeStatus.value !== 'all') {
    const start = (page.value - 1) * PAGE_SIZE
    return filteredAllList.value.slice(start, start + PAGE_SIZE)
  }
  // Otherwise, use the clean server-side paginated list directly
  return paginatedList.value
})

// The total count to base pagination on
const totalCountForPagination = computed(() => {
  if (searchQuery.value || activeStatus.value !== 'all') {
    return filteredAllList.value.length
  }
  return documentsData.value?.total || 0
})

const pageCount = computed(() => Math.max(1, Math.ceil(totalCountForPagination.value / PAGE_SIZE)))

// Reset page to 1 when filters change
watch([searchQuery, activeCategory, activeStatus], () => {
  page.value = 1
})

const rangeStart = computed(() => {
  return totalCountForPagination.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1
})

const rangeEnd = computed(() => {
  return Math.min(page.value * PAGE_SIZE, totalCountForPagination.value)
})

// Statistics computed properties
const totalCount = computed(() => allDocumentsData.value?.total ?? allList.value.length)
const approvedCount = computed(() => allList.value.filter((d) => d.status === 'approved').length)
const inReviewCount = computed(() => allList.value.filter((d) => d.status === 'in-review').length)
const draftCount = computed(() => allList.value.filter((d) => d.status === 'draft').length)

// Categories tabs
const categories = [
  { id: 'all', label: 'All documents' },
  { id: 'policy', label: 'Policies' },
  { id: 'procedure', label: 'Procedures' },
  { id: 'sop', label: 'SOPs' },
] as const

// Status options
const statusFilters = [
  { id: 'all', label: 'All statuses' },
  { id: 'approved', label: 'Approved' },
  { id: 'in-review', label: 'In review' },
  { id: 'draft', label: 'Draft' },
] as const

const documentStatusConfig = {
  approved: {
    label: 'Approved',
    icon: PhCheckCircle,
    base: 'var(--success-emphasis)',
    iconWeight: 'fill' as const,
  },
  'in-review': {
    label: 'In review',
    icon: PhClock,
    base: 'var(--warning-emphasis)',
    iconWeight: 'fill' as const,
  },
  draft: {
    label: 'Draft',
    icon: PhNoteBlank,
    base: 'var(--muted-foreground)',
    iconWeight: 'regular' as const,
  },
} as const

const documentTypeConfig = {
  policy: {
    label: 'Policy',
    base: 'var(--info)',
  },
  procedure: {
    label: 'Procedure',
    base: 'var(--warning-emphasis)',
  },
  sop: {
    label: 'SOP',
    base: 'var(--chart-5)',
  },
} as const

const classificationConfig = {
  Public: {
    label: 'Public',
    base: 'var(--success-emphasis)',
  },
  Internal: {
    label: 'Internal',
    base: 'var(--info)',
  },
  Confidential: {
    label: 'Confidential',
    base: 'var(--warning-emphasis)',
  },
  Restricted: {
    label: 'Restricted',
    base: 'var(--destructive)',
  },
} as const

function resetFilters() {
  searchQuery.value = ''
  activeCategory.value = 'all'
  activeStatus.value = 'all'
}

function goToDetail(doc: DocumentItem) {
  void router.push({
    name: 'compliance-document-detail',
    params: {
      organizationSlug: orgSlug.value,
      documentId: doc.id,
    },
  })
}

function exportIndex() {
  alert('Exporting document index...')
}

// Add Document Dialog state
const isAddDialogOpen = ref(false)
const newDocTitle = ref('')
const newDocCategory = ref<'policy' | 'procedure' | 'sop'>('policy')
const newDocClassification = ref<'Public' | 'Internal' | 'Confidential' | 'Restricted'>('Internal')
const newDocOwnerId = ref('')
const newDocDescription = ref('')

function openAddDialog() {
  newDocTitle.value = ''
  newDocCategory.value = 'policy'
  newDocClassification.value = 'Internal'
  newDocOwnerId.value = ''
  newDocDescription.value = ''
  isAddDialogOpen.value = true
}

function handleCreateDocument() {
  if (!newDocTitle.value.trim()) return

  // Generate code prefix based on category
  const prefix = newDocCategory.value.toUpperCase()
  const codeNum = documents.value.filter((d) => d.category === newDocCategory.value).length + 1
  const code = `${prefix}-${String(codeNum).padStart(2, '0')}`

  const selectedOwner = tenantUsers.value.find((user) => user.$id === newDocOwnerId.value)

  const newDoc = createDocument({
    code,
    documentKey: newDocTitle.value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, ''),
    title: newDocTitle.value,
    category: newDocCategory.value,
    classification: newDocClassification.value,
    owner: selectedOwner?.name ?? '',
    description: newDocDescription.value || newDocTitle.value,
    content: '',
    approvers: [],
  })

  isAddDialogOpen.value = false

  // Navigate to the newly created document details
  void router.push({
    name: 'compliance-document-detail',
    params: {
      organizationSlug: orgSlug.value,
      documentId: newDoc.id,
    },
  })
}
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 font-semibold text-xs"
          @click="exportIndex"
        >
          <PhDownload :size="15" aria-hidden="true" />
          Export index
        </Button>
        <Button
          size="sm"
          class="gap-1.5 font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          @click="openAddDialog"
        >
          <PhPlus :size="15" weight="bold" aria-hidden="true" />
          Add document
        </Button>
      </template>
    </PageHeader>

    <!-- Stats Panel -->
    <section class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Document statistics">
      <div
        v-for="stat in [
          { label: 'Total index', value: totalCount, description: 'Registered documents' },
          { label: 'Approved', value: approvedCount, description: 'Published versions' },
          { label: 'In review', value: inReviewCount, description: 'Awaiting sign-off' },
          { label: 'Drafts', value: draftCount, description: 'Unpublished versions' },
        ]"
        :key="stat.label"
        class="rounded-lg border border-border bg-card p-4"
      >
        <p class="text-xs font-medium text-muted-foreground">{{ stat.label }}</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {{ isStatsLoading && stat.label === 'Total index' ? '—' : stat.value }}
        </p>
        <p class="mt-0.5 text-xs text-muted-foreground">{{ stat.description }}</p>
      </div>
    </section>

    <!-- Filter & Table Container -->
    <div class="rounded-lg border border-border bg-card">
      <!-- Toolbar -->
      <div
        class="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <!-- Category switcher -->
        <nav class="flex items-center gap-1.5" aria-label="Category navigation">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            :class="
              activeCategory === cat.id
                ? 'bg-secondary text-secondary-foreground shadow-2xs'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            "
            @click="activeCategory = cat.id"
          >
            {{ cat.label }}
          </button>
        </nav>

        <!-- Search & Custom Filters -->
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end flex-1 sm:max-w-md"
        >
          <div class="relative w-full">
            <PhMagnifyingGlass
              :size="16"
              class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              v-model="searchQuery"
              class="pl-9 bg-background"
              placeholder="Search title or document key..."
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

          <Select v-model="activeStatus">
            <SelectTrigger
              size="sm"
              class="w-full sm:w-[140px] bg-background border-border shrink-0"
              aria-label="Filter by status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="status in statusFilters" :key="status.id" :value="status.id">
                {{ status.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <!-- Main Document List -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-border bg-muted/20 text-xs text-muted-foreground font-medium"
            >
              <th class="px-5 py-3 w-[38%]">Document</th>
              <th class="px-5 py-3 w-[12%]">Type</th>
              <th class="px-5 py-3 w-[14%]">Version status</th>
              <th class="px-5 py-3 w-[14%]">Classification</th>
              <th class="px-5 py-3 w-[12%]">Updated</th>
              <th class="relative px-5 py-3 w-[10%]"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="doc in pagedDocuments"
              :key="doc.id"
              class="group border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30 cursor-pointer focus-visible:bg-muted/30 focus-visible:outline-hidden"
              tabindex="0"
              role="button"
              :aria-label="`Open details for document: ${doc.title}`"
              @click="goToDetail(doc)"
              @keydown.enter="goToDetail(doc)"
              @keydown.space.prevent="goToDetail(doc)"
            >
              <td class="px-5 py-4">
                <div class="flex items-start gap-3">
                  <div
                    class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
                    aria-hidden="true"
                  >
                    <PhFileText :size="16" />
                  </div>
                  <div>
                    <div class="inline-flex items-center gap-2">
                      <span
                        class="font-medium text-foreground group-hover:text-primary transition-colors"
                      >
                        {{ doc.title }}
                      </span>
                      <span
                        class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground tracking-wide shrink-0"
                      >
                        {{ doc.version }}
                      </span>
                    </div>
                    <p
                      class="mt-1 font-mono text-[11px] text-muted-foreground line-clamp-1 max-w-lg"
                    >
                      {{ doc.documentKey }}
                    </p>
                  </div>
                </div>
              </td>
              <!-- Type -->
              <td class="px-5 py-4 whitespace-nowrap" @click.stop>
                <span
                  class="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border leading-none capitalize"
                  :style="{
                    backgroundColor: `color-mix(in oklab, ${documentTypeConfig[doc.category]?.base || 'var(--muted-foreground)'} 12%, transparent)`,
                    color: documentTypeConfig[doc.category]?.base || 'var(--muted-foreground)',
                    borderColor: `color-mix(in oklab, ${documentTypeConfig[doc.category]?.base || 'var(--muted-foreground)'} 20%, transparent)`,
                  }"
                >
                  {{ documentTypeConfig[doc.category]?.label || doc.category }}
                </span>
              </td>
              <!-- Version status -->
              <td class="px-5 py-4 whitespace-nowrap" @click.stop>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :style="{
                    backgroundColor: `color-mix(in oklab, ${documentStatusConfig[doc.status].base} 15%, transparent)`,
                    color: documentStatusConfig[doc.status].base,
                  }"
                >
                  <component
                    :is="documentStatusConfig[doc.status].icon"
                    :size="13"
                    :weight="documentStatusConfig[doc.status].iconWeight"
                    aria-hidden="true"
                  />
                  {{ documentStatusConfig[doc.status].label }}
                </span>
              </td>
              <!-- Classification -->
              <td class="px-5 py-4 whitespace-nowrap" @click.stop>
                <span
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border leading-none"
                  :style="{
                    backgroundColor: `color-mix(in oklab, ${classificationConfig[doc.classification]?.base || 'var(--muted-foreground)'} 12%, transparent)`,
                    color: classificationConfig[doc.classification]?.base || 'var(--muted-foreground)',
                    borderColor: `color-mix(in oklab, ${classificationConfig[doc.classification]?.base || 'var(--muted-foreground)'} 20%, transparent)`,
                  }"
                >
                  <PhShield :size="12" aria-hidden="true" />
                  {{ classificationConfig[doc.classification]?.label || doc.classification }}
                </span>
              </td>
              <td class="px-5 py-4 whitespace-nowrap text-muted-foreground">
                {{ doc.updatedAt }}
              </td>
              <td class="px-5 py-4 whitespace-nowrap text-right" @click.stop>
                <div
                  class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8 text-muted-foreground hover:text-foreground"
                    aria-label="View details"
                    @click.stop="goToDetail(doc)"
                  >
                    <PhArrowUpRight :size="15" />
                  </Button>
                </div>
              </td>
            </tr>

            <!-- Loading state -->
            <tr v-if="isLoading && pagedDocuments.length === 0">
              <td colspan="6" class="p-0">
                <ClarusLoadingState
                  variant="table-rows"
                  :rows="PAGE_SIZE"
                  label="Loading documents"
                />
              </td>
            </tr>

            <!-- Empty filter state -->
            <tr v-else-if="!isLoading && totalCountForPagination === 0">
              <td colspan="6" class="px-5 py-16 text-center">
                <div class="flex flex-col items-center justify-center gap-3">
                  <span
                    class="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  >
                    <PhFileText :size="20" />
                  </span>
                  <div class="max-w-xs">
                    <p class="text-sm font-medium text-foreground">No documents found</p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      Try updating your search query or adjusting your filters.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    class="mt-2 text-xs font-semibold"
                    @click="resetFilters"
                  >
                    Clear all filters
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="totalCountForPagination > 0"
        class="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/10"
      >
        <p class="text-xs text-muted-foreground">
          Showing
          <span class="font-medium text-foreground">{{ rangeStart }}–{{ rangeEnd }}</span> of
          <span class="font-medium text-foreground">{{ totalCountForPagination }}</span> documents
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

    <!-- Add Document Dialog -->
    <Dialog :open="isAddDialogOpen" @update:open="isAddDialogOpen = $event">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
          <DialogDescription>
            Create a new compliance document (Policy, Procedure, or SOP) for your organization.
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="title">Title</Label>
            <Input id="title" v-model="newDocTitle" placeholder="e.g. Encryption Policy" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="category">Category</Label>
              <Select v-model="newDocCategory">
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="sop">SOP (Standard Operating Procedure)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-2">
              <Label for="classification">Classification</Label>
              <Select v-model="newDocClassification">
                <SelectTrigger id="classification">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="Confidential">Confidential</SelectItem>
                  <SelectItem value="Restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid gap-2">
            <Label for="owner">Owner</Label>
            <Select v-model="newDocOwnerId">
              <SelectTrigger id="owner">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="user in tenantUsers" :key="user.$id" :value="user.$id">
                  {{ user.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-2">
            <Label for="description">Description</Label>
            <Textarea
              id="description"
              v-model="newDocDescription"
              placeholder="Provide a brief summary of this document's purpose..."
              class="h-20"
            />
          </div>
        </div>

        <DialogFooter class="pt-4 border-t border-border">
          <Button variant="outline" size="sm" @click="isAddDialogOpen = false">Cancel</Button>
          <Button
            size="sm"
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            :disabled="!newDocTitle.trim()"
            @click="handleCreateDocument"
          >
            Create Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
