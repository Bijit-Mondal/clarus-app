<script setup lang="ts">
import { ref, watch, type Component } from 'vue'
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
  PhCaretDown,
  PhCaretRight,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import type { Evidence } from '@/api/evidence'

const props = withDefaults(
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

// Track expanded state of evidence descriptions
const expandedEvidences = ref<Record<string, boolean>>({})

function toggleExpand(id: string) {
  expandedEvidences.value[id] = !expandedEvidences.value[id]
}

// Reset expanded state when evidences change (e.g. on new load)
watch(
  () => props.evidences,
  (newEvidences) => {
    expandedEvidences.value = {}
    if (newEvidences) {
      newEvidences.forEach((e) => {
        expandedEvidences.value[e.$id] = false
      })
    }
  },
  { immediate: true },
)

// Status styling and icon configurations
interface StatusConfig {
  label: string
  class: string
  icon: Component
}

const statusConfigs: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending Review',
    class: 'border-border bg-muted/50 text-muted-foreground',
    icon: PhClock,
  },
  available: {
    label: 'Available',
    class: 'border-info/30 bg-info/10 text-info',
    icon: PhFile,
  },
  ai_approved: {
    label: 'Helix Approved',
    class: 'border-success/30 bg-success/10 text-success-emphasis',
    icon: PhCpu,
  },
  ai_rejected: {
    label: 'Helix Rejected',
    class: 'border-destructive/30 bg-destructive/10 text-destructive-emphasis',
    icon: PhCpu,
  },
  ai_needs_review: {
    label: 'Helix Needs Review',
    class: 'border-warning/30 bg-warning/10 text-warning-emphasis',
    icon: PhWarningCircle,
  },
  ai_review_failed: {
    label: 'Helix Review Failed',
    class: 'border-destructive/30 bg-destructive/10 text-destructive-emphasis',
    icon: PhWarningCircle,
  },
  passed: {
    label: 'Passed',
    class: 'border-success/30 bg-success/10 text-success-emphasis',
    icon: PhCheckCircle,
  },
  failed: {
    label: 'Failed',
    class: 'border-destructive/30 bg-destructive/10 text-destructive-emphasis',
    icon: PhWarningCircle,
  },
}

