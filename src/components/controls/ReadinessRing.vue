<script setup lang="ts">
import { computed } from 'vue'
import type { StatusSummary } from '@/data/controls'

const props = withDefaults(
  defineProps<{
    summary: StatusSummary
    size?: number
    stroke?: number
  }>(),
  {
    size: 168,
    stroke: 14,
  },
)

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const center = computed(() => props.size / 2)
const gap = 0.012 // fractional gap between segments so they read as distinct arcs

/**
 * Three arcs (passing / attention / failing) laid around the ring in order,
 * each sized by its share of the total. A small gap separates adjacent arcs.
 * Color is reinforced by the centre figure and the legend beside it, never
 * carrying meaning alone.
 */
const segments = computed(() => {
  const { passing, attention, failing, total } = props.summary
  if (total === 0) return []
  const parts: { key: string; value: number; color: string }[] = [
    { key: 'passing', value: passing, color: 'var(--success)' },
    { key: 'attention', value: attention, color: 'var(--warning)' },
    { key: 'failing', value: failing, color: 'var(--destructive)' },
  ].filter((p) => p.value > 0)

  let offset = 0
  return parts.map((part) => {
    const fraction = part.value / total
    const usable = Math.max(fraction - (parts.length > 1 ? gap : 0), 0.001)
    const dash = usable * circumference.value
    const seg = {
      key: part.key,
      color: part.color,
      dashArray: `${dash} ${circumference.value - dash}`,
      dashOffset: -(offset * circumference.value),
    }
    offset += fraction
    return seg
  })
})
</script>

<template>
  <div
    class="relative shrink-0"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="`${summary.readiness}% audit ready. ${summary.passing} passing, ${summary.attention} need attention, ${summary.failing} failing.`"
  >
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="-rotate-90">
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        stroke="var(--muted)"
        :stroke-width="stroke"
      />
      <circle
        v-for="seg in segments"
        :key="seg.key"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="seg.color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="seg.dashArray"
        :stroke-dashoffset="seg.dashOffset"
        class="ring-segment"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
      <span class="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {{ summary.readiness }}%
      </span>
      <span class="text-sm text-muted-foreground">Audit ready</span>
    </div>
  </div>
</template>

<style scoped>
.ring-segment {
  transition:
    stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1),
    stroke-dasharray 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .ring-segment {
    transition: none;
  }
}
</style>
