import { ref, watch, onBeforeUnmount, type ComputedRef } from 'vue'
import type { DocumentItem } from '@/composables/useDocuments'
import type { SaveStatus } from '@/components/compliance/document-detail/types'
import { isEmptyTiptapContent } from '@/lib/tiptapContent'

const AUTOSAVE_DELAY_MS = 1000
const AUTOSAVE_MAX_WAIT_MS = 5000

type WriteDocumentFn = (args: {
  documentId: string
  input: { title?: string; content?: string }
}) => Promise<unknown>

type AddActivityFn = (id: string, action: string, user?: string) => void

export function useDocumentAutosave(options: {
  documentId: ComputedRef<string>
  documentItem: ComputedRef<DocumentItem | undefined>
  writeDocument: WriteDocumentFn
  addActivity: AddActivityFn
}) {
  const { documentId, documentItem, writeDocument, addActivity } = options

  const draftTitle = ref('')
  const draftContent = ref('')
  const saveStatus = ref<SaveStatus>('saved')
  const isWriting = ref(false)
  const queuedUpdates = ref<{ title?: string; content?: string }>({})
  const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const maxWaitTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncedTitle = ref<string | null>(null)
  const lastSyncedContent = ref<string | null>(null)

  function hasUnsavedChanges() {
    if (!documentItem.value) return false
    return (
      draftTitle.value !== documentItem.value.title ||
      draftContent.value !== documentItem.value.content
    )
  }

  function clearAutosaveTimers() {
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
      debounceTimer.value = null
    }
    if (maxWaitTimer.value) {
      clearTimeout(maxWaitTimer.value)
      maxWaitTimer.value = null
    }
  }

  function buildPendingUpdates() {
    if (!documentItem.value || !hasUnsavedChanges()) return null
    const updates: { title?: string; content?: string } = {}
    if (draftTitle.value !== documentItem.value.title) updates.title = draftTitle.value
    if (draftContent.value !== documentItem.value.content) updates.content = draftContent.value
    return Object.keys(updates).length > 0 ? updates : null
  }

  async function flushWrite() {
    if (!documentItem.value || isWriting.value) return
    const updates = queuedUpdates.value
    if (Object.keys(updates).length === 0) return
    const previousTitle = documentItem.value.title
    queuedUpdates.value = {}
    isWriting.value = true
    saveStatus.value = 'saving'
    try {
      await writeDocument({
        documentId: documentItem.value.id,
        input: updates,
      })
      if (updates.title && updates.title !== previousTitle) {
        addActivity(documentItem.value.id, `Renamed from "${previousTitle}" to "${updates.title}"`)
      }
      saveStatus.value = hasUnsavedChanges() ? 'unsaved' : 'saved'
    } catch {
      saveStatus.value = 'error'
      queuedUpdates.value = { ...queuedUpdates.value, ...updates }
    } finally {
      isWriting.value = false
    }
  }

  function queueWrite(updates: { title?: string; content?: string }) {
    queuedUpdates.value = { ...queuedUpdates.value, ...updates }
    if (!isWriting.value) {
      void flushWrite()
    }
  }

  function runAutosave() {
    const updates = buildPendingUpdates()
    if (updates) {
      queueWrite(updates)
    }
  }

  function scheduleAutosave() {
    if (!hasUnsavedChanges()) {
      clearAutosaveTimers()
      return
    }
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
    }
    debounceTimer.value = setTimeout(() => {
      debounceTimer.value = null
      clearAutosaveTimers()
      runAutosave()
    }, AUTOSAVE_DELAY_MS)
    if (!maxWaitTimer.value) {
      maxWaitTimer.value = setTimeout(() => {
        maxWaitTimer.value = null
        if (debounceTimer.value) {
          clearTimeout(debounceTimer.value)
          debounceTimer.value = null
        }
        runAutosave()
      }, AUTOSAVE_MAX_WAIT_MS)
    }
  }

  function flushAutosave() {
    if (debounceTimer.value || maxWaitTimer.value) {
      clearAutosaveTimers()
      runAutosave()
    }
  }

  function hasLocalEditsSinceSync() {
    return (
      draftTitle.value !== lastSyncedTitle.value || draftContent.value !== lastSyncedContent.value
    )
  }

  function syncDraftFromDocument() {
    const doc = documentItem.value
    if (!doc) return
    draftTitle.value = doc.title
    draftContent.value = doc.content
    saveStatus.value = 'saved'
    lastSyncedTitle.value = doc.title
    lastSyncedContent.value = doc.content
  }

  async function ensureDocumentSaved() {
    clearAutosaveTimers()
    const updates = buildPendingUpdates()
    if (updates) queueWrite(updates)
    await flushWrite()
  }

  watch([draftTitle, draftContent], () => {
    if (saveStatus.value === 'saving') {
      scheduleAutosave()
      return
    }
    saveStatus.value = hasUnsavedChanges() ? 'unsaved' : 'saved'
    scheduleAutosave()
  })

  watch(documentId, (newId, oldId) => {
    if (newId === oldId) return
    lastSyncedTitle.value = null
    lastSyncedContent.value = null
    clearAutosaveTimers()
    queuedUpdates.value = {}
  })

  watch(
    () => [documentItem.value?.id, documentItem.value?.title, documentItem.value?.content] as const,
    ([id, , content]) => {
      if (!id || id !== documentId.value || content === undefined) return
      if (lastSyncedContent.value === null || !hasLocalEditsSinceSync()) {
        syncDraftFromDocument()
        return
      }
      // TipTap can normalize '' → empty JSON before cached detail content rehydrates.
      // Don't treat that as a user edit that blocks applying real server content.
      if (
        !isEmptyTiptapContent(content) &&
        isEmptyTiptapContent(draftContent.value) &&
        isEmptyTiptapContent(lastSyncedContent.value)
      ) {
        syncDraftFromDocument()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    flushAutosave()
    clearAutosaveTimers()
  })

  return {
    draftTitle,
    draftContent,
    saveStatus,
    flushAutosave,
    ensureDocumentSaved,
  }
}
