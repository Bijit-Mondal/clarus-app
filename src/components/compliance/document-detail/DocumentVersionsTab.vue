<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PhArrowCounterClockwise,
  PhCircleNotch,
  PhClock,
  PhEye,
  PhWarningCircle,
  PhArrowLeft,
  PhArrowRight,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import DocumentEditor from '@/components/compliance/DocumentEditor.vue'
import {
  useDocumentVersionsQuery,
  useDocumentVersionQuery,
  normalizeVersionStatus,
  formatTimeAgo,
  documentKeys,
} from '@/composables/useDocuments'
import { getDocumentVersion } from '@/api/documents'
import { getDocumentStatusConfig } from '@/lib/documentDisplay'
import { useAuth } from '@/composables/useAuth'
import { useOrganizationStore } from '@/stores/organization'
import { useQueryClient } from '@tanstack/vue-query'
import type { DocumentVersionItem } from '@/api/documents'

const props = defineProps<{
  documentId: string
}>()

const emit = defineEmits<{
  restore: [content: string, versionLabel: string]
}>()

const { accountQuery } = useAuth()
const currentUserEmail = computed(() => accountQuery.data.value?.email ?? '')
const organizationStore = useOrganizationStore()
const queryClient = useQueryClient()

const currentPage = ref(1)
const itemsPerPage = ref(10)
const offset = computed(() => (currentPage.value - 1) * itemsPerPage.value)

const {
  data: versionsResponse,
  isPending,
  isError,
  isFetching,
  refetch: refetchVersions,
} = useDocumentVersionsQuery(
  computed(() => props.documentId),
  computed(() => ({
    limit: itemsPerPage.value,
    offset: offset.value,
  })),
)

const versionsList = computed(() => versionsResponse.value?.documentVersions ?? [])
const totalVersions = computed(() => versionsResponse.value?.total ?? 0)
const totalPages = computed(() => Math.ceil(totalVersions.value / itemsPerPage.value))

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = new Set<number>([1, total, current])
  for (let delta = 1; delta <= 1; delta++) {
    if (current - delta > 1) pages.add(current - delta)
    if (current + delta < total) pages.add(current + delta)
  }

  return [...pages].sort((a, b) => a - b)
})

const viewingVersion = ref<DocumentVersionItem | null>(null)
const viewingVersionId = computed(() => viewingVersion.value?.$id ?? null)
const isPreviewOpen = computed({
  get: () => viewingVersion.value !== null,
  set: (open: boolean) => {
    if (!open) viewingVersion.value = null
  },
})

const {
  data: versionDetail,
  isPending: isVersionDetailLoading,
  isError: isVersionDetailError,
  isFetching: isVersionDetailFetching,
  refetch: refetchVersionDetail,
} = useDocumentVersionQuery(
  computed(() => props.documentId),
  viewingVersionId,
)

const previewContent = computed(() => versionDetail.value?.content?.trim() ?? '')
const previewTitle = computed(
  () => versionDetail.value?.title || viewingVersion.value?.title || 'Untitled document',
)
const previewVersionLabel = computed(() => {
  if (versionDetail.value) {
    return `v${versionDetail.value.major}.${versionDetail.value.minor}`
  }
  if (viewingVersion.value) return versionLabel(viewingVersion.value)
  return ''
})

const isPreviewLoading = computed(
  () =>
    !!viewingVersionId.value &&
    (isVersionDetailLoading.value || (isVersionDetailFetching.value && !versionDetail.value)),
)

const restoringVersionId = ref<string | null>(null)
const isRestoring = computed(() => restoringVersionId.value !== null)

function versionLabel(v: DocumentVersionItem) {
  return `v${v.major}.${v.minor}`
}

function isCurrentVersion(index: number) {
  return offset.value === 0 && index === 0
}

function getStatusConfig(status: string) {
  return getDocumentStatusConfig(normalizeVersionStatus(status))
}

