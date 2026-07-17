<script setup lang="ts">
import { computed } from 'vue'
import {
  PhCheckCircle,
  PhClock,
  PhCircle,
  PhWarningCircle,
} from '@phosphor-icons/vue'

const props = defineProps<{ status: string }>()

const config = {
  completed: { label: 'Completed', icon: PhCheckCircle, base: 'var(--success-emphasis)' },
  in_progress: { label: 'In progress', icon: PhClock, base: 'var(--primary)' },
  pending: { label: 'Pending', icon: PhWarningCircle, base: 'var(--warning-emphasis)' },
  not_started: { label: 'To do', icon: PhCircle, base: 'var(--muted-foreground)' },
} as const

const current = computed(() => {
  const normalized = props.status?.toLowerCase() || 'pending'
  if (normalized === 'completed') return config.completed
  if (normalized === 'in_progress') return config.in_progress
  if (normalized === 'not_started' || normalized === 'to_do' || normalized === 'todo') return config.not_started
  return config.pending
})

// Soft same-hue tint behind theme-aware emphasis text so small text clears AA in both themes.
const style = computed(() => ({
  backgroundColor: `color-mix(in oklab, ${current.value.base} 12%, transparent)`,
  color: current.value.base,
  borderColor: `color-mix(in oklab, ${current.value.base} 22%, transparent)`,
}))
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold select-none capitalize"
    :style="style"
  >
    <component :is="current.icon" :size="13" weight="fill" aria-hidden="true" />
    {{ current.label }}
  </span>
</template>
