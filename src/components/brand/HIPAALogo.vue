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
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 60 60"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="30" cy="30" r="27.5" fill="none" stroke="currentColor" />
    <path
      d="M30 10v40M18 22c5 0 5 8 12 8s7-8 12-8M18 38c5 0 5-8 12-8s7 8 12 8"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-width="1.5"
    />
    <circle cx="30" cy="16" r="3" fill="none" stroke="currentColor" />
    <text
      x="30"
      y="52"
      fill="currentColor"
      font-family="Arial, sans-serif"
      font-size="7"
      font-weight="700"
      text-anchor="middle"
    >
      HIPAA
    </text>
  </svg>
</template>