function versionTimestamp(version: DocumentVersionItem) {
  return version.publishedAt || version.$updatedAt || version.$createdAt
}

function formatRelativeTime(dateString: string) {
  return formatTimeAgo(dateString)
}

function formatFullDateTime(dateString: string) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function openPreview(version: DocumentVersionItem) {
  viewingVersion.value = version
}

async function fetchVersionContent(version: DocumentVersionItem) {
  const tenantId = organizationStore.activeOrganization?.id
  if (!tenantId) return null

  const detail = await queryClient.fetchQuery({
    queryKey: documentKeys.versionDetail(tenantId, props.documentId, version.$id),
    queryFn: () => getDocumentVersion(tenantId, props.documentId, version.$id),
    staleTime: 300_000,
  })

  const content = detail.content?.trim()
  return content ? content : null
}

async function handleRestore(version: DocumentVersionItem) {
  if (isRestoring.value) return
  restoringVersionId.value = version.$id
  try {
    const content = await fetchVersionContent(version)
    if (!content) {
      // Surface empty/error state in the preview instead of failing silently.
      viewingVersion.value = version
      return
    }
    emit('restore', content, versionLabel(version))
    viewingVersion.value = null
  } catch {
    viewingVersion.value = version
  } finally {
    restoringVersionId.value = null
  }
}

