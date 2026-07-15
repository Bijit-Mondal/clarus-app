<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  PhClipboardText,
  PhFileText,
  PhGavel,
  PhShieldCheck,
  PhPlus,
  PhCheckCircle,
  PhClock,
  PhCircle,
  PhTrash,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { LinkItem, LinkSectionId, LinkSectionConfig } from './types'

const props = defineProps<{
  requirementId: string
  linkedItems: Record<LinkSectionId, LinkItem[]>
  isLoadingControls?: boolean
  controlsError?: string
}>()

const emit = defineEmits<{
  (e: 'open-link-dialog', sectionId: LinkSectionId): void
  (e: 'retry-controls'): void
  (e: 'unlink-item', sectionId: LinkSectionId, item: LinkItem): void
  (e: 'click-control', item: LinkItem): void
}>()

const activeTab = ref<LinkSectionId>('controls')

watch(
  () => props.requirementId,
  () => {
    activeTab.value = 'controls'
  },
)

// Helper styling/parsing for Coverage Status
const getCoverageStyle = (coverage: string | undefined) => {
  if (!coverage) return {}
  const normalized = coverage.toLowerCase().replace('_', ' ')
  let baseColor = 'var(--muted-foreground)'

  if (normalized.includes('full')) {
    baseColor = 'var(--success-emphasis)'
  } else if (normalized.includes('partial')) {
    baseColor = 'var(--warning-emphasis)'
  } else if (
    normalized.includes('gap') ||
    normalized.includes('no') ||
    normalized.includes('none')
  ) {
    baseColor = 'var(--destructive-emphasis)'
  }

  return {
    backgroundColor: `color-mix(in oklab, ${baseColor} 12%, transparent)`,
    color: baseColor,
    borderColor: `color-mix(in oklab, ${baseColor} 20%, transparent)`,
  }
}

const getCoverageLabel = (coverage: string | undefined) => {
  if (!coverage) return ''
  const normalized = coverage.toLowerCase().replace('_', ' ')
  if (normalized.includes('full')) return 'Full Coverage'
  if (normalized.includes('partial')) return 'Partial Coverage'
  if (normalized.includes('gap') || normalized.includes('no') || normalized.includes('none'))
    return 'No Coverage'
  return coverage.charAt(0).toUpperCase() + coverage.slice(1)
}

// Helper styling/parsing for Implementation Status
const getStatusConfig = (status: string | undefined) => {
  const s = (status || '').toLowerCase().replace('_', ' ')
  if (
    s.includes('implement') ||
    s.includes('place') ||
    s.includes('complete') ||
    s.includes('approve') ||
    s.includes('active')
  ) {
    return {
      label: 'Implemented',
      icon: PhCheckCircle,
      baseColor: 'var(--success-emphasis)',
    }
  } else if (s.includes('progress') || s.includes('review') || s.includes('schedule')) {
    return {
      label: 'In Progress',
      icon: PhClock,
      baseColor: 'var(--warning-emphasis)',
    }
  } else if (
    s.includes('draft') ||
    s.includes('not started') ||
    s.includes('none') ||
    s.includes('gap')
  ) {
    return {
      label: 'Not Started',
      icon: PhCircle,
      baseColor: 'var(--muted-foreground)',
    }
  }
  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') : 'Unknown',
    icon: PhCircle,
    baseColor: 'var(--muted-foreground)',
  }
}

const getStatusStyle = (status: string | undefined) => {
  const config = getStatusConfig(status)
  return {
    backgroundColor: `color-mix(in oklab, ${config.baseColor} 10%, transparent)`,
    color: config.baseColor,
    borderColor: `color-mix(in oklab, ${config.baseColor} 20%, transparent)`,
  }
}

// Helper styling for Document, Audit, Obligation table statuses
const getGeneralStatusStyle = (state: string | undefined) => {
  if (!state) return {}
  const s = state.toLowerCase().replace('_', ' ')
  let baseColor = 'var(--muted-foreground)'

  if (
    s.includes('approve') ||
    s.includes('complete') ||
    s.includes('active') ||
    s.includes('place') ||
    s.includes('implement')
  ) {
    baseColor = 'var(--success-emphasis)'
  } else if (s.includes('review') || s.includes('progress') || s.includes('schedule')) {
    baseColor = 'var(--warning-emphasis)'
  } else if (
    s.includes('fail') ||
    s.includes('expire') ||
    s.includes('draft') ||
    s.includes('none') ||
    s.includes('gap')
  ) {
    if (s.includes('expired') || s.includes('fail')) {
      baseColor = 'var(--destructive-emphasis)'
    } else {
      baseColor = 'var(--muted-foreground)'
    }
  }

  return {
    backgroundColor: `color-mix(in oklab, ${baseColor} 10%, transparent)`,
    color: baseColor,
    borderColor: `color-mix(in oklab, ${baseColor} 20%, transparent)`,
  }
}

