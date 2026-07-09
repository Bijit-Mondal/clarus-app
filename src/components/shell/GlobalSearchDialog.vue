<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const open = defineModel<boolean>('open', { default: false })

const query = ref('')
const inputId = 'global-search-input'

function focusInput() {
  nextTick(() => {
    document.getElementById(inputId)?.focus()
  })
}

function onOpenChange(value: boolean) {
  open.value = value
  if (value) {
    query.value = ''
    focusInput()
  }
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
  event.preventDefault()
  open.value = !open.value
  if (open.value) focusInput()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="gap-0 overflow-hidden p-0 sm:max-w-lg" :show-close-button="false">
      <DialogHeader class="sr-only">
        <DialogTitle>Search</DialogTitle>
        <DialogDescription>
          Search controls, evidence, findings, and pages across Clarus.
        </DialogDescription>
      </DialogHeader>

      <div class="flex items-center gap-3 border-b border-border px-4">
        <PhMagnifyingGlass
          :size="18"
          class="shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          :id="inputId"
          v-model="query"
          type="search"
          placeholder="Search controls, evidence, findings…"
          class="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          autocomplete="off"
          @keydown.escape="open = false"
        />
      </div>

      <div class="px-4 py-8 text-center">
        <p class="text-sm text-muted-foreground text-pretty">
          {{
            query.trim()
              ? 'Search results will appear here once indexing is connected.'
              : 'Type to search across your workspace.'
          }}
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