async function handleRestoreFromPreview() {
  if (!viewingVersion.value || !previewContent.value || isRestoring.value) return
  restoringVersionId.value = viewingVersion.value.$id
  try {
    emit('restore', previewContent.value, versionLabel(viewingVersion.value))
    viewingVersion.value = null
  } finally {
    restoringVersionId.value = null
  }
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-foreground text-balance">Version history</h2>
        <p class="mt-0.5 text-xs text-muted-foreground text-pretty">
          Browse past revisions, preview a version, or restore content into the current draft.
        </p>
      </div>
      <span
        v-if="!isPending && !isError"
        class="shrink-0 tabular-nums text-xs text-muted-foreground"
        aria-live="polite"
      >
        {{ totalVersions }} {{ totalVersions === 1 ? 'version' : 'versions' }}
      </span>
    </div>

    <div
      v-if="isPending"
      class="divide-y divide-border/60"
      role="status"
      aria-label="Loading version history"
    >
      <div v-for="i in 3" :key="i" class="animate-pulse space-y-2.5 px-4 py-3.5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <div class="h-5 w-10 rounded bg-muted" />
            <div class="h-5 w-16 rounded-full bg-muted" />
            <div class="h-5 w-14 rounded-full bg-muted" />
          </div>
          <div class="flex items-center gap-2">
            <div class="h-3.5 w-14 rounded bg-muted" />
            <div class="h-8 w-16 rounded-md bg-muted" />
            <div class="h-8 w-20 rounded-md bg-muted" />
          </div>
        </div>
        <div class="h-3.5 w-2/3 rounded bg-muted" />
        <div class="h-3 w-1/2 rounded bg-muted" />
      </div>
      <span class="sr-only">Loading version history…</span>
    </div>

    <div
      v-else-if="isError"
      class="flex flex-col items-center justify-center px-4 py-12 text-center"
      role="alert"
    >
      <span
        class="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        aria-hidden="true"
      >
        <PhWarningCircle :size="20" />
      </span>
      <p class="text-sm font-medium text-foreground">Couldn’t load versions</p>
      <p class="mt-1 max-w-[280px] text-xs text-muted-foreground text-pretty">
        Something went wrong fetching version history. Try again.
      </p>
      <Button
        variant="outline"
        size="sm"
        class="mt-4 gap-1.5"
        :disabled="isFetching"
        @click="refetchVersions()"
      >
        <PhCircleNotch v-if="isFetching" :size="14" class="animate-spin" aria-hidden="true" />
        {{ isFetching ? 'Retrying…' : 'Try again' }}
      </Button>
    </div>

    <div
      v-else-if="!versionsList.length"
      class="flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <span
        class="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <PhClock :size="20" />
      </span>
      <p class="text-sm font-medium text-foreground">No versions yet</p>
      <p class="mt-1 max-w-[280px] text-xs text-muted-foreground text-pretty">
        Versions appear here when this document is published or sent for review.
      </p>
    </div>

    <template v-else>
      <ul class="divide-y divide-border/60">
        <li
          v-for="(v, index) in versionsList"
          :key="v.$id"
          class="flex flex-col gap-2 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/10"
          :class="{ 'bg-muted/15': isCurrentVersion(index) }"
        >
          <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <span class="font-mono text-sm font-semibold tabular-nums text-foreground">
                {{ versionLabel(v) }}
              </span>
              <Badge
                v-if="isCurrentVersion(index)"
                variant="outline"
                class="rounded-full border-primary/30 bg-primary/10 px-2 py-0 text-[10px] font-semibold text-primary"
              >
                Current
              </Badge>
              <Badge
                variant="outline"
                :class="[
                  'gap-1 rounded-full px-2 py-0 text-[10px] font-semibold',
                  getStatusConfig(v.status).class,
                ]"
              >
                <component
                  :is="getStatusConfig(v.status).icon"
                  :size="10"
                  weight="fill"
                  aria-hidden="true"
                />
                {{ getStatusConfig(v.status).label }}
              </Badge>
            </div>

            <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <time
                class="text-xs tabular-nums text-muted-foreground"
                :datetime="versionTimestamp(v)"
                :title="formatFullDateTime(versionTimestamp(v))"
              >
                {{ formatRelativeTime(versionTimestamp(v)) }}
              </time>
              <Button
                variant="outline"
                size="sm"
                class="h-8 gap-1.5 px-2.5 text-xs"
                @click="openPreview(v)"
              >
                <PhEye :size="13" aria-hidden="true" />
                View
              </Button>
              <Button
                v-if="!isCurrentVersion(index)"
                variant="outline"
                size="sm"
                class="h-8 gap-1.5 px-2.5 text-xs"
                :disabled="isRestoring"
                :aria-busy="restoringVersionId === v.$id"
                @click="handleRestore(v)"
              >
                <PhCircleNotch
                  v-if="restoringVersionId === v.$id"
                  :size="13"
                  class="animate-spin"
                  aria-hidden="true"
                />
                <PhArrowCounterClockwise v-else :size="13" aria-hidden="true" />
                {{ restoringVersionId === v.$id ? 'Restoring…' : 'Restore' }}
              </Button>
            </div>
          </div>

          <p class="truncate text-sm font-medium text-foreground">
            {{ v.title || 'Untitled document' }}
          </p>

          <p
            v-if="v.changeLog"
            class="max-w-prose text-sm leading-relaxed text-foreground/90 text-pretty whitespace-pre-wrap"
          >
            {{ v.changeLog }}
          </p>
          <p v-else class="text-xs text-muted-foreground">No changelog for this version.</p>
        </li>
      </ul>

      <nav
        v-if="totalVersions > itemsPerPage"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
        aria-label="Version history pagination"
      >
        <span class="text-xs text-muted-foreground">
          Showing
          <span class="font-medium tabular-nums text-foreground">{{ offset + 1 }}</span>
          –
          <span class="font-medium tabular-nums text-foreground">{{
            Math.min(offset + itemsPerPage, totalVersions)
          }}</span>
          of
          <span class="font-medium tabular-nums text-foreground">{{ totalVersions }}</span>
        </span>

        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            <span class="sr-only">Previous page</span>
            <PhArrowLeft :size="14" aria-hidden="true" />
          </Button>

          <template v-for="(page, pageIndex) in visiblePages" :key="page">
            <span
              v-if="pageIndex > 0 && page - visiblePages[pageIndex - 1]! > 1"
              class="px-1 font-mono text-xs text-muted-foreground"
              aria-hidden="true"
            >
              …
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              class="font-mono text-xs"
              :class="{
                'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground':
                  currentPage === page,
              }"
              :aria-label="`Page ${page}`"
              :aria-current="currentPage === page ? 'page' : undefined"
              @click="goToPage(page)"
            >
              {{ page }}
            </Button>
          </template>

          <Button
            variant="outline"
            size="icon-sm"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            <span class="sr-only">Next page</span>
            <PhArrowRight :size="14" aria-hidden="true" />
          </Button>
        </div>
      </nav>
    </template>
  </div>

  <Dialog v-model:open="isPreviewOpen">
    <DialogContent
      class="flex max-h-[min(90vh,880px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
    >
      <DialogHeader class="shrink-0 space-y-1 border-b border-border px-6 py-4 pr-12 text-left">
        <DialogTitle class="text-balance">{{ previewTitle }}</DialogTitle>
        <DialogDescription class="font-mono text-xs tabular-nums">
          {{ previewVersionLabel }}
          <span class="text-muted-foreground"> · Read-only preview</span>
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-4 py-4 md:px-6">
        <ClarusLoadingState
          v-if="isPreviewLoading"
          variant="compact"
          label="Loading version…"
          class="py-16"
        />

        <div
          v-else-if="isVersionDetailError"
          class="mx-auto flex max-w-md flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-12 text-center"
          role="alert"
        >
          <PhWarningCircle :size="22" class="text-destructive" aria-hidden="true" />
          <p class="mt-3 text-sm font-medium text-foreground">Couldn’t load this version</p>
          <p class="mt-1 text-xs text-muted-foreground text-pretty">
            Check your connection and try loading the preview again.
          </p>
          <Button
            variant="outline"
            size="sm"
            class="mt-4 gap-1.5"
            :disabled="isVersionDetailFetching"
            @click="refetchVersionDetail()"
          >
            <PhCircleNotch
              v-if="isVersionDetailFetching"
              :size="14"
              class="animate-spin"
              aria-hidden="true"
            />
            {{ isVersionDetailFetching ? 'Retrying…' : 'Try again' }}
          </Button>
        </div>

        <div
          v-else-if="!previewContent"
          class="mx-auto flex max-w-md flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center"
        >
          <PhClock :size="22" class="text-muted-foreground" aria-hidden="true" />
          <p class="mt-3 text-sm font-medium text-foreground">This version has no content</p>
          <p class="mt-1 text-xs text-muted-foreground text-pretty">
            There is nothing to preview or restore from this revision.
          </p>
        </div>

        <DocumentEditor
          v-else
          :key="`${viewingVersionId}-${previewContent.length}`"
          :model-value="previewContent"
          :editable="false"
          :preview-only="true"
          :title="previewTitle"
          :version="previewVersionLabel"
          :download-user-email="currentUserEmail"
          :download-filename="`${previewTitle.replace(/[^a-z0-9]/gi, '_')}_${previewVersionLabel}.pdf`"
        />
      </div>

      <DialogFooter
        class="shrink-0 gap-2 border-t border-border bg-card px-6 py-3 sm:justify-between"
      >
        <p class="text-xs text-muted-foreground text-pretty sm:max-w-[55%]">
          Restore copies this version into the current draft. It does not change published history.
        </p>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" @click="isPreviewOpen = false">Close</Button>
          <Button
            :disabled="!previewContent || isRestoring"
            :aria-busy="isRestoring"
            @click="handleRestoreFromPreview"
          >
            <PhCircleNotch
              v-if="isRestoring"
              :size="14"
              class="animate-spin"
              aria-hidden="true"
            />
            <PhArrowCounterClockwise v-else :size="14" aria-hidden="true" />
            {{ isRestoring ? 'Restoring…' : 'Restore into editor' }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
