<script setup lang="ts">
import { computed } from 'vue'
import type { EvidenceState } from '@/data/controls'

const props = defineProps<{ state: EvidenceState }>()

const config = {
  fresh: { label: 'Fresh', color: 'var(--success)' },
  expiring: { label: 'Expiring', color: 'var(--warning)' },
  expired: { label: 'Expired', color: 'var(--destructive)' },
} as const

const current = computed(() => config[props.state])
</script>

<template>
  <span class="inline-flex items-center gap-2 text-sm text-foreground">
    <span
      class="size-2 shrink-0 rounded-full"
      :style="{ backgroundColor: current.color }"
      aria-hidden="true"
    />
    {{ current.label }}
  </span>
</template>
