<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PhArrowCounterClockwise,
  PhClock,
  PhWarningCircle,
  PhArrowLeft,
  PhArrowRight,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  useDocumentVersionsQuery,
  normalizeVersionStatus,
  formatTimeAgo,
} from '@/composables/useDocuments'
import { getDocumentStatusConfig } from '@/lib/documentDisplay'
import type { DocumentVersionItem } from '@/api/documents'

const props = defineProps<{
  documentId: string
}>()

const emit = defineEmits<{
  restore: [content: string, versionLabel: string]
}>()

const currentPage = ref(1)
const itemsPerPage = ref(10)
const offset = computed(() => (currentPage.value - 1) * itemsPerPage.value)

const {
  data: versionsResponse,
  isPending,
  isError,
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

function versionLabel(v: DocumentVersionItem) {
  return `v${v.major}.${v.minor}`
}

function isCurrentVersion(index: number) {
  return offset.value === 0 && index === 0
}

function getStatusConfig(status: string) {
  return getDocumentStatusConfig(normalizeVersionStatus(status))
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

function versionContent(v: DocumentVersionItem): string | undefined {
  if ('content' in v && typeof v.content === 'string' && v.content.trim()) {
    return v.content
  }
  return undefined
}

function canRestore(v: DocumentVersionItem, index: number) {
  return !isCurrentVersion(index) && Boolean(versionContent(v))
}

function handleRestore(v: DocumentVersionItem) {
  const content = versionContent(v)
  if (!content) return
  emit('restore', content, versionLabel(v))
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-foreground text-balance">Version history</h2>
        <p class="mt-0.5 text-xs text-muted-foreground">
          Past revisions of this document, with changelogs and restore when available.
        </p>
      </div>
      <span
        v-if="!isPending && !isError"
        class="shrink-0 tabular-nums text-xs text-muted-foreground"
      >
        {{ totalVersions }} {{ totalVersions === 1 ? 'version' : 'versions' }}
      </span>
    </div>

    <div v-if="isPending" class="divide-y divide-border/60">
      <div v-for="i in 3" :key="i" class="animate-pulse space-y-2.5 px-4 py-3.5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <div class="h-5 w-10 rounded bg-muted" />
            <div class="h-5 w-16 rounded-full bg-muted" />
          </div>
          <div class="h-3.5 w-14 rounded bg-muted" />
        </div>
        <div class="h-3.5 w-2/3 rounded bg-muted" />
        <div class="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>

    <div
      v-else-if="isError"
      class="flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <span
        class="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <PhWarningCircle :size="20" />
      </span>
      <p class="text-sm font-medium text-foreground">Couldn’t load versions</p>
      <p class="mt-1 max-w-[280px] text-xs text-muted-foreground">
        Something went wrong fetching version history. Try reloading the page.
      </p>
    </div>

    <div
      v-else-if="!versionsList.length"
      class="flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <span
        class="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground/50"
      >
        <PhClock :size="20" />
      </span>
      <p class="text-sm font-medium text-foreground">No versions yet</p>
      <p class="mt-1 max-w-[280px] text-xs text-muted-foreground">
        Versions appear here when this document is published or sent for review.
      </p>
    </div>

    <template v-else>
      <ul class="divide-y divide-border/60">
        <li
          v-for="(v, index) in versionsList"
          :key="v.$id"
          class="group flex flex-col gap-2 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/10"
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
                <component :is="getStatusConfig(v.status).icon" :size="10" weight="fill" />
                {{ getStatusConfig(v.status).label }}
              </Badge>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <time
                class="text-xs tabular-nums text-muted-foreground"
                :datetime="v.$updatedAt"
                :title="formatFullDateTime(v.$updatedAt)"
              >
                {{ formatRelativeTime(v.$updatedAt) }}
              </time>
              <Button
                v-if="canRestore(v, index)"
                variant="outline"
                size="sm"
                class="h-8 gap-1.5 px-2.5 text-xs"
                @click="handleRestore(v)"
              >
                <PhArrowCounterClockwise :size="13" />
                Restore
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

      <div
        v-if="totalVersions > itemsPerPage"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
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
            size="sm"
            class="size-8 p-0"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            <span class="sr-only">Previous page</span>
            <PhArrowLeft :size="14" />
          </Button>

          <Button
            v-for="page in totalPages"
            :key="page"
            variant="outline"
            size="sm"
            class="size-8 p-0 font-mono text-xs"
            :class="{
              'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground':
                currentPage === page,
            }"
            @click="currentPage = page"
          >
            {{ page }}
          </Button>

          <Button
            variant="outline"
            size="sm"
            class="size-8 p-0"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            <span class="sr-only">Next page</span>
            <PhArrowRight :size="14" />
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
