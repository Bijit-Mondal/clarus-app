import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import type { Editor } from '@tiptap/core'
import {
  buildReplacementNodes,
  extendDeleteRangesToSections,
} from '@/lib/documentAi/applySuggestion'
import { computeSuggestionRanges } from '@/lib/documentAi/computeSuggestionRanges'
import { buildPositionMap } from '@/lib/documentAi/positionMap'
import { markdownToTipTapJSON } from '@/lib/documentAi/policyMarkdown'
import {
  suggestionsPluginKey,
  type SuggestionsExtensionOptions,
} from '@/lib/documentAi/suggestionsExtension'
import type { SuggestionRange } from '@/lib/documentAi/suggestionTypes'
import { useDocumentAiSession } from '@/composables/useDocumentAi'

export function useDocumentSuggestions(editor: Ref<Editor | null | undefined>) {
  const session = useDocumentAiSession()
  const ranges = ref<SuggestionRange[]>([])
  const proposedMarkdown = ref<string | null>(null)
  const rangesRef = shallowRef<SuggestionRange[]>([])

  const pendingRanges = computed(() =>
    ranges.value.filter((r) => r.decision === 'pending' || r.decision === 'loading'),
  )
  const isActive = computed(() => pendingRanges.value.length > 0)

  function syncRangesRef() {
    rangesRef.value = ranges.value
  }

  function dispatchMeta() {
    const current = editor.value
    if (!current) return
    const { tr } = current.state
    const focusedId = pendingRanges.value[0]?.id ?? null
    tr.setMeta(suggestionsPluginKey, {
      ranges: ranges.value,
      focusedId,
    })
    current.view.dispatch(tr)
  }

  function lockEditorIfNeeded() {
    const current = editor.value
    if (!current) return
    if (pendingRanges.value.length > 0) {
      current.setEditable(false)
    } else if (!current.isEditable) {
      // Restore only if we locked it for suggestions — parent controls base editable
      current.setEditable(true)
    }
  }

  watch(
    ranges,
    () => {
      syncRangesRef()
      dispatchMeta()
      lockEditorIfNeeded()
      session.setSuggestionCount(pendingRanges.value.length)
    },
    { deep: true },
  )

  function getMarkdown(): string {
    const current = editor.value
    if (!current) return ''
    return buildPositionMap(current.state.doc).markdown
  }

  function applyProposal(markdown: string) {
    const current = editor.value
    if (!current) return

    proposedMarkdown.value = markdown
    const positionMap = buildPositionMap(current.state.doc)
    const initial = computeSuggestionRanges(positionMap, markdown)
    const extended = extendDeleteRangesToSections(current.state.doc, initial)
    ranges.value = extended
    syncRangesRef()
    dispatchMeta()

    // Scroll first change into view
    requestAnimationFrame(() => {
      const first = extended.find((r) => r.decision === 'pending')
      if (!first) return
      const el = current.view.dom.querySelector('.suggestion-change-group')
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  function applySectionSuggestion(range: SuggestionRange) {
    ranges.value = [range]
    proposedMarkdown.value = range.proposedText
    syncRangesRef()
    dispatchMeta()
  }

  function setSectionLoading(from: number, to: number, originalText: string) {
    ranges.value = [
      {
        id: `section-loading-${from}-${to}`,
        type: 'modify',
        from,
        to,
        segments: [],
        proposedText: '',
        originalText,
        decision: 'loading',
      },
    ]
    syncRangesRef()
    dispatchMeta()
  }

  function clearSuggestions() {
    ranges.value = []
    proposedMarkdown.value = null
    session.setPendingProposal(null)
    syncRangesRef()
    dispatchMeta()
    const current = editor.value
    if (current) current.setEditable(true)
  }

  function applyRangeToDoc(range: SuggestionRange) {
    const current = editor.value
    if (!current) return

    // Full-doc insert into empty editor
    if (range.type === 'insert' && !range.originalText && !getMarkdown().trim()) {
      const nodes = markdownToTipTapJSON(range.proposedText)
      current.commands.setContent({ type: 'doc', content: nodes })
      return
    }

    const { tr } = current.state
    if (range.type === 'delete') {
      tr.delete(range.from, range.to)
    } else if (range.type === 'insert') {
      const pmNodes = buildReplacementNodes(current.state, range.proposedText, range.to)
      if (pmNodes.length > 0) tr.insert(range.to, pmNodes)
    } else {
      const pmNodes = buildReplacementNodes(current.state, range.proposedText, range.from)
      if (pmNodes.length > 0) {
        tr.replaceWith(range.from, range.to, pmNodes)
      } else {
        tr.delete(range.from, range.to)
      }
    }
    current.view.dispatch(tr)
  }

  function accept(id: string) {
    const range = rangesRef.value.find((r) => r.id === id)
    if (!range || range.decision !== 'pending') return

    applyRangeToDoc(range)

    const remaining = rangesRef.value
      .filter((r) => r.id !== id && r.decision === 'pending')
      .map((r) => ({ ...r, decision: 'pending' as const }))

    // After apply, positions shift — recompute from remaining proposed doc if multi-hunk
    if (remaining.length > 0 && proposedMarkdown.value) {
      const positionMap = buildPositionMap(editor.value!.state.doc)
      // Rebuild proposed markdown by applying accepted change conceptually is hard;
      // for v1: clear remaining and keep only what user hasn't decided — recompute from original proposal
      const fresh = computeSuggestionRanges(positionMap, proposedMarkdown.value)
      const extended = extendDeleteRangesToSections(editor.value!.state.doc, fresh)
      ranges.value = extended
    } else {
      ranges.value = []
      proposedMarkdown.value = null
      session.setPendingProposal(null)
    }
    syncRangesRef()
    dispatchMeta()
    if (ranges.value.length === 0 && editor.value) {
      editor.value.setEditable(true)
    }
  }

  function reject(id: string) {
    const next = rangesRef.value.filter((r) => r.id !== id)
    ranges.value = next
    if (next.length === 0) {
      proposedMarkdown.value = null
      session.setPendingProposal(null)
      editor.value?.setEditable(true)
    }
    syncRangesRef()
    dispatchMeta()
  }

  function acceptAll() {
    const pending = [...rangesRef.value].filter((r) => r.decision === 'pending')
    // Accept from end to start so positions stay valid
    pending.sort((a, b) => b.from - a.from).forEach((range) => applyRangeToDoc(range))
    clearSuggestions()
  }

  function rejectAll() {
    clearSuggestions()
  }

  function getSelectionForEdit(): { from: number; to: number; text: string } | null {
    const current = editor.value
    if (!current) return null
    const { from, to, empty } = current.state.selection
    if (empty) return null
    const text = current.state.doc.textBetween(from, to, '\n\n')
    if (!text.trim()) return null
    return { from, to, text }
  }

  const extensionCallbacks: SuggestionsExtensionOptions = {
    onAccept: (id) => accept(id),
    onReject: (id) => reject(id),
  }

  return {
    ranges,
    pendingRanges,
    isActive,
    proposedMarkdown,
    getMarkdown,
    applyProposal,
    applySectionSuggestion,
    setSectionLoading,
    clearSuggestions,
    accept,
    reject,
    acceptAll,
    rejectAll,
    getSelectionForEdit,
    extensionCallbacks,
  }
}
