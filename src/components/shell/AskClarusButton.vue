<script setup lang="ts">
import { PhMagicWand } from '@phosphor-icons/vue'
import { usePlatformModKey } from '@/composables/usePlatformModKey'
import { useClarusAi } from '@/composables/useClarusAi'
import { cn } from '@/lib/utils'

const { shortcut } = usePlatformModKey()
const askShortcut = shortcut('j')
const { open, togglePanel } = useClarusAi()
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'group inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border text-sm font-medium text-foreground',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'pl-2.5 pr-1.5 max-sm:w-9 max-sm:justify-center max-sm:px-0',
        open ? 'border-primary/40 bg-primary/10' : 'border-border bg-muted/50 hover:bg-muted',
      )
    "
    :aria-expanded="open"
    aria-haspopup="dialog"
    aria-controls="clarus-ai-panel"
    aria-label="Ask AI"
    @click="togglePanel"
  >
    <PhMagicWand :size="16" class="shrink-0 text-primary" aria-hidden="true" />

    <span class="hidden tracking-tight sm:inline">Ask AI</span>

    <kbd
      class="pointer-events-none hidden h-5 shrink-0 select-none items-center rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium leading-none tracking-wide text-muted-foreground md:inline-flex"
      aria-hidden="true"
    >
      {{ askShortcut }}
    </kbd>
  </button>
</template>
