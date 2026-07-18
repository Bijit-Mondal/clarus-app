<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhFileText,
  PhPlus,
  PhMagnifyingGlass,
  PhCheckCircle,
  PhClock,
  PhNoteBlank,
  PhUser,
  PhLink,
  PhDownload,
  PhArrowUpRight,
  PhX,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
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
import { useDocuments, type DocumentItem } from '@/composables/useDocuments'

const route = useRoute()
const router = useRouter()
const orgSlug = computed(() => (route.params.organizationSlug as string) || '')

const { documents, createDocument } = useDocuments()

// Search & filter state
const searchQuery = ref('')
const activeCategory = ref<'all' | 'policy' | 'procedure' | 'sop'>('all')
const activeStatus = ref<string>('all')

const filteredDocuments = computed(() => {
  return documents.value.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      doc.code.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesCategory = activeCategory.value === 'all' || doc.category === activeCategory.value
    const matchesStatus = activeStatus.value === 'all' || doc.status === activeStatus.value

    return matchesSearch && matchesCategory && matchesStatus
  })
})

// Statistics computed properties
const totalCount = computed(() => documents.value.length)
const approvedCount = computed(() => documents.value.filter((d) => d.status === 'approved').length)
const inReviewCount = computed(() => documents.value.filter((d) => d.status === 'in-review').length)
const draftCount = computed(() => documents.value.filter((d) => d.status === 'draft').length)

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

function downloadDocument(doc: DocumentItem) {
  alert(`Downloading ${doc.title} (${doc.fileSize})...`)
}

function exportIndex() {
  alert('Exporting document index...')
}

// Add Document Dialog state
const isAddDialogOpen = ref(false)
const newDocTitle = ref('')
const newDocCategory = ref<'policy' | 'procedure' | 'sop'>('policy')
const newDocClassification = ref<'Public' | 'Internal' | 'Confidential' | 'Restricted'>('Internal')
const newDocOwner = ref('Virat Kohli')
const newDocDescription = ref('')

function openAddDialog() {
  newDocTitle.value = ''
  newDocCategory.value = 'policy'
  newDocClassification.value = 'Internal'
  newDocOwner.value = 'Virat Kohli'
  newDocDescription.value = ''
  isAddDialogOpen.value = true
}

function handleCreateDocument() {
  if (!newDocTitle.value.trim()) return

  // Generate code prefix based on category
  const prefix = newDocCategory.value.toUpperCase()
  const codeNum = documents.value.filter((d) => d.category === newDocCategory.value).length + 1
  const code = `${prefix}-${String(codeNum).padStart(2, '0')}`

  const newDoc = createDocument({
    code,
    title: newDocTitle.value,
    category: newDocCategory.value,
    classification: newDocClassification.value,
    owner: newDocOwner.value,
    description: newDocDescription.value || `Document policy outline for ${newDocTitle.value}`,
    content: `<h1>${newDocTitle.value}</h1><p>Start writing the content for ${newDocTitle.value} here...</p>`,
    approvers: [newDocOwner.value],
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
          { label: 'Total index', value: totalCount, description: 'Active documents' },
          { label: 'Approved', value: approvedCount, description: 'Published and active' },
          { label: 'In review', value: inReviewCount, description: 'Pending revisions' },
          { label: 'Drafts', value: draftCount, description: 'Work in progress' },
        ]"
        :key="stat.label"
        class="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
      >
        <p class="text-xs font-medium text-muted-foreground">{{ stat.label }}</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-foreground">{{ stat.value }}</p>
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
              placeholder="Search code, title or description..."
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
              <th class="px-5 py-3 w-[40%]">Document</th>
              <th class="px-5 py-3 w-[15%]">Status</th>
              <th class="px-5 py-3 w-[15%]">Owner</th>
              <th class="px-5 py-3 w-[15%]">Mapped Controls</th>
              <th class="px-5 py-3 w-[15%]">Updated</th>
              <th class="relative px-5 py-3 w-[10%]"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="doc in filteredDocuments"
              :key="doc.id"
              class="group border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30 cursor-pointer focus-visible:bg-muted/30 focus-visible:outline-hidden"
              tabindex="0"
              role="button"
              :aria-label="`Open details for document ${doc.code}: ${doc.title}`"
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
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs text-muted-foreground">{{ doc.code }}</span>
                      <span
                        class="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground tracking-wide"
                      >
                        {{ doc.version }}
                      </span>
                    </div>
                    <span
                      class="block mt-1 font-medium text-foreground group-hover:text-primary transition-colors"
                    >
                      {{ doc.title }}
                    </span>
                    <p class="mt-0.5 text-xs text-muted-foreground line-clamp-1 max-w-lg">
                      {{ doc.description }}
                    </p>
                  </div>
                </div>
              </td>
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
              <td class="px-5 py-4 whitespace-nowrap">
                <div class="flex items-center gap-1.5 text-foreground">
                  <PhUser :size="14" class="text-muted-foreground" aria-hidden="true" />
                  <span>{{ doc.owner }}</span>
                </div>
              </td>
              <td class="px-5 py-4 whitespace-nowrap">
                <div class="flex items-center gap-1 text-xs">
                  <PhLink :size="13" class="text-muted-foreground" aria-hidden="true" />
                  <span class="font-semibold text-foreground">{{ doc.controlsCount }}</span>
                  <span class="text-muted-foreground">controls linked</span>
                </div>
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
                    aria-label="Download document"
                    @click.stop="downloadDocument(doc)"
                  >
                    <PhDownload :size="15" />
                  </Button>
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

            <!-- Empty filter state -->
            <tr v-if="filteredDocuments.length === 0">
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
            <Input id="owner" v-model="newDocOwner" placeholder="e.g. Jane Doe" />
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
