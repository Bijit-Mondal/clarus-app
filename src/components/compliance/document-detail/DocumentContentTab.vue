<script setup lang="ts">
import DocumentEditor from '@/components/compliance/DocumentEditor.vue'
import type { DocumentItem } from '@/composables/useDocuments'
import type { SaveStatus } from '@/components/compliance/document-detail/types'

defineProps<{
  document: DocumentItem
  documentId: string
  draftTitle: string
  draftContent: string
  saveStatus: SaveStatus
  downloadUserEmail: string
}>()

const emit = defineEmits<{
  'update:draftContent': [value: string]
  blur: []
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
      <div class="flex items-center gap-2 text-muted-foreground" aria-live="polite">
        <div
          class="size-2 rounded-full ring-2 ring-background"
          :class="
            saveStatus === 'saved'
              ? 'bg-success'
              : saveStatus === 'saving'
                ? 'animate-pulse bg-warning'
                : saveStatus === 'error'
                  ? 'bg-destructive'
                  : 'bg-muted'
          "
        />
        <span v-if="saveStatus === 'saved'">All changes saved</span>
        <span v-else-if="saveStatus === 'saving'">Saving changes…</span>
        <span v-else-if="saveStatus === 'error'">Save failed</span>
        <span v-else>Unsaved changes</span>
      </div>
      <span class="text-muted-foreground/70">Autosaves as you type · Select text to edit with AI</span>
    </div>

    <DocumentEditor
      :key="documentId"
      :model-value="draftContent"
      :title="draftTitle"
      :version="document.version"
      :download-user-email="downloadUserEmail"
      :download-filename="`${document.title.replace(/[^a-z0-9]/gi, '_')}_v${document.version}.pdf`"
      enable-ai
      :document-id="documentId"
      @update:model-value="emit('update:draftContent', $event)"
      @blur="emit('blur')"
    />
  </div>
</template>
