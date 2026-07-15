<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import type { Requirement } from './types'

const props = defineProps<{
  requirements: Requirement[]
  selectedId: string
  isLoading: boolean
  isLoadingMore?: boolean
  isError: string
  hasMore: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selectedId', id: string): void
  (e: 'load-more'): void
  (e: 'try-again'): void
}>()

const listContainer = ref<HTMLElement | null>(null)

function handleScroll() {
  if (!listContainer.value || props.isLoading || props.isLoadingMore || !props.hasMore) return

  const { scrollTop, scrollHeight, clientHeight } = listContainer.value
  if (scrollTop + clientHeight >= scrollHeight - 50) {
    emit('load-more')
  }
}

// Scroll the selected requirement into view if needed
watch(
  () => props.selectedId,
  (id) => {
    if (!id || !listContainer.value) return
    // Wait for the next tick to ensure DOM is updated
    setTimeout(() => {
      const activeEl = listContainer.value?.querySelector('.bg-background')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, 50)
  },
)
</script>

<template>
  <aside
    ref="listContainer"
    class="clarus-scroll w-64 shrink-0 overflow-y-auto border-r border-border bg-sidebar"
    aria-label="Requirements list"
    @scroll="handleScroll"
  >
    <ClarusLoadingState
      v-if="isLoading"
      variant="requirements-sidebar"
      label="Loading requirements"
    />

    <div v-else-if="isError" class="px-4 py-3 text-xs text-destructive text-center">
      <p>{{ isError }}</p>
      <Button variant="outline" size="sm" class="mt-2 h-7 text-xs" @click="emit('try-again')">
        Try again
      </Button>
    </div>

    <template v-else>
      <div class="py-2">
        <button
          v-for="req in requirements"
          :key="req.id"
          type="button"
          class="w-full px-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring"
          :class="{
            'bg-background': selectedId === req.id,
            'hover:bg-sidebar-accent/60': selectedId !== req.id,
          }"
          @click="emit('update:selectedId', req.id)"
        >
          <div class="flex items-start gap-2 mb-1">
            <span
              class="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold"
              :class="{
                'bg-primary/12 text-primary': selectedId === req.id,
                'bg-muted text-muted-foreground': selectedId !== req.id,
              }"
            >
              {{ req.code }}
            </span>
            <p
              class="line-clamp-1 text-xs font-semibold leading-normal"
              :class="{
                'text-foreground': selectedId === req.id,
                'text-muted-foreground/90': selectedId !== req.id,
              }"
            >
              {{ req.title || req.description }}
            </p>
          </div>
          <p
            v-if="req.title"
            class="line-clamp-2 text-[11px] leading-relaxed"
            :class="{
              'text-muted-foreground/80': selectedId === req.id,
              'text-muted-foreground/60': selectedId !== req.id,
            }"
          >
            {{ req.description }}
          </p>
        </button>
      </div>

      <ClarusLoadingState
        v-if="isLoadingMore"
        variant="compact"
        label="Loading more requirements"
      />
      <div
        v-else-if="!requirements.length"
        class="py-12 text-center text-xs text-muted-foreground"
      >
        No requirements found.
      </div>
    </template>
  </aside>
</template>
