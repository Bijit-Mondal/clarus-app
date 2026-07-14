<script setup lang="ts">
import { ref, onMounted } from 'vue'

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

const animate = ref(false)

onMounted(() => {
  animate.value = true
})
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
      class="tick-path"
      :class="{ 'tick-draw': animate }"
    />
  </svg>
</template>

<style scoped>
.tick-path {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
}

.tick-draw {
  animation: tick-draw 4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes tick-draw {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
