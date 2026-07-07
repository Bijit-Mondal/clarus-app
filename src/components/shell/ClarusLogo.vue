<script setup lang="ts">
/**
 * Clarus logomark — an open verification ring with an integrated
 * checkmark tail, drawn as a single continuous gesture. The ring reads
 * as focus/clarity (an aperture, a frame); the tail resolves it into a
 * confirmed, verified state. Two-tone by default (ink ring, mint tail);
 * `tone="mono"` collapses both strokes to currentColor for use on a
 * solid brand-color tile.
 */
withDefaults(
  defineProps<{
    size?: number
    tone?: 'duo' | 'mono'
  }>(),
  {
    size: 24,
    tone: 'duo',
  },
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M31 36.12A14 14 0 1 0 17 36.12"
      stroke="currentColor"
      stroke-width="5"
      stroke-linecap="round"
    />
    <path
      d="M18 34L23 39L32 27"
      :stroke="tone === 'duo' ? 'var(--primary)' : 'currentColor'"
      stroke-width="5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
