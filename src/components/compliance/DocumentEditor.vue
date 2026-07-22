<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Editor as TiptapCoreEditor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import {
  PhArrowClockwise,
  PhArrowCounterClockwise,
  PhColumns,
  PhColumnsPlusLeft,
  PhColumnsPlusRight,
  PhCode,
  PhDownloadSimple,
  PhFileText,
  PhLink,
  PhListBullets,
  PhListNumbers,
  PhMagicWand,
  PhRowsPlusBottom,
  PhRowsPlusTop,
  PhRows,
  PhSparkle,
  PhTable,
  PhTextAlignCenter,
  PhTextAlignLeft,
  PhTextAlignRight,
  PhTextBolder,
  PhTextH,
  PhTextItalic,
  PhTextStrikethrough,
  PhTextUnderline,
  PhTrash,
} from '@phosphor-icons/vue'
import { tiptapTextAlignExtension } from '@/lib/tiptapTextAlign'
import { downloadElementAsPdf } from '@/lib/downloadPdf'
import { pdfLightThemeStyle } from '@/lib/pdfTheme'
import { buildPdfWatermarkPattern, buildDownloadStamp } from '@/lib/pdfWatermark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  parseTiptapContent,
  serializeTiptapContent,
  isEmptyTiptapContent,
  type TiptapDocument,
} from '@/lib/tiptapContent'
import { SuggestionsExtension } from '@/lib/documentAi/suggestionsExtension'
import { useDocumentSuggestions } from '@/composables/useDocumentSuggestions'
import { useDocumentAiSectionMutation, useDocumentAiSession } from '@/composables/useDocumentAi'
import { useClarusAi } from '@/composables/useClarusAi'
import { getApiErrorMessage } from '@/lib/api'
import type { SuggestionRange } from '@/lib/documentAi/suggestionTypes'

const props = withDefaults(
  defineProps<{
    modelValue: string
    editable?: boolean
    previewOnly?: boolean
    title?: string
    version?: string
    downloadUserEmail?: string
    downloadFilename?: string
    /** Enable Helix policy writer (suggestions + selection edit). */
    enableAi?: boolean
    documentId?: string
  }>(),
  { editable: true, previewOnly: false, enableAi: false },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
}>()

const viewMode = ref<'editor' | 'pdf'>(props.previewOnly ? 'pdf' : 'editor')
const isLinkDialogOpen = ref(false)
const linkUrl = ref('')
const pdfPageRef = ref<HTMLElement | null>(null)
const isDownloadingPdf = ref(false)
const pdfDownloadStamp = ref<string | null>(null)
const canvasRef = ref<HTMLElement | null>(null)

const selectionMenu = ref<{ top: number; left: number } | null>(null)
const isSectionPromptOpen = ref(false)
const sectionInstruction = ref('')
const sectionEditError = ref<string | null>(null)
const sectionSelection = ref<{ from: number; to: number; text: string } | null>(null)

const aiSession = useDocumentAiSession()
const { openPanel } = useClarusAi()
const sectionMutation = useDocumentAiSectionMutation()

const suggestionHandlers = {
  onAccept: (_id: string) => {},
  onReject: (_id: string) => {},
}

const pdfWatermarkBackground = computed(() =>
  props.downloadUserEmail
    ? {
        backgroundImage: buildPdfWatermarkPattern(props.downloadUserEmail),
        backgroundSize: '300px 170px',
      }
    : undefined,
)

const isEmptyDoc = computed(() => isEmptyTiptapContent(props.modelValue))

const editor = useEditor({
  content: parseTiptapContent(props.modelValue),
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        HTMLAttributes: { class: 'tiptap-link' },
      },
    }),
    TableKit,
    tiptapTextAlignExtension,
    ...(props.enableAi
      ? [
          SuggestionsExtension.configure({
            onAccept: (id) => suggestionHandlers.onAccept(id),
            onReject: (id) => suggestionHandlers.onReject(id),
          }),
        ]
      : []),
  ],
  editable: props.editable && !props.previewOnly,
  editorProps: {
    attributes: {
      'aria-label': 'Document content',
      spellcheck: 'true',
    },
  },
  onUpdate: ({ editor: currentEditor }) => {
    emit('update:modelValue', serializeTiptapContent(currentEditor.getJSON() as TiptapDocument))
  },
  onBlur: () => {
    emit('blur')
  },
  onSelectionUpdate: ({ editor: currentEditor }) => {
    if (!props.enableAi || viewMode.value !== 'editor') {
      selectionMenu.value = null
      return
    }
    updateSelectionMenu(currentEditor)
  },
})

