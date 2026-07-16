<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PhCheckCircle, PhClock, PhCircle, PhWarningCircle } from '@phosphor-icons/vue'
import type { Requirement } from './types'

const props = defineProps<{
  requirement: Requirement
}>()

const isExpanded = ref(false)

const maturityConfig = computed(() => {
  const status = props.requirement.maturityLevel.toLowerCase()
  if (
    status.includes('complete') ||
    status.includes('implemented') ||
    status.includes('approved')
  ) {
    return {
      label: props.requirement.maturityLevel,
      icon: PhCheckCircle,
      className: 'border-success/25 bg-success/10 text-success-emphasis',
    }
  }
  if (status.includes('progress') || status.includes('review')) {
    return {
      label: props.requirement.maturityLevel,
      icon: PhClock,
      className: 'border-warning/30 bg-warning/10 text-warning-emphasis',
    }
  }
  if (status.includes('fail') || status.includes('gap')) {
    return {
      label: props.requirement.maturityLevel,
      icon: PhWarningCircle,
      className: 'border-destructive/25 bg-destructive/10 text-destructive',
    }
  }
  return {
    label: props.requirement.maturityLevel || 'Not assessed',
    icon: PhCircle,
    className: 'border-border bg-muted/60 text-muted-foreground',
  }
})

watch(
  () => props.requirement?.id,
  () => {
    isExpanded.value = false
  },
)
</script>

<template>
  <div class="border-b border-border px-6 py-6 lg:px-8">
    <span
      class="mb-3 inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary"
    >
      {{ requirement.code }}
    </span>
    <h2 v-if="requirement.title" class="mt-2 text-xl font-semibold tracking-tight text-foreground">
      {{ requirement.title }}
    </h2>
    <p
      v-if="requirement.description"
      class="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty"
      :class="{ 'line-clamp-3': !isExpanded }"
    >
      {{ requirement.description }}
    </p>
    <p v-else class="mt-3 text-sm italic text-muted-foreground">No description provided.</p>
    <button
      v-if="requirement.description && requirement.description.length > 240"
      type="button"
      class="mt-2 text-xs font-semibold text-primary hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:underline"
      @click="isExpanded = !isExpanded"
    >
      {{ isExpanded ? 'Show less' : 'Show more' }}
    </button>

    <!-- Inline metadata chips -->
    <div class="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-muted-foreground">Maturity level</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold"
          :class="maturityConfig.className"
        >
          <component :is="maturityConfig.icon" :size="13" weight="bold" aria-hidden="true" />
          {{ maturityConfig.label }}
        </span>
      </div>
    </div>
  </div>
</template>
