<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { LinkItem } from './types'

const props = defineProps<{
  isOpen: boolean
  label: string
  icon: unknown
  searchPlaceholder: string
  availableItems: LinkItem[]
  linkedItemIds: string[]
  isLoading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'link', item: LinkItem): void
  (e: 'search-query', query: string): void
}>()

const searchQuery = ref('')

// Reset search query when dialog is closed
watch(
  () => props.isOpen,
  (val) => {
    if (!val) {
      searchQuery.value = ''
    }
  },
)

const filteredItems = computed(() => {
  if (props.isLoading || props.error || searchQuery.value.trim()) return props.availableItems
  return props.availableItems
})

watch(searchQuery, (query) => {
  emit('search-query', query)
})
</script>

<template>
  <Dialog :open="isOpen" @update:open="(v) => !v && emit('close')">
    <DialogContent
      class="flex max-h-[min(36rem,calc(100vh-4rem))] flex-col gap-0 p-0 sm:max-w-lg overflow-hidden"
    >
      <DialogHeader class="shrink-0 border-b border-border px-5 py-4">
        <DialogTitle class="flex items-center gap-2 text-base">
          <component :is="icon" :size="18" class="text-muted-foreground" aria-hidden="true" />
          Link {{ label }}
        </DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          Search and select {{ label.toLowerCase() }} to link to this requirement.
        </DialogDescription>
      </DialogHeader>

      <!-- Search bar -->
      <div class="shrink-0 border-b border-border px-4 py-3">
        <div class="relative">
          <PhMagnifyingGlass
            :size="16"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            v-model="searchQuery"
            :placeholder="searchPlaceholder"
            class="pl-9"
            type="search"
            autocomplete="off"
          />
        </div>
      </div>

      <!-- Results list -->
      <div class="clarus-scroll min-h-0 flex-1 overflow-y-auto">
        <ul role="list" class="divide-y divide-border">
          <li
            v-for="item in filteredItems"
            :key="item.id"
            class="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-foreground">{{ item.name }}</p>
              <p class="mt-0.5 truncate text-xs text-muted-foreground">
                <template v-if="item.type">{{ item.type }} · </template>
                <template v-if="item.source">{{ item.source }} · </template>
                <template v-if="item.area">{{ item.area }} · </template>
                {{ item.state }}
              </p>
            </div>
            <Button
              size="sm"
              :variant="linkedItemIds.includes(item.id) ? 'secondary' : 'outline'"
              class="shrink-0 text-xs"
              @click="emit('link', item)"
            >
              {{ linkedItemIds.includes(item.id) ? 'Linked' : 'Link' }}
            </Button>
          </li>
          <li
            v-if="isLoading"
            class="px-5 py-8 text-center text-sm text-muted-foreground"
          >
            Searching controls…
          </li>
          <li
            v-else-if="error"
            class="px-5 py-8 text-center text-sm text-destructive"
          >
            {{ error }}
          </li>
          <li
            v-else-if="!availableItems.length"
            class="px-5 py-8 text-center text-sm text-muted-foreground"
          >
            {{ searchQuery.trim() ? `No results for "${searchQuery}"` : 'Type to search controls.' }}
          </li>
        </ul>
      </div>

      <DialogFooter class="shrink-0 border-t border-border px-5 py-3">
        <Button variant="outline" @click="emit('close')">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