const suggestions = useDocumentSuggestions(editor)
suggestionHandlers.onAccept = suggestions.accept
suggestionHandlers.onReject = suggestions.reject

const {
  isActive: aiSuggestionsActive,
  pendingRanges: aiPendingRanges,
  acceptAll: acceptAllSuggestions,
  rejectAll: rejectAllSuggestions,
  getSelectionForEdit,
  setSectionLoading,
  applySectionSuggestion,
  clearSuggestions,
  getMarkdown,
  applyProposal,
} = suggestions

const isSectionPending = computed(() => sectionMutation.isPending.value)

function updateSelectionMenu(currentEditor: TiptapCoreEditor) {
  if (aiSuggestionsActive.value || sectionMutation.isPending.value) {
    selectionMenu.value = null
    return
  }
  const { from, to, empty } = currentEditor.state.selection
  if (empty || !currentEditor.isEditable) {
    selectionMenu.value = null
    return
  }
  const text = currentEditor.state.doc.textBetween(from, to, '\n\n').trim()
  if (!text) {
    selectionMenu.value = null
    return
  }
  try {
    const start = currentEditor.view.coordsAtPos(from)
    const end = currentEditor.view.coordsAtPos(to)
    const canvasRect = canvasRef.value?.getBoundingClientRect()
    if (!canvasRect) {
      selectionMenu.value = null
      return
    }
    selectionMenu.value = {
      top: Math.min(start.top, end.top) - canvasRect.top - 44,
      left: (start.left + end.left) / 2 - canvasRect.left,
    }
  } catch {
    selectionMenu.value = null
  }
}

function openSectionPrompt() {
  const sel = getSelectionForEdit()
  if (!sel) return
  sectionSelection.value = sel
  sectionInstruction.value = ''
  sectionEditError.value = null
  isSectionPromptOpen.value = true
  selectionMenu.value = null
}

async function submitSectionEdit() {
  const instruction = sectionInstruction.value.trim()
  const sel = sectionSelection.value
  if (!instruction || !sel || !props.documentId) return

  sectionEditError.value = null
  isSectionPromptOpen.value = false
  setSectionLoading(sel.from, sel.to, sel.text)

  try {
    const result = await sectionMutation.mutateAsync({
      documentId: props.documentId,
      sectionText: sel.text,
      instruction,
    })
    const range: SuggestionRange = {
      id: `section-${sel.from}-${sel.to}`,
      type: 'modify',
      from: sel.from,
      to: sel.to,
      segments: [],
      proposedText: result.content.trim(),
      originalText: sel.text,
      decision: 'pending',
    }
    applySectionSuggestion(range)
  } catch (error) {
    clearSuggestions()
    sectionEditError.value = getApiErrorMessage(error, 'Couldn’t rewrite this section. Try again.')
  } finally {
    sectionSelection.value = null
  }
}

function registerAiSession() {
  if (!props.enableAi || !props.documentId) {
    aiSession.unregister(props.documentId)
    return
  }
  aiSession.register({
    documentId: props.documentId,
    documentTitle: props.title ?? '',
    bridge: {
      getMarkdown,
      applyProposal: (markdown) => {
        aiSession.setPendingProposal({
          content: markdown,
          summary: '',
          title: '',
          detail: '',
          reviewHint: 'Review the proposal in the editor.',
          contentLength: markdown.length,
          complete: true,
        })
        applyProposal(markdown)
      },
      applySectionSuggestion,
      setSectionLoading,
      clearSuggestions,
      getSelectionForEdit,
    },
  })
}

onMounted(() => {
  registerAiSession()
})

watch(
  () => [props.enableAi, props.documentId, props.title] as const,
  () => registerAiSession(),
)

watch(editor, () => registerAiSession())

const headingLevel = computed(() => {
  if (editor.value?.isActive('heading', { level: 1 })) return 'Heading 1'
  if (editor.value?.isActive('heading', { level: 2 })) return 'Heading 2'
  if (editor.value?.isActive('heading', { level: 3 })) return 'Heading 3'
  return 'Paragraph'
})

const headingValue = computed(() => {
  if (editor.value?.isActive('heading', { level: 1 })) return 1
  if (editor.value?.isActive('heading', { level: 2 })) return 2
  if (editor.value?.isActive('heading', { level: 3 })) return 3
  return 0
})

function setHeading(level: 1 | 2 | 3 | 0) {
  if (!editor.value) return
  if (level === 0) editor.value.chain().focus().setParagraph().run()
  else editor.value.chain().focus().toggleHeading({ level }).run()
}

function handleHeadingChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  const level = Number(target.value)
  if (level !== 0 && level !== 1 && level !== 2 && level !== 3) return
  setHeading(level)
}

