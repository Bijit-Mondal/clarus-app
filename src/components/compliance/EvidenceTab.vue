<script setup lang="ts">
import {
  PhPlus,
  PhTrash,
  PhFileText,
  PhSpinner,
  PhFile,
  PhArrowUpRight,
  PhLink,
  PhUser,
  PhCpu,
  PhCheckCircle,
  PhWarningCircle,
  PhClock,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Evidence } from '@/api/evidence'

withDefaults(
  defineProps<{
    evidences: Evidence[]
    isLoading: boolean
    downloadingId?: string | null
    emptyDescription?: string
  }>(),
  {
    downloadingId: null,
    emptyDescription: 'Add screenshots or reports as proof of this task being completed.',
  },
)

defineEmits<{
  (e: 'download', id: string): void
  (e: 'delete', id: string): void
  (e: 'add'): void
}>()

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatDate(iso: string) {
  if (!iso) return 'N/A'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return 'N/A'
  return dateFormatter.format(date)
}
</script>

<template>
  <div class="w-full">
    <!-- Loading State -->
    <div v-if="isLoading" class="py-14 flex flex-col items-center justify-center text-center">
      <component :is="PhSpinner" :size="22" class="animate-spin text-primary mb-2" />
      <p class="text-xs text-muted-foreground">Loading evidence...</p>
    </div>

    <template v-else>
      <!-- Header Toolbar (only shown if there is evidence) -->
      <div
        v-if="evidences.length"
        class="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/10"
      >
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-foreground">Linked Evidence</span>
          <span
            class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-medium text-secondary-foreground border border-border/40"
          >
            {{ evidences.length }}
          </span>
        </div>
        <Button
          size="sm"
          class="gap-1.5 font-semibold text-xs h-8 cursor-pointer"
          @click="$emit('add')"
        >
          <component :is="PhPlus" :size="14" weight="bold" />
          <span>Add evidence</span>
        </Button>
      </div>

      <!-- Table View -->
      <div v-if="evidences.length" class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-border bg-muted/40 text-xs text-muted-foreground font-medium"
            >
              <th class="px-5 py-2.5 font-medium">Evidence</th>
              <th class="px-5 py-2.5 font-medium">Source</th>
              <th class="px-5 py-2.5 font-medium">Reference</th>
              <th class="px-5 py-2.5 font-medium">Status</th>
              <th class="px-5 py-2.5 font-medium">Collected at</th>
              <th class="px-5 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="e in evidences"
              :key="e.$id"
              class="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors duration-150"
            >
              <!-- Evidence Title & Description -->
              <td class="px-5 py-3 align-top max-w-[240px]">
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

              <!-- Source Badge -->
              <td class="px-5 py-3 align-top whitespace-nowrap">
                <span
                  v-if="e.sourceType === 'manual'"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border/80"
                >
                  <component :is="PhUser" :size="12" />
                  Manual
                </span>
                <span
                  v-else-if="e.sourceType === 'auto' || e.sourceType === 'automated'"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-info/10 text-info border border-info/20"
                >
                  <component :is="PhCpu" :size="12" />
                  Automated
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border/80 capitalize"
                >
                  <component :is="PhFileText" :size="12" />
                  {{ e.sourceType || 'unknown' }}
                </span>
              </td>

              <!-- Reference Link or File -->
              <td class="px-5 py-3 align-top whitespace-nowrap">
                <Button
                  v-if="e.attachmentId"
                  variant="outline"
                  size="sm"
                  class="h-7 px-2 text-xs gap-1 cursor-pointer"
                  :disabled="downloadingId === e.$id"
                  @click="$emit('download', e.$id)"
                >
                  <component
                    :is="downloadingId === e.$id ? PhSpinner : PhFile"
                    :size="12"
                    :class="{ 'animate-spin': downloadingId === e.$id }"
                  />
                  <span>View file</span>
                  <component
                    v-if="downloadingId !== e.$id"
                    :is="PhArrowUpRight"
                    :size="10"
                    class="text-muted-foreground"
                  />
                </Button>

                <a
                  v-else-if="e.externalReference"
                  :href="e.externalReference"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <component :is="PhLink" :size="12" class="text-muted-foreground" />
                  <span>Open link</span>
                  <component :is="PhArrowUpRight" :size="10" class="text-muted-foreground" />
                </a>

                <span v-else class="text-xs text-muted-foreground italic">None</span>
              </td>

              <!-- Status Badge (with Icon) -->
              <td class="px-5 py-3 align-top whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border capitalize"
                  :class="
                    e.status === 'verified'
                      ? 'bg-success/10 text-success border-success/20'
                      : e.status === 'failed' || e.status === 'rejected'
                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : 'bg-warning/10 text-warning-emphasis border-warning/20'
                  "
                >
                  <component
                    :is="
                      e.status === 'verified'
                        ? PhCheckCircle
                        : e.status === 'failed' || e.status === 'rejected'
                          ? PhWarningCircle
                          : PhClock
                    "
                    :size="12"
                    class="shrink-0"
                  />
                  <span>{{ e.status }}</span>
                </span>
              </td>

              <!-- Date Collected -->
              <td
                class="px-5 py-3 align-top text-muted-foreground tabular-nums text-xs whitespace-nowrap"
              >
                {{ formatDate(e.collectedAt || e.$createdAt) }}
              </td>

              <!-- Delete Action -->
              <td class="px-5 py-3 text-right align-top">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 rounded-md cursor-pointer"
                      @click="$emit('delete', e.$id)"
                    >
                      <component :is="PhTrash" :size="13" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete evidence</TooltipContent>
                </Tooltip>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="py-16 px-4 flex flex-col items-center justify-center text-center">
        <div
          class="flex size-12 items-center justify-center rounded-lg border border-border bg-muted/20 text-muted-foreground/60 mb-4"
        >
          <component :is="PhFileText" :size="24" />
        </div>
        <h3 class="text-sm font-semibold text-foreground">No evidence linked yet</h3>
        <p class="text-xs text-muted-foreground mt-1.5 max-w-[320px] leading-normal">
          {{ emptyDescription }}
        </p>
        <Button
          size="sm"
          class="mt-5 gap-1.5 font-semibold text-xs h-8 cursor-pointer"
          @click="$emit('add')"
        >
          <component :is="PhPlus" :size="14" weight="bold" />
          <span>Add evidence</span>
        </Button>
      </div>
    </template>
  </div>
</template>