const formatStateLabel = (state: string | undefined) => {
  if (!state) return ''
  return state
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const shouldShowControlKey = (_item: LinkItem) => {
  return false
  // if (!item.controlKey) return false
  // const cleanKey = item.controlKey.toLowerCase().replace(/[^a-z0-9]/g, '')
  // const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  // return cleanKey !== cleanName
}

const LINK_SECTIONS: Omit<LinkSectionConfig, 'searchPlaceholder' | 'columns'>[] = [
  {
    id: 'controls',
    label: 'Controls',
    icon: PhShieldCheck,
    emptyLabel: 'No controls linked yet',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: PhFileText,
    emptyLabel: 'No documents linked yet',
  },
  {
    id: 'audits',
    label: 'Audits',
    icon: PhClipboardText,
    emptyLabel: 'No audits linked yet',
  },
  {
    id: 'obligations',
    label: 'Obligations',
    icon: PhGavel,
    emptyLabel: 'No obligations linked yet',
  },
]
</script>

<template>
  <div class="px-6 py-5 lg:px-8">
    <!-- Tab bar & Action Header -->
    <div class="mb-4 flex items-center justify-between border-b border-border">
      <div class="flex items-end -mb-[1px]" role="tablist" aria-label="Linked items">
        <button
          v-for="section in LINK_SECTIONS"
          :key="section.id"
          type="button"
          role="tab"
          :id="`tab-${section.id}`"
          :aria-selected="activeTab === section.id"
          :aria-controls="`tabpanel-${section.id}`"
          class="relative flex items-center gap-1.5 px-3.5 pb-2.5 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 first:pl-0"
          :class="{
            'text-foreground': activeTab === section.id,
            'text-muted-foreground hover:text-foreground': activeTab !== section.id,
          }"
          @click="activeTab = section.id"
        >
          <component :is="section.icon" :size="14" aria-hidden="true" />
          {{ section.label }}
          <span
            v-if="linkedItems[section.id]?.length"
            class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/12 px-1 text-[10px] font-semibold text-primary"
          >
            {{ linkedItems[section.id].length }}
          </span>
          <!-- Active underline -->
          <span
            v-if="activeTab === section.id"
            class="absolute inset-x-0 bottom-0 h-[2px] rounded-t-full bg-primary transition-transform"
            aria-hidden="true"
          />
        </button>
      </div>

      <Button
        size="sm"
        class="gap-1.5 text-xs h-8 px-3 font-semibold shadow-xs transition-all hover:bg-primary/90"
        @click="emit('open-link-dialog', activeTab)"
      >
        <PhPlus :size="13" weight="bold" aria-hidden="true" />
        Link
        {{
          activeTab === 'audits'
            ? 'audit'
            : activeTab === 'obligations'
              ? 'obligation'
              : activeTab === 'documents'
                ? 'document'
                : 'control'
        }}
      </Button>
    </div>

    <!-- Tab panels, shown one at a time -->
    <div
      v-for="section in LINK_SECTIONS"
      v-show="activeTab === section.id"
      :id="`tabpanel-${section.id}`"
      :key="section.id"
      role="tabpanel"
      :aria-labelledby="`tab-${section.id}`"
    >
      <!-- Controls -->
      <template v-if="section.id === 'controls'">
        <div class="overflow-hidden rounded-lg border border-border bg-card">
          <template v-if="isLoadingControls">
            <ClarusLoadingState variant="control-links" :rows="3" label="Loading linked controls" />
          </template>
          <template v-else-if="controlsError">
            <div class="py-8 text-center">
              <div class="flex flex-col items-center gap-2 text-destructive">
                <p class="text-xs font-medium">{{ controlsError }}</p>
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7 text-xs"
                  @click="emit('retry-controls')"
                >
                  Try again
                </Button>
              </div>
            </div>
          </template>
          <template v-else>
            <div
              v-for="item in linkedItems.controls"
              :key="item.id"
              class="flex items-center justify-between gap-4 border-b border-border/40 last:border-0 px-4 py-3.5 hover:bg-muted/15 transition-colors"
            >
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <!-- Control Code / Key -->
                <span
                  v-if="shouldShowControlKey(item)"
                  class="inline-flex shrink-0 items-center justify-center rounded border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground uppercase leading-none min-w-[50px] text-center"
                >
                  {{ item.controlKey }}
                </span>
                <!-- Control Name -->
                <span
                  class="font-medium text-foreground truncate text-sm hover:text-primary hover:underline cursor-pointer"
                  @click="emit('click-control', item)"
                >
                  {{ item.name }}
                </span>
              </div>

              <div class="flex shrink-0 items-center gap-3">
                <!-- Coverage Badge -->
                <span
                  v-if="item.coverage"
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border leading-none"
                  :style="getCoverageStyle(item.coverage)"
                >
                  {{ getCoverageLabel(item.coverage) }}
                </span>

                <!-- Status Badge -->
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border leading-none"
                  :style="getStatusStyle(item.implementationStatus || item.state)"
                >
                  <component
                    :is="getStatusConfig(item.implementationStatus || item.state).icon"
                    :size="11"
                    weight="fill"
                    aria-hidden="true"
                  />
                  {{ getStatusConfig(item.implementationStatus || item.state).label }}
                </span>

                <!-- Unlink Control -->
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      @click="emit('unlink-item', 'controls', item)"
                      aria-label="Unlink control"
                    >
                      <PhTrash :size="14" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p class="text-xs">Unlink control</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="!linkedItems.controls?.length" class="py-12 text-center">
              <div class="flex flex-col items-center gap-2.5">
                <PhShieldCheck :size="28" class="text-muted-foreground/30" aria-hidden="true" />
                <p class="text-sm text-muted-foreground">{{ section.emptyLabel }}</p>
              </div>
            </div>
          </template>
        </div>
      </template>

      <!-- Documents -->
      <template v-else-if="section.id === 'documents'">
        <div class="overflow-hidden rounded-lg border border-border bg-card">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-left">
                <th class="px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th class="px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                <th class="px-4 py-2.5 text-xs font-medium text-muted-foreground">State</th>
                <th class="w-10 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in linkedItems.documents"
                :key="item.id"
                class="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/15"
              >
                <td class="px-4 py-3 text-sm font-medium text-foreground">
                  <span class="hover:text-primary hover:underline cursor-pointer">{{
                    item.name
                  }}</span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ item.type }}</td>
                <td class="px-4 py-3 text-sm">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border leading-none"
                    :style="getGeneralStatusStyle(item.state)"
                  >
                    {{ formatStateLabel(item.state) }}
                  </span>
                </td>
                <td class="px-4 py-2 text-right">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        @click="emit('unlink-item', 'documents', item)"
                        aria-label="Unlink document"
                      >
                        <PhTrash :size="14" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p class="text-xs">Unlink document</p>
                    </TooltipContent>
                  </Tooltip>
                </td>
              </tr>
              <tr v-if="!linkedItems.documents?.length">
                <td colspan="4" class="py-12 text-center">
                  <div class="flex flex-col items-center gap-2.5">
                    <PhFileText :size="28" class="text-muted-foreground/30" aria-hidden="true" />
                    <p class="text-sm text-muted-foreground">{{ section.emptyLabel }}</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Audits -->
      <template v-else-if="section.id === 'audits'">
        <div class="overflow-hidden rounded-lg border border-border bg-card">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-left">
                <th class="px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th class="px-4 py-2.5 text-xs font-medium text-muted-foreground">State</th>
                <th class="w-10 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in linkedItems.audits"
                :key="item.id"
                class="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/15"
              >
                <td class="px-4 py-3 text-sm font-medium text-foreground">
                  <span class="hover:text-primary hover:underline cursor-pointer">{{
                    item.name
                  }}</span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border leading-none"
                    :style="getGeneralStatusStyle(item.state)"
                  >
                    {{ formatStateLabel(item.state) }}
                  </span>
                </td>
                <td class="px-4 py-2 text-right">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        @click="emit('unlink-item', 'audits', item)"
                        aria-label="Unlink audit"
                      >
                        <PhTrash :size="14" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p class="text-xs">Unlink audit</p>
                    </TooltipContent>
                  </Tooltip>
                </td>
              </tr>
              <tr v-if="!linkedItems.audits?.length">
                <td colspan="3" class="py-12 text-center">
                  <div class="flex flex-col items-center gap-2.5">
                    <PhClipboardText
                      :size="28"
                      class="text-muted-foreground/30"
                      aria-hidden="true"
                    />
                    <p class="text-sm text-muted-foreground">{{ section.emptyLabel }}</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Obligations -->
      <template v-else-if="section.id === 'obligations'">
        <div class="overflow-hidden rounded-lg border border-border bg-card">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-left">
                <th class="px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th class="px-4 py-2.5 text-xs font-medium text-muted-foreground">Area</th>
                <th class="px-4 py-2.5 text-xs font-medium text-muted-foreground">Source</th>
                <th class="px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th class="w-10 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in linkedItems.obligations"
                :key="item.id"
                class="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/15"
              >
                <td class="px-4 py-3 text-sm font-medium text-foreground">
                  <span class="hover:text-primary hover:underline cursor-pointer">{{
                    item.name
                  }}</span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ item.area }}</td>
                <td class="px-4 py-3 text-sm text-muted-foreground font-mono text-[11px]">
                  {{ item.source }}
                </td>
                <td class="px-4 py-3 text-sm">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border leading-none"
                    :style="getGeneralStatusStyle(item.state)"
                  >
                    {{ formatStateLabel(item.state) }}
                  </span>
                </td>
                <td class="px-4 py-2 text-right">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        @click="emit('unlink-item', 'obligations', item)"
                        aria-label="Unlink obligation"
                      >
                        <PhTrash :size="14" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p class="text-xs">Unlink obligation</p>
                    </TooltipContent>
                  </Tooltip>
                </td>
              </tr>
              <tr v-if="!linkedItems.obligations?.length">
                <td colspan="5" class="py-12 text-center">
                  <div class="flex flex-col items-center gap-2.5">
                    <PhGavel :size="28" class="text-muted-foreground/30" aria-hidden="true" />
                    <p class="text-sm text-muted-foreground">{{ section.emptyLabel }}</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>
