<script setup lang="ts">
import type { DocumentTab } from '@/components/compliance/document-detail/types'

defineProps<{
  tabs: ReadonlyArray<{ id: DocumentTab; label: string; count: number }>
  activeTab: DocumentTab
}>()

const emit = defineEmits<{
  'update:activeTab': [tab: DocumentTab]
}>()
</script>

<template>
  <div
    class="scrollbar-none flex overflow-x-auto border-b border-border"
    role="tablist"
    aria-label="Document sections"
  >
    <button
      v-for="t in tabs"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="activeTab === t.id"
      class="relative whitespace-nowrap px-4 pb-3 text-sm font-medium transition-colors focus-visible:outline-none"
      :class="
        activeTab === t.id
          ? 'font-semibold text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      "
      @click="emit('update:activeTab', t.id)"
    >
      {{ t.label }}
      <span
        v-if="t.count > 0"
        class="ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
        :class="
          activeTab === t.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        "
      >
        {{ t.count }}
      </span>
      <span
        v-if="activeTab === t.id"
        class="absolute inset-x-0 bottom-0 h-[2px] rounded-t bg-primary"
      />
    </button>
  </div>
</template>