function insertTable() {
  editor.value?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
}

function setTextAlignment(alignment: 'left' | 'center' | 'right') {
  const currentEditor = editor.value
  if (!currentEditor) return

  currentEditor
    .chain()
    .focus()
    .command(({ state, tr, dispatch }) => {
      const blockPositions = new Set<number>()
      const isAlignableBlock = (node: typeof state.doc) =>
        node.type.name === 'paragraph' || node.type.name === 'heading'

      function addParentBlock($pos: typeof state.selection.$from) {
        for (let depth = $pos.depth; depth > 0; depth -= 1) {
          const node = $pos.node(depth)
          if (isAlignableBlock(node)) {
            blockPositions.add($pos.before(depth))
            return
          }
        }
      }

      addParentBlock(state.selection.$from)
      if (!state.selection.empty) addParentBlock(state.selection.$to)
      state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
        if (isAlignableBlock(node)) blockPositions.add(pos)
      })

      if (!blockPositions.size) return false

      blockPositions.forEach((pos) => {
        const node = tr.doc.nodeAt(pos)
        if (!node) return
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: alignment })
      })

      if (dispatch) dispatch(tr)
      return true
    })
    .run()
}

function setLink() {
  if (!editor.value) return
  const previousUrl = editor.value.getAttributes('link').href as string | undefined
  linkUrl.value = previousUrl ?? ''
  isLinkDialogOpen.value = true
  void nextTick(() => document.getElementById('document-link-url')?.focus())
}

