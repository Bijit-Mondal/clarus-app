<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number
  }>(),
  {
    size: 60,
  },
)
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 60 60" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="28" fill="none" stroke="currentColor" stroke-width="2" />
    <path d="M30 2v17m0 21v18M2 30h9m38 0h9M17 19c3-10 7-16 13-16s10 6 13 16M17 40c3 10 7 17 13 17s10-7 13-17" fill="none" stroke="currentColor" stroke-width="1" />
    <text x="30" y="28" fill="currentColor" font-family="Arial, sans-serif" font-size="10" font-weight="700" text-anchor="middle">ISO</text>
    <text x="30" y="38" fill="currentColor" font-family="Arial, sans-serif" font-size="7" text-anchor="middle">27001</text>
  </svg>
</template>
