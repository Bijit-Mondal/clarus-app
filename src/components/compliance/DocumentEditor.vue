<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import {
  PhArrowClockwise,
  PhArrowCounterClockwise,
  PhCode,
  PhFileText,
  PhLink,
  PhListBullets,
  PhListNumbers,
  PhTextBolder,
  PhTextH,
  PhTextItalic,
  PhTextStrikethrough,
  PhTextUnderline,
} from '@phosphor-icons/vue'
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

const props = withDefaults(
  defineProps<{
    modelValue: string
    editable?: boolean
  }>(),
  { editable: true },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const viewMode = ref<'editor' | 'pdf'>('editor')
const isLinkDialogOpen = ref(false)
const linkUrl = ref('')

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'tiptap-link' },
    }),
  ],
  editable: props.editable,
  editorProps: {
    attributes: {
      'aria-label': 'Document content',
      spellcheck: 'true',
    },
  },
  onUpdate: ({ editor: currentEditor }) => {
    emit('update:modelValue', currentEditor.getHTML())
  },
})

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

watch(
  () => props.modelValue,
  (newValue) => {
    if (!editor.value || editor.value.isFocused || editor.value.getHTML() === newValue) return
    editor.value.commands.setContent(newValue, { emitUpdate: false })
  },
)

watch(
  () => props.editable,
  (newValue) => editor.value?.setEditable(newValue),
)

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <section class="document-editor" aria-label="Document editor">
    <div class="inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-muted/50 p-1" role="tablist" aria-label="Document view">
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

    <div v-if="viewMode === 'editor'" class="document-editor__workspace overflow-hidden rounded-lg border border-border bg-card">
      <div v-if="editor && editable" class="document-editor__toolbar" role="toolbar" aria-label="Formatting tools">
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
        <Button variant="ghost" size="icon" class="document-editor__tool" :class="{ 'is-active': editor.isActive('bold') }" aria-label="Bold" title="Bold" @click="editor.chain().focus().toggleBold().run()"><PhTextBolder :size="17" /></Button>
        <Button variant="ghost" size="icon" class="document-editor__tool" :class="{ 'is-active': editor.isActive('italic') }" aria-label="Italic" title="Italic" @click="editor.chain().focus().toggleItalic().run()"><PhTextItalic :size="17" /></Button>
        <Button variant="ghost" size="icon" class="document-editor__tool" :class="{ 'is-active': editor.isActive('underline') }" aria-label="Underline" title="Underline" @click="editor.chain().focus().toggleUnderline().run()"><PhTextUnderline :size="17" /></Button>
        <Button variant="ghost" size="icon" class="document-editor__tool" :class="{ 'is-active': editor.isActive('strike') }" aria-label="Strikethrough" title="Strikethrough" @click="editor.chain().focus().toggleStrike().run()"><PhTextStrikethrough :size="17" /></Button>
        <span class="document-editor__separator" aria-hidden="true" />
        <Button variant="ghost" size="icon" class="document-editor__tool" :class="{ 'is-active': editor.isActive('bulletList') }" aria-label="Bulleted list" title="Bulleted list" @click="editor.chain().focus().toggleBulletList().run()"><PhListBullets :size="18" /></Button>
        <Button variant="ghost" size="icon" class="document-editor__tool" :class="{ 'is-active': editor.isActive('orderedList') }" aria-label="Numbered list" title="Numbered list" @click="editor.chain().focus().toggleOrderedList().run()"><PhListNumbers :size="18" /></Button>
        <Button variant="ghost" size="icon" class="document-editor__tool" :class="{ 'is-active': editor.isActive('codeBlock') }" aria-label="Code block" title="Code block" @click="editor.chain().focus().toggleCodeBlock().run()"><PhCode :size="18" /></Button>
        <Button variant="ghost" size="icon" class="document-editor__tool" :class="{ 'is-active': editor.isActive('link') }" aria-label="Add link" title="Add link" @click="setLink"><PhLink :size="18" /></Button>
        <span class="document-editor__toolbar-spacer" />
        <Button variant="ghost" size="icon" class="document-editor__tool" :disabled="!editor.can().undo()" aria-label="Undo" title="Undo" @click="editor.chain().focus().undo().run()"><PhArrowCounterClockwise :size="18" /></Button>
        <Button variant="ghost" size="icon" class="document-editor__tool" :disabled="!editor.can().redo()" aria-label="Redo" title="Redo" @click="editor.chain().focus().redo().run()"><PhArrowClockwise :size="18" /></Button>
      </div>

      <div class="document-editor__canvas" @click="focusEditor">
        <EditorContent :editor="editor" class="tiptap-content" />
      </div>
    </div>

    <div v-else class="document-editor__pdf-frame overflow-auto rounded-lg border border-border bg-muted">
      <article class="document-editor__pdf-page">
        <header class="document-editor__pdf-header">
          <span class="document-editor__pdf-kicker">Clarus · Controlled document</span>
          <span>Version 1.0</span>
        </header>
        <div class="document-editor__pdf-content"><EditorContent :editor="editor" class="tiptap-content" /></div>
        <footer class="document-editor__pdf-footer"><span>Internal use only</span><span>Page 1</span></footer>
      </article>
    </div>

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
          <Button v-if="editor?.isActive('link')" type="button" variant="ghost" class="text-destructive hover:bg-destructive/10 hover:text-destructive" @click="removeLink">
            Remove link
          </Button>
          <div class="flex justify-end gap-2 sm:ml-auto">
            <Button type="button" variant="outline" @click="isLinkDialogOpen = false">Cancel</Button>
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

