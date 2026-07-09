<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { usePlatformModKey } from '@/composables/usePlatformModKey'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const { shortcut } = usePlatformModKey()
const searchShortcut = shortcut('k')

const emit = defineEmits<{
  open: []
}>()
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'group flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-full sm:justify-start sm:gap-2.5 sm:px-3 sm:pr-2 sm:text-left',
        props.class,
      )
    "
    aria-label="Search"
    @click="emit('open')"
  >
    <PhMagnifyingGlass
      :size="16"
      class="shrink-0"
      aria-hidden="true"
    />
    <span class="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:inline">
      Search…
    </span>
    <kbd
      class="pointer-events-none ml-auto hidden h-5 shrink-0 select-none items-center rounded border border-border/80 bg-background px-1.5 font-mono text-[10px] font-medium leading-none tracking-wide text-muted-foreground md:inline-flex"
      aria-hidden="true"
    >
      {{ searchShortcut }}
    </kbd>
  </button>
</template>
