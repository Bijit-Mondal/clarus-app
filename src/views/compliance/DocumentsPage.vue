<script setup lang="ts">
import { ref, computed } from 'vue'
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
  PhSliders,
  PhX,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Document representation
interface DocumentItem {
  id: string
  code: string
  title: string
  description: string
  category: 'policy' | 'procedure'
  version: string
  status: 'approved' | 'in-review' | 'draft'
  owner: string
  updatedAt: string
  controlsCount: number
  fileSize: string
}

// Initial mockup data
const initialDocuments: DocumentItem[] = [
  {
    id: 'doc-1',
    code: 'POL-01',
    title: 'Information Security Policy',
    description:
      'High-level security directives governing all organization compliance requirements.',
    category: 'policy',
    version: 'v2.4',
    status: 'approved',
    owner: 'Sarah Connor',
    updatedAt: '3 days ago',
    controlsCount: 8,
    fileSize: '2.4 MB',
  },
  {
    id: 'doc-2',
    code: 'SOP-01',
    title: 'Access Control Procedure',
    description:
      'Standard operating procedure for provisioning, reviewing, and deprovisioning user access.',
    category: 'procedure',
    version: 'v1.8',
    status: 'approved',
    owner: 'David Miller',
    updatedAt: '1 week ago',
    controlsCount: 5,
    fileSize: '1.2 MB',
  },
  {
    id: 'doc-3',
    code: 'POL-02',
    title: 'Incident Response Plan',
    description: 'Guidelines for identifying, containing, and communicating security incidents.',
    category: 'policy',
    version: 'v2.0',
    status: 'approved',
    owner: 'Sarah Connor',
    updatedAt: '2 weeks ago',
    controlsCount: 4,
    fileSize: '3.1 MB',
  },
  {
    id: 'doc-4',
    code: 'SOP-02',
    title: 'Data Classification & Retention Procedure',
    description: 'Instructions on handling, tagging, and retaining client and organizational data.',
    category: 'procedure',
    version: 'v1.2',
    status: 'in-review',
    owner: 'David Miller',
    updatedAt: 'Yesterday',
    controlsCount: 3,
    fileSize: '950 KB',
  },
  {
    id: 'doc-5',
    code: 'POL-03',
    title: 'Vulnerability Management Policy',
    description:
      'Requirements for regular vulnerability scans, penetration testing, and software patches.',
    category: 'policy',
    version: 'v1.0',
    status: 'draft',
    owner: 'Alex Rivera',
    updatedAt: 'Just now',
    controlsCount: 2,
    fileSize: '1.4 MB',
  },
]

const documents = ref<DocumentItem[]>(initialDocuments)

// Search & filter state
const searchQuery = ref('')
const activeCategory = ref<'all' | 'policy' | 'procedure'>('all')
const activeStatus = ref<'all' | 'approved' | 'in-review' | 'draft'>('all')

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
] as const

// Status options
const statusFilters = [
  { id: 'all', label: 'All statuses' },
  { id: 'approved', label: 'Approved' },
  { id: 'in-review', label: 'In review' },
  { id: 'draft', label: 'Draft' },
] as const

function resetFilters() {
  searchQuery.value = ''
  activeCategory.value = 'all'
  activeStatus.value = 'all'
}
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Button variant="outline" size="sm">
          <PhDownload :size="16" aria-hidden="true" />
          Export index
        </Button>
        <Button size="sm">
          <PhPlus :size="16" weight="bold" aria-hidden="true" />
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
        class="flex flex-col gap-4 border-b border-border p-4 md:flex-row md:items-center md:justify-between"
      >
        <!-- Category switcher -->
        <nav class="flex items-center gap-1.5" aria-label="Category navigation">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-all"
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
        <div class="flex flex-1 items-center justify-end gap-3 md:max-w-md">
          <div class="relative w-full">
            <PhMagnifyingGlass
              :size="16"
              class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              v-model="searchQuery"
              class="pl-9"
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

          <div class="flex items-center gap-1.5">
            <span
              class="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground"
              aria-hidden="true"
            >
              <PhSliders :size="16" />
            </span>
            <select
              v-model="activeStatus"
              class="h-9 rounded-md border border-border bg-background px-3 py-1 text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-success focus-visible:outline-hidden"
              aria-label="Filter by status"
            >
              <option v-for="status in statusFilters" :key="status.id" :value="status.id">
                {{ status.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Main Document List -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/30">
              <th
                class="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Document
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Status
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Owner
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Mapped Controls
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Updated
              </th>
              <th class="relative px-5 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="doc in filteredDocuments"
              :key="doc.id"
              class="group hover:bg-muted/30 transition-colors"
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
                        class="text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider"
                      >
                        {{ doc.version }}
                      </span>
                    </div>
                    <p
                      class="mt-1 font-medium text-foreground group-hover:text-success-emphasis transition-colors"
                    >
                      {{ doc.title }}
                    </p>
                    <p class="mt-0.5 text-xs text-muted-foreground line-clamp-1 max-w-lg">
                      {{ doc.description }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 whitespace-nowrap">
                <Badge
                  v-if="doc.status === 'approved'"
                  variant="outline"
                  class="gap-1 border-success/30 bg-success/10 text-success-emphasis"
                >
                  <PhCheckCircle :size="13" weight="fill" aria-hidden="true" />
                  Approved
                </Badge>
                <Badge
                  v-else-if="doc.status === 'in-review'"
                  variant="outline"
                  class="gap-1 border-warning/30 bg-warning/10 text-warning-emphasis"
                >
                  <PhClock :size="13" weight="fill" aria-hidden="true" />
                  In review
                </Badge>
                <Badge v-else variant="secondary" class="gap-1 text-muted-foreground">
                  <PhNoteBlank :size="13" aria-hidden="true" />
                  Draft
                </Badge>
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
              <td class="px-5 py-4 whitespace-nowrap text-right">
                <div
                  class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Button variant="ghost" size="icon" class="size-8" aria-label="Download document">
                    <PhDownload :size="15" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8" aria-label="View details">
                    <PhArrowUpRight :size="15" />
                  </Button>
                </div>
              </td>
            </tr>

            <!-- Empty filter state -->
            <tr v-if="filteredDocuments.length === 0">
              <td colspan="6" class="px-5 py-12 text-center">
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
                  <Button variant="outline" size="sm" class="mt-2" @click="resetFilters">
                    Clear all filters
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
