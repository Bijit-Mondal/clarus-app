<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Requirement } from './types'

const props = defineProps<{
  requirement: Requirement
}>()

const isExpanded = ref(false)

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
      class="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty"
      :class="{ 'line-clamp-3': !isExpanded }"
    >
      {{ requirement.description }}
    </p>
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
      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-muted-foreground">Best Practice</span>
        <span
          class="text-sm font-medium"
          :class="requirement.bestPractice ? 'text-success' : 'text-foreground'"
        >
          {{ requirement.bestPractice ? 'Yes' : 'No' }}
        </span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-muted-foreground">Maturity level</span>
        <span class="text-sm font-medium text-foreground">{{ requirement.maturityLevel }}</span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-muted-foreground">Category</span>
        <span class="text-sm font-medium text-foreground">{{ requirement.category }}</span>
      </div>
    </div>
  </div>
</template>