.document-editor__toolbar { min-height: 56px; display: flex; align-items: center; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--editor-border); background: var(--muted); }
.document-editor__heading-control { position: relative; display: inline-flex; align-items: center; gap: 7px; min-width: 142px; height: 36px; padding: 0 10px; color: var(--foreground); }
.document-editor__heading-control select { position: absolute; inset: 0; width: 100%; border: 0; outline: 0; appearance: none; background: transparent; color: transparent; cursor: pointer; }
.document-editor__heading-control::before { content: attr(data-label); }
.document-editor__heading-control select + svg { margin-left: auto; color: var(--muted-foreground); pointer-events: none; }
.document-editor__heading-control select option { color: var(--foreground); }
.document-editor__tool { width: 36px; height: 36px; color: var(--muted-foreground); }
.document-editor__tool:hover, .document-editor__tool.is-active { background: var(--secondary); color: var(--foreground); }
.document-editor__tool.is-active { color: var(--primary); }
.document-editor__separator { width: 1px; height: 22px; margin: 0 5px; background: var(--editor-border); }
.document-editor__toolbar-spacer { flex: 1; }
.document-editor__canvas { min-height: 530px; max-height: 720px; overflow: auto; padding: 34px clamp(20px, 5vw, 72px) 48px; cursor: text; background: var(--card); }

.tiptap-content .tiptap { max-width: 76ch; min-height: 430px; outline: none; color: var(--foreground); font-family: var(--font-sans); font-size: 1rem; line-height: 1.7; }
.tiptap-content .tiptap h1, .tiptap-content .tiptap h2, .tiptap-content .tiptap h3 { text-wrap: balance; font-weight: 650; letter-spacing: -0.02em; color: var(--foreground); }
.tiptap-content .tiptap h1 { margin: 0 0 18px; font-size: 1.875rem; line-height: 1.2; }
.tiptap-content .tiptap h2 { margin: 30px 0 10px; font-size: 1.35rem; line-height: 1.3; }
.tiptap-content .tiptap h3 { margin: 24px 0 8px; font-size: 1.125rem; line-height: 1.4; }
.tiptap-content .tiptap p { margin: 0 0 16px; text-wrap: pretty; }
.tiptap-content .tiptap ul, .tiptap-content .tiptap ol { margin: 0 0 16px; padding-left: 25px; }
.tiptap-content .tiptap ul { list-style-type: disc; }
.tiptap-content .tiptap ol { list-style-type: decimal; }
.tiptap-content .tiptap ul ul { list-style-type: circle; }
.tiptap-content .tiptap ol ol { list-style-type: lower-alpha; }
.tiptap-content .tiptap li::marker { color: var(--muted-foreground); }
.tiptap-content .tiptap li { padding-left: 4px; }
.tiptap-content .tiptap li p { margin: 0; }
.tiptap-content .tiptap blockquote { margin: 22px 0; padding: 12px 16px; border: 1px solid var(--editor-border); border-radius: 6px; background: var(--muted); color: var(--muted-foreground); font-style: italic; }
.tiptap-content .tiptap pre { overflow-x: auto; margin: 22px 0; padding: 14px 16px; border-radius: 6px; background: var(--muted); font-family: var(--font-mono); font-size: 0.875rem; }
.tiptap-content .tiptap code { border-radius: 4px; background: var(--muted); padding: 2px 5px; font-family: var(--font-mono); font-size: 0.875em; }
.tiptap-content .tiptap pre code { padding: 0; background: transparent; }
.tiptap-link { color: var(--primary); text-decoration: underline; text-underline-offset: 3px; }

.document-editor__pdf-frame { padding: 34px 20px; }
.document-editor__pdf-page { width: min(100%, 794px); min-height: 1123px; margin: 0 auto; display: flex; flex-direction: column; background: var(--card); box-shadow: 0 4px 16px hsl(0 0% 0% / 0.12); }
.document-editor__pdf-header, .document-editor__pdf-footer { display: flex; justify-content: space-between; gap: 12px; padding: 26px 52px; color: var(--muted-foreground); font-size: 0.6875rem; letter-spacing: 0.02em; }
.document-editor__pdf-header { border-bottom: 1px solid var(--editor-border); text-transform: uppercase; }
.document-editor__pdf-kicker { color: var(--foreground); font-weight: 600; }
.document-editor__pdf-content { flex: 1; padding: 52px; }
.document-editor__pdf-footer { border-top: 1px solid var(--editor-border); }

@media (max-width: 640px) {
  .document-editor__toolbar { flex-wrap: wrap; }
  .document-editor__toolbar-spacer { display: none; }
  .document-editor__canvas { padding: 24px 18px 36px; }
  .document-editor__pdf-content { padding: 32px 24px; }
  .document-editor__pdf-header, .document-editor__pdf-footer { padding: 18px 24px; }
}

@media print {
  .document-editor > .inline-flex, .document-editor__toolbar { display: none; }
  .document-editor__pdf-frame { padding: 0; border: 0; background: transparent; }
  .document-editor__pdf-page { box-shadow: none; }
}
</style>
