import { computed, onBeforeUnmount, ref, shallowRef, type Ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useMutation } from '@tanstack/vue-query'
import {
  chatDocumentAi,
  editDocumentAiSection,
  type DocumentAiChatHistoryTurn,
  type DocumentAiChatResponse,
  type DocumentAiProposal,
  type DocumentAiSectionResponse,
} from '@/api/documentAi'
import { useOrganizationStore } from '@/stores/organization'
import type { SuggestionRange } from '@/lib/documentAi/suggestionTypes'

export type DocumentAiEditorBridge = {
  getMarkdown: () => string
  applyProposal: (markdown: string) => void
  applySectionSuggestion: (range: SuggestionRange) => void
  setSectionLoading: (from: number, to: number, originalText: string) => void
  clearSuggestions: () => void
  getSelectionForEdit: () => { from: number; to: number; text: string } | null
}

/**
 * Shared bridge between Document Detail (editor) and Helix (ClarusAiPanel).
 * Only active while a document content tab has registered.
 */
export const useDocumentAiSession = createSharedComposable(() => {
  const documentId = ref<string | null>(null)
  const documentTitle = ref<string>('')
  const bridge = shallowRef<DocumentAiEditorBridge | null>(null)
  const pendingProposal = ref<DocumentAiProposal | null>(null)
  const suggestionCount = ref(0)

  const isActive = computed(() => !!documentId.value && !!bridge.value)

  function register(options: {
    documentId: string
    documentTitle?: string
    bridge: DocumentAiEditorBridge
  }) {
    documentId.value = options.documentId
    documentTitle.value = options.documentTitle ?? ''
    bridge.value = options.bridge
  }

  function unregister(id?: string) {
    if (id && documentId.value !== id) return
    documentId.value = null
    documentTitle.value = ''
    bridge.value = null
    pendingProposal.value = null
    suggestionCount.value = 0
  }

  function setSuggestionCount(count: number) {
    suggestionCount.value = count
  }

  function setPendingProposal(proposal: DocumentAiProposal | null) {
    pendingProposal.value = proposal
  }

  return {
    documentId,
    documentTitle,
    bridge,
    pendingProposal,
    suggestionCount,
    isActive,
    register,
    unregister,
    setSuggestionCount,
    setPendingProposal,
  }
})

export function useDocumentAiChatMutation() {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: (input: {
      documentId: string
      message: string
      currentContent?: string
      history?: DocumentAiChatHistoryTurn[]
    }) => {
      if (!tenantId.value) throw new Error('No active organization')
      return chatDocumentAi(tenantId.value, input.documentId, {
        message: input.message,
        currentContent: input.currentContent,
        history: input.history,
      })
    },
  })
}

export function useDocumentAiSectionMutation() {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: (input: {
      documentId: string
      sectionText: string
      instruction: string
    }) => {
      if (!tenantId.value) throw new Error('No active organization')
      return editDocumentAiSection(tenantId.value, input.documentId, {
        sectionText: input.sectionText,
        instruction: input.instruction,
      })
    },
  })
}

/** Register document AI session for the lifetime of the calling component. */
export function useRegisterDocumentAiSession(options: {
  documentId: Ref<string>
  documentTitle: Ref<string>
  bridge: Ref<DocumentAiEditorBridge | null>
}) {
  const session = useDocumentAiSession()

  function sync() {
    if (options.bridge.value && options.documentId.value) {
      session.register({
        documentId: options.documentId.value,
        documentTitle: options.documentTitle.value,
        bridge: options.bridge.value,
      })
    } else {
      session.unregister(options.documentId.value)
    }
  }

  sync()

  onBeforeUnmount(() => {
    session.unregister(options.documentId.value)
  })

  return { sync, session }
}

export type { DocumentAiChatResponse, DocumentAiProposal, DocumentAiSectionResponse }