function saveLink() {
  if (!editor.value) return
  const url = linkUrl.value.trim()
  if (!url) {
    editor.value.chain().focus().unsetLink().run()
  } else {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
  isLinkDialogOpen.value = false
}

function removeLink() {
  editor.value?.chain().focus().unsetLink().run()
  isLinkDialogOpen.value = false
}

function focusEditor() {
  if (viewMode.value === 'editor') editor.value?.commands.focus()
}

async function downloadPdf() {
  if (!pdfPageRef.value || !props.downloadUserEmail) return

  isDownloadingPdf.value = true

  try {
    const safeTitle = (props.title || 'document').replace(/[^a-z0-9]/gi, '_')
    const safeVersion = (props.version || 'draft').replace(/[^a-z0-9.]/gi, '')
    const filename = props.downloadFilename || `${safeTitle}_${safeVersion}.pdf`
    const downloadedAt = new Date()

    pdfDownloadStamp.value = buildDownloadStamp(props.downloadUserEmail, downloadedAt)
    await nextTick()

    await downloadElementAsPdf({
      element: pdfPageRef.value,
      filename,
      watermark: {
        userEmail: props.downloadUserEmail,
        downloadedAt,
      },
    })
  } catch (error) {
    console.error('Failed to generate PDF:', error)
  } finally {
    isDownloadingPdf.value = false
  }
}

function applyModelValueToEditor(newValue: string) {
  const currentEditor = editor.value
  if (!currentEditor || currentEditor.isFocused || aiSuggestionsActive.value) return

  const parsedContent = parseTiptapContent(newValue)
  const currentContent = serializeTiptapContent(currentEditor.getJSON() as TiptapDocument)
  const incomingContent =
    typeof parsedContent === 'string' ? parsedContent : serializeTiptapContent(parsedContent)

  if (
    (typeof parsedContent === 'string' && currentEditor.getHTML() === incomingContent) ||
    currentContent === incomingContent
  ) {
    return
  }

  currentEditor.commands.setContent(parsedContent, { emitUpdate: false })
}

// useEditor creates the instance in onMounted with setup-time options. If modelValue
// changes before that (or the editor remounts with stale options), re-apply content
// when either the value or the editor instance becomes ready.
watch([() => props.modelValue, editor], ([newValue]) => {
  applyModelValueToEditor(newValue)
})

watch(
  () => props.editable,
  (newValue) => {
    if (aiSuggestionsActive.value) return
    editor.value?.setEditable(newValue && viewMode.value === 'editor')
  },
)

watch(viewMode, (mode) => {
  if (!editor.value || aiSuggestionsActive.value) return
  editor.value.setEditable(mode === 'editor' && props.editable)
})

function openHelixForDraft() {
  openPanel()
}

onBeforeUnmount(() => {
  if (props.documentId) aiSession.unregister(props.documentId)
  editor.value?.destroy()
})
</script>

<template>
  <section class="document-editor" aria-label="Document editor">
    <div v-if="!previewOnly" class="document-editor__view-bar">
      <div
        class="inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-muted/50 p-1"
        role="tablist"
        aria-label="Document view"
      >
        <Button
          variant="ghost"
          size="sm"
          type="button"
          role="tab"
          :aria-selected="viewMode === 'editor'"
          class="h-8 gap-2 rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
          :class="{ 'bg-card text-foreground shadow-xs': viewMode === 'editor' }"
          @click="viewMode = 'editor'"
        >
          <PhFileText :size="16" />
          Editor view
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          role="tab"
          :aria-selected="viewMode === 'pdf'"
          class="h-8 gap-2 rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
          :class="{ 'bg-card text-foreground shadow-xs': viewMode === 'pdf' }"
          @click="viewMode = 'pdf'"
        >
          <PhFileText :size="16" />
          PDF view
        </Button>
      </div>

      <Button
        v-if="viewMode === 'pdf'"
        variant="outline"
        size="sm"
        type="button"
        class="document-editor__pdf-download h-8 gap-1.5 text-xs font-semibold"
        :disabled="isDownloadingPdf || !downloadUserEmail"
        @click="downloadPdf"
      >
        <PhDownloadSimple :size="15" :class="{ 'animate-bounce': isDownloadingPdf }" />
        {{ isDownloadingPdf ? 'Generating…' : 'Download PDF' }}
      </Button>
    </div>

    <div v-else-if="downloadUserEmail" class="mb-3 flex justify-end px-1">
      <Button
        variant="outline"
        size="sm"
        type="button"
        class="document-editor__pdf-download h-8 gap-1.5 text-xs font-semibold"
        :disabled="isDownloadingPdf"
        @click="downloadPdf"
      >
        <PhDownloadSimple :size="15" :class="{ 'animate-bounce': isDownloadingPdf }" />
        {{ isDownloadingPdf ? 'Generating…' : 'Download PDF' }}
      </Button>
    </div>

    <div
      v-if="viewMode === 'editor'"
      class="document-editor__workspace overflow-hidden rounded-lg border border-border bg-card"
    >
      <div
        v-if="editor && editable"
        class="document-editor__toolbar"
        role="toolbar"
        aria-label="Formatting tools"
      >
        <label class="document-editor__heading-control" :data-label="headingLevel">
          <span class="sr-only">Text style</span>
          <select :value="headingValue" aria-label="Text style" @change="handleHeadingChange">
            <option value="0">Paragraph</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>
          <PhTextH :size="15" />
        </label>

        <span class="document-editor__separator" aria-hidden="true" />
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.isActive('bold') }"
          aria-label="Bold"
          title="Bold"
          @click="editor.chain().focus().toggleBold().run()"
          ><PhTextBolder :size="17"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.isActive('italic') }"
          aria-label="Italic"
          title="Italic"
          @click="editor.chain().focus().toggleItalic().run()"
          ><PhTextItalic :size="17"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.isActive('underline') }"
          aria-label="Underline"
          title="Underline"
          @click="editor.chain().focus().toggleUnderline().run()"
          ><PhTextUnderline :size="17"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.isActive('strike') }"
          aria-label="Strikethrough"
          title="Strikethrough"
          @click="editor.chain().focus().toggleStrike().run()"
          ><PhTextStrikethrough :size="17"
        /></Button>
        <span class="document-editor__separator" aria-hidden="true" />
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          aria-label="Bulleted list"
          title="Bulleted list"
          @click="editor.chain().focus().toggleBulletList().run()"
          ><PhListBullets :size="18"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          aria-label="Numbered list"
          title="Numbered list"
          @click="editor.chain().focus().toggleOrderedList().run()"
          ><PhListNumbers :size="18"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.isActive('codeBlock') }"
          aria-label="Code block"
          title="Code block"
          @click="editor.chain().focus().toggleCodeBlock().run()"
          ><PhCode :size="18"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.isActive('table') }"
          aria-label="Insert table"
          title="Insert table"
          @mousedown.prevent
          @click="insertTable"
          ><PhTable :size="18"
        /></Button>
        <template v-if="editor.isActive('table')">
          <span class="document-editor__separator" aria-hidden="true" />
          <Button
            variant="ghost"
            size="icon"
            class="document-editor__tool"
            aria-label="Add row above"
            title="Add row above"
            @mousedown.prevent
            @click="editor.chain().focus().addRowBefore().run()"
            ><PhRowsPlusTop :size="18"
          /></Button>
          <Button
            variant="ghost"
            size="icon"
            class="document-editor__tool"
            aria-label="Add row below"
            title="Add row below"
            @mousedown.prevent
            @click="editor.chain().focus().addRowAfter().run()"
            ><PhRowsPlusBottom :size="18"
          /></Button>
          <Button
            variant="ghost"
            size="icon"
            class="document-editor__tool"
            aria-label="Add column before"
            title="Add column before"
            @mousedown.prevent
            @click="editor.chain().focus().addColumnBefore().run()"
            ><PhColumnsPlusLeft :size="18"
          /></Button>
          <Button
            variant="ghost"
            size="icon"
            class="document-editor__tool"
            aria-label="Add column after"
            title="Add column after"
            @mousedown.prevent
            @click="editor.chain().focus().addColumnAfter().run()"
            ><PhColumnsPlusRight :size="18"
          /></Button>
          <Button
            variant="ghost"
            size="icon"
            class="document-editor__tool text-destructive hover:text-destructive"
            aria-label="Delete current row"
            title="Delete current row"
            @mousedown.prevent
            @click="editor.chain().focus().deleteRow().run()"
            ><PhRows :size="17"
          /></Button>
          <Button
            variant="ghost"
            size="icon"
            class="document-editor__tool text-destructive hover:text-destructive"
            aria-label="Delete current column"
            title="Delete current column"
            @mousedown.prevent
            @click="editor.chain().focus().deleteColumn().run()"
            ><PhColumns :size="17"
          /></Button>
          <Button
            variant="ghost"
            size="icon"
            class="document-editor__tool text-destructive hover:text-destructive"
            aria-label="Delete table"
            title="Delete table"
            @mousedown.prevent
            @click="editor.chain().focus().deleteTable().run()"
            ><PhTrash :size="18"
          /></Button>
        </template>
        <span class="document-editor__separator" aria-hidden="true" />
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.getAttributes('paragraph').textAlign === 'left' }"
          aria-label="Align left"
          title="Align left"
          @click="setTextAlignment('left')"
          ><PhTextAlignLeft :size="18"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.getAttributes('paragraph').textAlign === 'center' }"
          aria-label="Align center"
          title="Align center"
          @click="setTextAlignment('center')"
          ><PhTextAlignCenter :size="18"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.getAttributes('paragraph').textAlign === 'right' }"
          aria-label="Align right"
          title="Align right"
          @click="setTextAlignment('right')"
          ><PhTextAlignRight :size="18"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :class="{ 'is-active': editor.isActive('link') }"
          aria-label="Add link"
          title="Add link"
          @click="setLink"
          ><PhLink :size="18"
        /></Button>
        <span class="document-editor__toolbar-spacer" />
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :disabled="!editor.can().undo()"
          aria-label="Undo"
          title="Undo"
          @click="editor.chain().focus().undo().run()"
          ><PhArrowCounterClockwise :size="18"
        /></Button>
        <Button
          variant="ghost"
          size="icon"
          class="document-editor__tool"
          :disabled="!editor.can().redo()"
          aria-label="Redo"
          title="Redo"
          @click="editor.chain().focus().redo().run()"
          ><PhArrowClockwise :size="18"
        /></Button>
      </div>

      <div class="document-editor__canvas" ref="canvasRef" @click="focusEditor">
        <div v-if="enableAi && aiSuggestionsActive" class="document-editor__ai-bar" role="status">
          <span class="document-editor__ai-bar-label">
            <PhSparkle :size="14" weight="fill" class="text-primary" aria-hidden="true" />
            {{ aiPendingRanges.length }}
            AI {{ aiPendingRanges.length === 1 ? 'change' : 'changes' }} to review
          </span>
          <div class="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="h-7 text-xs"
              @click="rejectAllSuggestions()"
            >
              Reject all
            </Button>
            <Button type="button" size="sm" class="h-7 text-xs" @click="acceptAllSuggestions()">
              Accept all
            </Button>
          </div>
        </div>

        <div
          v-if="enableAi && isEmptyDoc && !aiSuggestionsActive && viewMode === 'editor'"
          class="document-editor__draft-cta"
        >
          <Button type="button" size="sm" class="gap-2" @click="openHelixForDraft">
            <PhMagicWand :size="16" aria-hidden="true" />
            Draft with AI
          </Button>
          <span class="text-xs text-muted-foreground">or start writing below</span>
        </div>

        <p v-if="sectionEditError" class="document-editor__ai-error" role="alert">
          {{ sectionEditError }}
          <button type="button" class="ml-2 underline" @click="sectionEditError = null">
            Dismiss
          </button>
        </p>

        <div
          v-if="selectionMenu && enableAi"
          class="document-editor__selection-menu"
          :style="{ top: `${selectionMenu.top}px`, left: `${selectionMenu.left}px` }"
        >
          <Button
            type="button"
            size="sm"
            class="h-8 gap-1.5 rounded-lg shadow-sm"
            @mousedown.prevent
            @click="openSectionPrompt"
          >
            <PhMagicWand :size="14" aria-hidden="true" />
            Edit with AI
          </Button>
        </div>

        <EditorContent :editor="editor" class="tiptap-content" />
      </div>
    </div>

    <div
      v-else
      class="document-editor__pdf-section document-editor__pdf-light"
      :style="pdfLightThemeStyle"
    >
      <div class="document-editor__pdf-frame">
        <div class="document-editor__pdf-page-wrap">
          <article ref="pdfPageRef" class="document-editor__pdf-page">
            <header class="document-editor__pdf-header">
              <p class="document-editor__pdf-kicker">Clarus · Controlled document</p>
              <div class="document-editor__pdf-meta">
                <h1 v-if="title" class="document-editor__pdf-title">{{ title }}</h1>
                <span v-if="version" class="document-editor__pdf-version">{{ version }}</span>
              </div>
            </header>
            <div class="document-editor__pdf-content">
              <EditorContent :editor="editor" class="tiptap-content document-editor__pdf-body" />
            </div>
            <footer class="document-editor__pdf-footer">
              <div class="document-editor__pdf-footer-meta">
                <span>Internal use only</span>
                <span v-if="pdfDownloadStamp" class="document-editor__pdf-download-stamp">
                  {{ pdfDownloadStamp }}
                </span>
              </div>
              <span class="document-editor__pdf-page-label">Page 1</span>
            </footer>
          </article>
          <div
            v-if="downloadUserEmail"
            class="document-editor__pdf-watermark"
            :style="pdfWatermarkBackground"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>

    <Dialog v-model:open="isSectionPromptOpen">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit with AI</DialogTitle>
          <DialogDescription>
            Describe how Helix should rewrite the selected section. You’ll review the result before
            it replaces anything.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-2 py-2">
          <label for="section-ai-instruction" class="text-sm font-medium text-foreground">
            Instruction
          </label>
          <textarea
            id="section-ai-instruction"
            v-model="sectionInstruction"
            rows="3"
            placeholder="e.g. Require MFA for all remote access and name the approved VPN."
            class="clarus-scroll min-h-[88px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @keydown.meta.enter.prevent="submitSectionEdit"
            @keydown.ctrl.enter.prevent="submitSectionEdit"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="isSectionPromptOpen = false">
            Cancel
          </Button>
          <Button
            type="button"
            :disabled="!sectionInstruction.trim() || isSectionPending"
            @click="submitSectionEdit"
          >
            {{ isSectionPending ? 'Rewriting…' : 'Rewrite section' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="isLinkDialogOpen">
      <DialogContent class="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{{ editor?.isActive('link') ? 'Edit link' : 'Add link' }}</DialogTitle>
          <DialogDescription>
            Add a URL to the selected text. You can use a web address or an internal document link.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-2 py-2">
          <label for="document-link-url" class="text-sm font-medium text-foreground">URL</label>
          <Input
            id="document-link-url"
            v-model="linkUrl"
            type="url"
            placeholder="https://example.com"
            autocomplete="url"
            @keydown.enter.prevent="saveLink"
          />
        </div>
        <DialogFooter class="gap-2 sm:justify-between">
          <Button
            v-if="editor?.isActive('link')"
            type="button"
            variant="ghost"
            class="text-destructive hover:bg-destructive/10 hover:text-destructive"
            @click="removeLink"
          >
            Remove link
          </Button>
          <div class="flex justify-end gap-2 sm:ml-auto">
            <Button type="button" variant="outline" @click="isLinkDialogOpen = false"
              >Cancel</Button
            >
            <Button type="button" :disabled="!linkUrl.trim()" @click="saveLink">Save link</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>

<style>
.document-editor {
  --editor-border: color-mix(in oklch, var(--border) 88%, transparent);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.document-editor__view-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.document-editor__pdf-section {
  display: flex;
  flex-direction: column;
}

.document-editor__pdf-download {
  border-color: var(--border);
  background: var(--card);
  color: var(--foreground);
}

.document-editor__pdf-download:hover:not(:disabled) {
  background: var(--secondary);
  color: var(--foreground);
}

.document-editor__toolbar {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--editor-border);
  background: var(--muted);
}
.document-editor__heading-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 142px;
  height: 36px;
  padding: 0 10px;
  color: var(--foreground);
}
.document-editor__heading-control select {
  position: absolute;
  inset: 0;
  width: 100%;
  border: 0;
  outline: 0;
  appearance: none;
  background: transparent;
  color: transparent;
  cursor: pointer;
}
.document-editor__heading-control::before {
  content: attr(data-label);
}
.document-editor__heading-control select + svg {
  margin-left: auto;
  color: var(--muted-foreground);
  pointer-events: none;
}
.document-editor__heading-control select option {
  color: var(--foreground);
}
.document-editor__tool {
  width: 36px;
  height: 36px;
  color: var(--muted-foreground);
}
.document-editor__tool:hover,
.document-editor__tool.is-active {
  background: var(--secondary);
  color: var(--foreground);
}
.document-editor__tool.is-active {
  color: var(--primary);
}
.document-editor__separator {
  width: 1px;
  height: 22px;
  margin: 0 5px;
  background: var(--editor-border);
}
.document-editor__toolbar-spacer {
  flex: 1;
}
.document-editor__canvas {
  position: relative;
  min-height: 530px;
  max-height: 720px;
  overflow: auto;
  padding: 34px clamp(20px, 5vw, 72px) 48px;
  cursor: text;
  background: var(--card);
}

.document-editor__ai-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -10px 0 16px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, #1a7f37 28%, var(--border));
  border-radius: 8px;
  background: #dafbe1;
  color: #116329;
}

