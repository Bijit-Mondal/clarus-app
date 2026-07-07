<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'
import {
  PhArrowUp,
  PhFileMagnifyingGlass,
  PhNotepad,
  PhShieldCheck,
  PhSparkle,
} from '@phosphor-icons/vue'
import { cn } from '@/lib/utils'

const query = ref('')
const isOpen = ref(false)
const hasQuery = computed(() => query.value.trim().length > 0)

const containerRef = useTemplateRef('container')
const inputRef = useTemplateRef('inputEl')

onClickOutside(containerRef, () => {
  isOpen.value = false
})

const suggestions = [
  {
    icon: PhShieldCheck,
    label: 'Summarize open findings',
    prompt: 'Summarize our open findings across all frameworks',
  },
  {
    icon: PhFileMagnifyingGlass,
    label: 'Controls needing evidence',
    prompt: 'Which controls need evidence before their next review?',
  },
  {
    icon: PhNotepad,
    label: 'Draft an auditor response',
    prompt: 'Draft a response to our auditor about the SOC 2 exception',
  },
]

function selectSuggestion(prompt: string) {
  query.value = prompt
  isOpen.value = false
  inputRef.value?.focus()
}

function onSubmit() {
  if (!hasQuery.value) return
  // Shell placeholder — AI integration lands in a later feature.
  query.value = ''
  isOpen.value = false
}

function onEscape() {
  isOpen.value = false
  inputRef.value?.blur()
}
</script>

<template>
  <div ref="container" class="relative w-full max-w-md">
    <form
      role="search"
      aria-label="Ask Clarus AI"
      @submit.prevent="onSubmit"
    >
      <div
        :class="
          cn(
            'ai-input-glow relative rounded-lg transition-shadow duration-300 ease-out',
            isOpen && 'is-active',
          )
        "
      >
        <div
          class="relative flex items-center rounded-lg border border-border bg-muted/60 pl-3 pr-1.5 transition-colors duration-200"
          :class="isOpen && 'border-transparent bg-background'"
        >
          <PhSparkle
            :size="17"
            weight="fill"
            :class="
              cn(
                'pointer-events-none shrink-0 text-primary transition-transform duration-300 ease-out',
                isOpen && 'scale-110',
              )
            "
            aria-hidden="true"
          />

          <input
            ref="inputEl"
            v-model="query"
            type="text"
            placeholder="Ask Clarus…"
            autocomplete="off"
            class="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            @focus="isOpen = true"
            @keydown.escape="onEscape"
          >

          <kbd
            v-if="!hasQuery && !isOpen"
            class="pointer-events-none hidden shrink-0 select-none items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground sm:inline-flex"
            aria-hidden="true"
          >
            <span class="text-sm leading-none">⌘</span>K
          </kbd>

          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="scale-75 opacity-0"
            leave-active-class="transition duration-150 ease-out"
            leave-to-class="scale-75 opacity-0"
          >
            <button
              v-if="hasQuery"
              type="submit"
              class="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              aria-label="Ask Clarus"
            >
              <PhArrowUp :size="14" weight="bold" aria-hidden="true" />
            </button>
          </Transition>
        </div>
      </div>
    </form>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
      leave-active-class="transition duration-100 ease-out"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute inset-x-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-md border border-border bg-popover p-1.5 shadow-sm"
      >
        <p class="px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">
          Try asking
        </p>
        <ul role="list">
          <li v-for="item in suggestions" :key="item.label">
            <button
              type="button"
              class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
              @mousedown.prevent
              @click="selectSuggestion(item.prompt)"
            >
              <component :is="item.icon" :size="16" class="shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="truncate">{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ai-input-glow {
  box-shadow: 0 0 0 0 transparent;
  transition:
    box-shadow 300ms cubic-bezier(0.22, 1, 0.36, 1),
    background 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ai-input-glow.is-active {
  box-shadow:
    0 0 0 3px color-mix(in oklch, var(--primary) 16%, transparent),
    0 8px 24px -10px color-mix(in oklch, var(--primary) 45%, transparent);
}

.ai-input-glow::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(
    from var(--ai-angle, 0deg),
    transparent 0%,
    color-mix(in oklch, var(--primary) 80%, transparent) 8%,
    transparent 22%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 250ms ease-out;
  animation: ai-rotate 2.6s linear infinite;
  animation-play-state: paused;
  pointer-events: none;
}

.ai-input-glow.is-active::before {
  opacity: 1;
  animation-play-state: running;
}

@property --ai-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes ai-rotate {
  to {
    --ai-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-input-glow::before {
    animation: none;
  }
}
</style>
