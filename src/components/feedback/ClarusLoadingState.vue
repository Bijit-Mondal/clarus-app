<script setup lang="ts">
import { PhCircleNotch } from '@phosphor-icons/vue'

withDefaults(
  defineProps<{
    variant:
      | 'requirements-sidebar'
      | 'requirements-detail'
      | 'control-links'
      | 'table-rows'
      | 'control-header'
      | 'framework-cards'
      | 'compact'
    label?: string
    rows?: number
  }>(),
  {
    label: 'Loading…',
    rows: 3,
  },
)
</script>

<template>
  <!-- Grouped requirement list skeleton -->
  <div
    v-if="variant === 'requirements-sidebar'"
    class="py-1"
    role="status"
    :aria-label="label"
  >
    <div v-for="group in 2" :key="group" class="py-2">
      <div class="mx-4 mb-2 h-2 w-14 rounded bg-muted/70" />
      <div
        v-for="item in 3"
        :key="`${group}-${item}`"
        class="border-l-2 border-transparent px-4 py-2.5"
        :class="{ 'border-primary/25': item === 1 && group === 1 }"
      >
        <div class="flex items-start gap-2">
          <div class="h-5 w-11 shrink-0 rounded bg-primary/10" />
          <div class="min-w-0 flex-1 space-y-1.5">
            <div
              class="h-3 rounded bg-muted"
              :class="item === 1 ? 'w-4/5' : 'w-3/5'"
            />
            <div class="h-2.5 w-full rounded bg-muted/50" />
          </div>
        </div>
      </div>
    </div>
    <span class="sr-only">{{ label }}</span>
  </div>

  <!-- Requirement detail panel skeleton -->
  <div
    v-else-if="variant === 'requirements-detail'"
    class="space-y-6 p-6 lg:p-8"
    role="status"
    :aria-label="label"
  >
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <div class="h-6 w-16 rounded bg-primary/10" />
        <div class="h-5 w-24 rounded-full bg-muted/70" />
      </div>
      <div class="h-7 w-2/3 max-w-md rounded bg-muted" />
      <div class="space-y-2 pt-1">
        <div class="h-3.5 w-full rounded bg-muted/60" />
        <div class="h-3.5 w-11/12 rounded bg-muted/50" />
        <div class="h-3.5 w-4/5 rounded bg-muted/40" />
      </div>
    </div>
    <div class="space-y-3 border-t border-border pt-5">
      <div class="flex gap-4 border-b border-border pb-3">
        <div v-for="tab in 4" :key="tab" class="h-4 w-16 rounded bg-muted/60" />
      </div>
      <div
        v-for="row in rows"
        :key="row"
        class="flex items-center gap-4 rounded-lg border border-border/60 bg-card px-4 py-3.5"
      >
        <div class="h-4 w-14 rounded bg-muted/70" />
        <div class="h-4 flex-1 rounded bg-muted/50" />
        <div class="h-5 w-20 rounded-full bg-primary/10" />
      </div>
    </div>
    <span class="sr-only">{{ label }}</span>
  </div>

  <!-- Linked controls table skeleton -->
  <div
    v-else-if="variant === 'control-links'"
    class="divide-y divide-border/50"
    role="status"
    :aria-label="label"
  >
    <div
      v-for="row in rows"
      :key="row"
      class="flex items-center gap-4 px-4 py-3.5"
    >
      <div class="h-8 w-1 shrink-0 rounded-full bg-primary/35" />
      <div class="h-4 flex-1 rounded bg-muted/60" />
      <div class="h-5 w-24 rounded-full bg-primary/10" />
      <div class="h-5 w-20 rounded-full bg-muted/70" />
    </div>
    <span class="sr-only">{{ label }}</span>
  </div>

  <!-- Data table row skeleton -->
  <div
    v-else-if="variant === 'table-rows'"
    class="divide-y divide-border/50"
    role="status"
    :aria-label="label"
  >
    <div
      v-for="row in rows"
      :key="row"
      class="grid grid-cols-6 gap-4 px-5 py-4"
    >
      <div class="col-span-2 space-y-2">
        <div class="h-2.5 w-14 rounded bg-muted/70" />
        <div class="h-4 w-4/5 rounded bg-muted" />
        <div class="h-2.5 w-28 rounded bg-muted/50" />
      </div>
      <div class="h-4 w-16 self-center rounded bg-muted/60" />
      <div class="flex items-center gap-2 self-center">
        <div class="size-6 rounded-full bg-muted/70" />
        <div class="h-3.5 w-20 rounded bg-muted/50" />
      </div>
      <div class="h-5 w-24 self-center rounded-full bg-primary/10" />
      <div class="h-4 w-10 self-center rounded bg-muted/40" />
    </div>
    <span class="sr-only">{{ label }}</span>
  </div>

  <!-- Control detail header skeleton -->
  <div
    v-else-if="variant === 'control-header'"
    class="space-y-6"
    role="status"
    :aria-label="label"
  >
    <div class="flex items-center gap-2">
      <div class="h-3 w-14 rounded bg-muted/60" />
      <div class="h-3 w-3 rounded bg-muted/40" />
      <div class="h-3 w-16 rounded bg-muted/70" />
    </div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex-1 space-y-3">
        <div class="flex items-center gap-3">
          <div class="h-6 w-16 rounded border border-border bg-muted/60" />
          <div class="h-6 w-24 rounded-full bg-primary/10" />
        </div>
        <div class="h-8 w-2/3 max-w-lg rounded bg-muted" />
        <div class="space-y-2">
          <div class="h-3.5 w-full max-w-2xl rounded bg-muted/60" />
          <div class="h-3.5 w-4/5 max-w-xl rounded bg-muted/50" />
        </div>
      </div>
      <div class="flex gap-2">
        <div class="h-8 w-16 rounded-md bg-muted/70" />
        <div class="h-8 w-32 rounded-md bg-muted/60" />
        <div class="size-8 rounded-md bg-muted/50" />
      </div>
    </div>
    <div class="flex flex-wrap gap-4">
      <div v-for="meta in 3" :key="meta" class="h-3 w-28 rounded bg-muted/50" />
    </div>
    <div class="flex gap-2 border-b border-border pb-3">
      <div v-for="tab in 6" :key="tab" class="h-8 w-24 rounded-md bg-muted/40" />
    </div>
    <div class="rounded-lg border border-border bg-card p-5">
      <div class="divide-y divide-border/50">
        <div
          v-for="row in 2"
          :key="row"
          class="grid grid-cols-6 gap-4 px-5 py-4"
        >
          <div class="col-span-2 space-y-2">
            <div class="h-2.5 w-14 rounded bg-muted/70" />
            <div class="h-4 w-4/5 rounded bg-muted" />
          </div>
          <div class="h-4 w-16 self-center rounded bg-muted/60" />
          <div class="h-5 w-24 self-center rounded-full bg-primary/10" />
          <div class="h-4 w-10 self-center rounded bg-muted/40" />
          <div class="h-4 w-10 self-center rounded bg-muted/40" />
        </div>
      </div>
    </div>
    <span class="sr-only">{{ label }}</span>
  </div>

  <!-- Framework card grid skeleton -->
  <div
    v-else-if="variant === 'framework-cards'"
    class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    role="status"
    :aria-label="label"
  >
    <div
      v-for="card in rows"
      :key="card"
      class="overflow-hidden rounded-lg border border-border bg-card"
    >
      <div class="flex items-start justify-between p-5 pb-3">
        <div class="size-14 rounded-md bg-primary/8" />
        <div class="size-8 rounded-md bg-muted/50" />
      </div>
      <div class="space-y-2 px-5 pb-5">
        <div class="h-5 w-3/5 rounded bg-muted" />
        <div class="h-3 w-2/5 rounded bg-muted/60" />
        <div class="mt-3 h-3 w-24 rounded bg-muted/40" />
      </div>
    </div>
    <span class="sr-only">{{ label }}</span>
  </div>

  <!-- Compact inline loader -->
  <div
    v-else
    class="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground"
    role="status"
    :aria-label="label"
  >
    <PhCircleNotch :size="14" class="animate-spin text-primary" aria-hidden="true" />
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
[class*='bg-muted'],
[class*='bg-primary'] {
  animation: clarus-shimmer 1.6s ease-in-out infinite;
}

@keyframes clarus-shimmer {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
</style>