.dark .document-editor__ai-bar {
  background: rgba(46, 160, 67, 0.15);
  border-color: color-mix(in srgb, #3fb950 40%, var(--border));
  color: #3fb950;
}

.document-editor__ai-bar-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  font-weight: 550;
}

.document-editor__draft-cta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.document-editor__ai-error {
  margin: 0 0 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #ffebe9;
  color: #82071e;
  font-size: 0.8125rem;
}

.document-editor__selection-menu {
  position: absolute;
  z-index: 6;
  transform: translateX(-50%);
  pointer-events: auto;
}

.tiptap-content .tiptap {
  max-width: 76ch;
  min-height: 430px;
  outline: none;
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.7;
}

.document-editor__workspace .tiptap-content .tiptap {
  caret-color: var(--foreground);
  /* Global `*` color transitions can interfere with caret rendering in contenteditable. */
  transition-property: background-color, border-color, box-shadow;
}
.tiptap-content .tiptap h1,
.tiptap-content .tiptap h2,
.tiptap-content .tiptap h3 {
  text-wrap: balance;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--foreground);
}
.tiptap-content .tiptap h1 {
  margin: 0 0 18px;
  font-size: 1.875rem;
  line-height: 1.2;
}
.tiptap-content .tiptap h2 {
  margin: 30px 0 10px;
  font-size: 1.35rem;
  line-height: 1.3;
}
.tiptap-content .tiptap h3 {
  margin: 24px 0 8px;
  font-size: 1.125rem;
  line-height: 1.4;
}
.tiptap-content .tiptap p {
  margin: 0 0 16px;
  text-wrap: pretty;
}

