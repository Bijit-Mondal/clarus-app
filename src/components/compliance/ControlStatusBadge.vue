<script setup lang="ts">
import { computed } from 'vue'
import { PhCheckCircle, PhWarningCircle, PhXCircle } from '@phosphor-icons/vue'
import type { ControlStatus } from '@/data/controls'

const props = defineProps<{ status: ControlStatus }>()

const config = {
  passing: { label: 'Passing', icon: PhCheckCircle, base: 'var(--success-emphasis)' },
  attention: { label: 'Attention', icon: PhWarningCircle, base: 'var(--warning-emphasis)' },
  failing: { label: 'Failing', icon: PhXCircle, base: 'var(--destructive-emphasis)' },
} as const

const current = computed(() => config[props.status])

// Soft same-hue tint behind theme-aware emphasis text so small text clears AA in both themes.
const style = computed(() => ({
  backgroundColor: `color-mix(in oklab, ${current.value.base} 15%, transparent)`,
  color: current.value.base,
}))
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
    :style="style"
  >
    <component :is="current.icon" :size="13" weight="fill" aria-hidden="true" />
    {{ current.label }}
  </span>
</template>
