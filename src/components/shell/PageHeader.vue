<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { PhCaretRight } from '@phosphor-icons/vue'
import { getModuleById } from '@/config/navigation'

const route = useRoute()

const moduleId = computed(() => route.meta.module as string | undefined)
const moduleLabel = computed(() =>
  moduleId.value ? (getModuleById(moduleId.value)?.label ?? '') : '',
)
const title = computed(() => (route.meta.title as string) ?? 'Page')
const description = computed(() => (route.meta.description as string) ?? '')
</script>

<template>
  <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="max-w-2xl">
      <nav
        v-if="moduleLabel"
        class="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <span>{{ moduleLabel }}</span>
        <PhCaretRight :size="12" class="opacity-60" aria-hidden="true" />
        <span class="font-medium text-foreground">{{ title }}</span>
      </nav>
      <h1 class="text-2xl font-semibold tracking-tight text-foreground text-balance sm:text-3xl">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-2 text-base leading-relaxed text-muted-foreground text-pretty"
      >
        {{ description }}
      </p>
    </div>

    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2 page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
/* Enforce strict design uniformity for any button placed in the page header actions slot */
.page-header-actions :deep(button),
.page-header-actions :deep([role='button']) {
  height: 2rem !important; /* h-8 */
  padding-left: 0.75rem !important; /* px-3 */
  padding-right: 0.75rem !important; /* px-3 */
  font-size: 0.75rem !important; /* text-xs */
  font-weight: 600 !important; /* font-semibold */
  gap: 0.375rem !important; /* gap-1.5 */
  border-radius: 0.375rem !important; /* rounded-md */
}

/* Enforce uniform icon size */
.page-header-actions :deep(button svg),
.page-header-actions :deep([role='button'] svg) {
  width: 0.9375rem !important; /* 15px */
  height: 0.9375rem !important; /* 15px */
}
</style>