/* Empty paragraphs collapse to 0 width in some browsers, hiding the caret until text exists. */
.document-editor__workspace .tiptap-content .tiptap p {
  display: block;
  min-width: 1px;
}

.document-editor__workspace .tiptap-content .tiptap > p:first-child:empty::before {
  content: 'Start writing…';
  color: var(--muted-foreground);
  pointer-events: none;
  float: left;
  height: 0;
}
.tiptap-content .tiptap ul,
.tiptap-content .tiptap ol {
  margin: 0 0 16px;
  padding-left: 25px;
}
.tiptap-content .tiptap ul {
  list-style-type: disc;
}
.tiptap-content .tiptap ol {
  list-style-type: decimal;
}
.tiptap-content .tiptap ul ul {
  list-style-type: circle;
}
.tiptap-content .tiptap ol ol {
  list-style-type: lower-alpha;
}
.tiptap-content .tiptap li::marker {
  color: var(--muted-foreground);
}
.tiptap-content .tiptap li {
  padding-left: 4px;
}
.tiptap-content .tiptap li p {
  margin: 0;
}
.tiptap-content .tiptap blockquote {
  margin: 22px 0;
  padding: 12px 16px;
  border: 1px solid var(--editor-border);
  border-radius: 6px;
  background: var(--muted);
  color: var(--muted-foreground);
  font-style: italic;
}
.tiptap-content .tiptap pre {
  overflow-x: auto;
  margin: 22px 0;
  padding: 14px 16px;
  border-radius: 6px;
  background: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.875rem;
}
.tiptap-content .tiptap code {
  border-radius: 4px;
  background: var(--muted);
  padding: 2px 5px;
  font-family: var(--font-mono);
  font-size: 0.875em;
}
.tiptap-content .tiptap pre code {
  padding: 0;
  background: transparent;
}
.tiptap-link {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tiptap-content .tiptap table {
  width: 100%;
  margin: 24px 0;
  border-collapse: collapse;
  table-layout: fixed;
}

.tiptap-content .tiptap th,
.tiptap-content .tiptap td {
  min-width: 1em;
  padding: 9px 10px;
  border: 1px solid var(--editor-border);
  vertical-align: top;
  text-align: left;
}

.tiptap-content .tiptap th {
  background: var(--muted);
  color: var(--foreground);
  font-weight: 650;
}

.tiptap-content .tiptap th p,
.tiptap-content .tiptap td p {
  margin: 0;
}

.tiptap-content .tiptap .selectedCell {
  background: color-mix(in oklch, var(--primary) 12%, var(--card));
}

.document-editor__pdf-light .tiptap-content .tiptap table {
  font-size: 0.8125rem;
  line-height: 1.45;
}

.document-editor__pdf-light .tiptap-content .tiptap th,
.document-editor__pdf-light .tiptap-content .tiptap td {
  padding: 7px 8px;
}

.document-editor__pdf-frame {
  overflow: auto;
  padding: 24px 16px 32px;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--pdf-desk, #e8e8e8);
}

.document-editor__pdf-page-wrap {
  position: relative;
  width: min(100%, 680px);
  margin: 0 auto;
}

.document-editor__pdf-watermark {
  position: absolute;
  inset: 0;
  background-repeat: repeat;
  pointer-events: none;
  z-index: 2;
}

.document-editor__pdf-page {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--card);
  color: var(--foreground);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
}