function getStatusConfig(status: string): StatusConfig {
  if (!status) {
    return {
      label: 'Pending',
      class: 'border-border bg-muted/50 text-muted-foreground',
      icon: PhClock,
    }
  }
  const normalized = status.toLowerCase()
  return (
    statusConfigs[normalized] || {
      label: status,
      class: 'border-border bg-muted/50 text-muted-foreground',
      icon: PhClock,
    }
  )
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
          class="cursor-pointer font-semibold text-xs gap-1.5"
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
              <th class="px-5 py-2.5 font-medium w-[140px]">Source</th>
              <th class="px-5 py-2.5 font-medium w-[140px]">Reference</th>
              <th class="px-5 py-2.5 font-medium w-[160px]">Status</th>
              <th class="px-5 py-2.5 font-medium w-[140px]">Collected at</th>
              <th class="px-5 py-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="e in evidences" :key="e.$id">
              <tr
                class="transition-colors duration-150"
                :class="[
                  e.description && expandedEvidences[e.$id]
                    ? 'bg-muted/15'
                    : 'border-b border-border/40 last:border-0 hover:bg-muted/10',
                ]"
              >
                <!-- Evidence Title & Description -->
                <td class="px-5 py-3 align-top max-w-[280px]">
                  <div class="flex items-start gap-1.5">
                    <!-- Chevron Toggle -->
                    <button
                      v-if="e.description"
                      class="mt-0.5 flex size-4 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-transform duration-200"
                      @click="toggleExpand(e.$id)"
                    >
                      <component
                        :is="expandedEvidences[e.$id] ? PhCaretDown : PhCaretRight"
                        :size="14"
                      />
                    </button>
                    <div v-else class="size-4 shrink-0" />

                    <div class="min-w-0 flex-1">
                      <button
                        v-if="e.description"
                        type="button"
                        class="text-left font-medium text-foreground text-sm leading-normal hover:underline decoration-muted-foreground/30 cursor-pointer block w-full truncate"
                        :title="e.title"
                        @click="toggleExpand(e.$id)"
                      >
                        {{ e.title }}
                      </button>
                      <div
                        v-else
                        class="font-medium text-foreground text-sm leading-normal truncate"
                        :title="e.title"
                      >
                        {{ e.title }}
                      </div>
                      <div
                        v-if="e.description && !expandedEvidences[e.$id]"
                        class="text-xs text-muted-foreground mt-0.5 leading-normal truncate cursor-pointer"
                        @click="toggleExpand(e.$id)"
                      >
                        {{ e.description }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Source Badge -->
                <td class="px-5 py-3 align-top whitespace-nowrap">
                  <Badge
                    v-if="e.sourceType === 'manual'"
                    variant="outline"
                    class="gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted/50 text-muted-foreground border-border/60"
                  >
                    <component :is="PhUser" :size="11" />
                    <span>Manual</span>
                  </Badge>
                  <Badge
                    v-else-if="e.sourceType === 'auto' || e.sourceType === 'automated'"
                    variant="outline"
                    class="gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-info/5 text-info border-info/20"
                  >
                    <component :is="PhCpu" :size="11" />
                    <span>Automated</span>
                  </Badge>
                  <Badge
                    v-else
                    variant="outline"
                    class="gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted/50 text-muted-foreground border-border/60 capitalize"
                  >
                    <component :is="PhFileText" :size="11" />
                    <span>{{ e.sourceType || 'unknown' }}</span>
                  </Badge>
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

                  <Button
                    v-else-if="e.externalReference"
                    as="a"
                    :href="e.externalReference"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline"
                    size="sm"
                    class="h-7 px-2 text-xs gap-1 cursor-pointer"
                  >
                    <component :is="PhLink" :size="12" class="text-muted-foreground" />
                    <span>Open link</span>
                    <component :is="PhArrowUpRight" :size="10" class="text-muted-foreground" />
                  </Button>

                  <span v-else class="text-xs text-muted-foreground italic">None</span>
                </td>

                <!-- Status Badge (with Icon) -->
                <td class="px-5 py-3 align-top whitespace-nowrap">
                  <Badge
                    variant="outline"
                    :class="[
                      'gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border',
                      getStatusConfig(e.status).class,
                    ]"
                  >
                    <component :is="getStatusConfig(e.status).icon" :size="11" class="shrink-0" />
                    <span>{{ getStatusConfig(e.status).label }}</span>
                  </Badge>
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
                        class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        @click="$emit('delete', e.$id)"
                      >
                        <component :is="PhTrash" :size="13" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete evidence</TooltipContent>
                  </Tooltip>
                </td>
              </tr>

              <!-- Details Row (only if description is present and expanded) -->
              <tr
                v-if="e.description && expandedEvidences[e.$id]"
                :key="e.$id + '-details'"
                class="border-b border-border/40 bg-muted/15"
              >
                <td colspan="6" class="px-5 pb-4 pt-1">
                  <div
                    class="ml-[22px] pl-3.5 border-l border-border/80 py-1 space-y-2 animate-slide-down"
                  >
                    <!-- Header -->
                    <div
                      class="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      <component :is="getStatusConfig(e.status).icon" :size="12" class="shrink-0" />
                      <span>{{ getStatusConfig(e.status).label }} Review Feedback</span>
                    </div>

                    <!-- Content -->
                    <p
                      class="text-xs text-foreground/90 whitespace-pre-line leading-relaxed font-sans max-w-[75ch]"
                    >
                      {{ e.description }}
                    </p>
                  </div>
                </td>
              </tr>
            </template>
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
          class="mt-5 gap-1.5 font-semibold text-xs cursor-pointer"
          @click="$emit('add')"
        >
          <component :is="PhPlus" :size="14" weight="bold" />
          <span>Add evidence</span>
        </Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-down {
  animation: slideDown 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  .animate-slide-down {
    animation: none !important;
  }
}
</style>