.document-editor__pdf-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 36px 44px 20px;
  border-bottom: 1px solid var(--editor-border);
}

.document-editor__pdf-kicker {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.document-editor__pdf-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.document-editor__pdf-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--foreground);
  text-wrap: balance;
}

.document-editor__pdf-version {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--muted-foreground);
  letter-spacing: 0.02em;
}

.document-editor__pdf-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  padding: 16px 44px 28px;
  border-top: 1px solid var(--editor-border);
  color: var(--muted-foreground);
  font-size: 0.625rem;
  letter-spacing: 0.02em;
}

.document-editor__pdf-footer-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.document-editor__pdf-page-label {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.document-editor__pdf-download-stamp {
  color: #757575;
  font-size: 0.5625rem;
  letter-spacing: 0.01em;
  line-height: 1.4;
}

.document-editor__pdf-content {
  padding: 32px 44px 36px;
}

.document-editor__pdf-light .document-editor__pdf-body .tiptap {
  min-height: 0;
  max-width: none;
  cursor: default;
}

.document-editor__pdf-light .document-editor__pdf-body .tiptap:focus {
  outline: none;
}

.document-editor__pdf-light .document-editor__pdf-body .tiptap > :first-child {
  margin-top: 0;
}

.document-editor__pdf-light .tiptap-content .tiptap,
.document-editor__pdf-light .tiptap-content .tiptap h1,
.document-editor__pdf-light .tiptap-content .tiptap h2,
.document-editor__pdf-light .tiptap-content .tiptap h3 {
  color: var(--foreground);
}

.document-editor__pdf-light .tiptap-content .tiptap blockquote,
.document-editor__pdf-light .tiptap-content .tiptap pre,
.document-editor__pdf-light .tiptap-content .tiptap code {
  background: var(--muted);
  color: var(--muted-foreground);
  border-color: var(--editor-border);
}

.document-editor__pdf-light .tiptap-link {
  color: var(--primary);
}

@media (max-width: 640px) {
  .document-editor__toolbar {
    flex-wrap: wrap;
  }
  .document-editor__toolbar-spacer {
    display: none;
  }
  .document-editor__canvas {
    padding: 24px 18px 36px;
  }
  .document-editor__workspace .tiptap-content .tiptap table {
    min-width: 560px;
  }
  .document-editor__pdf-content {
    padding: 24px 20px 28px;
  }
  .document-editor__pdf-header,
  .document-editor__pdf-footer {
    padding-left: 20px;
    padding-right: 20px;
  }
  .document-editor__pdf-header {
    padding-top: 28px;
  }
  .document-editor__pdf-footer {
    padding-bottom: 20px;
  }
  .document-editor__pdf-meta {
    flex-direction: column;
    gap: 8px;
  }
}

@media print {
  .document-editor > .inline-flex,
  .document-editor__toolbar {
    display: none;
  }
  .document-editor__pdf-frame {
    padding: 0;
    border: 0;
    background: transparent;
  }
  .document-editor__pdf-page {
    box-shadow: none;
  }
}
</style>
