<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import {
  PhTextBolder,
  PhTextItalic,
  PhTextUnderline,
  PhTextStrikethrough,
  PhListBullets,
  PhListNumbers,
  PhLink,
  PhArrowCounterClockwise,
  PhArrowClockwise,
  PhTextH,
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
import {
  parseTiptapContent,
  serializeTiptapContent,
  type TiptapDocument,
} from '@/lib/tiptapContent'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    editable?: boolean
  }>(),
  { placeholder: 'Start typing…', editable: true },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const isLinkDialogOpen = ref(false)
const linkUrl = ref('')

const editor = useEditor({
  content: parseTiptapContent(props.modelValue),
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: {
        openOnClick: false,
        HTMLAttributes: { class: 'tiptap-link' },
      },
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
      class:
        'focus:outline-none min-h-[160px] max-h-[360px] overflow-y-auto px-4 py-3 leading-relaxed text-sm text-foreground prose dark:prose-invert max-w-none',
      'aria-label': 'Context editor content',
      spellcheck: 'true',
    },
  },
  onUpdate: ({ editor: currentEditor }) => {
    emit('update:modelValue', serializeTiptapContent(currentEditor.getJSON() as TiptapDocument))
  },
  onBlur: () => {
    emit('blur')
  },
})

// Sync external modelValue changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (!editor.value) return
    const currentJson = serializeTiptapContent(editor.value.getJSON() as TiptapDocument)
    const newJson = serializeTiptapContent(parseTiptapContent(newValue))
    if (currentJson !== newJson) {
      editor.value.commands.setContent(parseTiptapContent(newValue))
    }
  },
)

// Sync editable state
watch(
  () => props.editable,
  (newVal) => {
    editor.value?.setEditable(newVal)
  },
)

function openLinkDialog() {
  if (!editor.value) return
  linkUrl.value = editor.value.getAttributes('link').href || ''
  isLinkDialogOpen.value = true
}

function saveLink() {
  if (!editor.value) return
  const url = linkUrl.value.trim()
  if (url) {
    editor.value.chain().focus().setLink({ href: url }).run()
  } else {
    editor.value.chain().focus().unsetLink().run()
  }
  isLinkDialogOpen.value = false
}

function removeLink() {
  editor.value?.chain().focus().unsetLink().run()
  isLinkDialogOpen.value = false
}
</script>

<template>
  <div
    class="flex flex-col rounded-md border border-border bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-ring"
  >
    <!-- Toolbar -->
    <div
      v-if="editor && editable"
      class="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-3 py-1.5"
    >
      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :class="{ 'bg-secondary text-primary': editor.isActive('bold') }"
        title="Bold (Ctrl+B)"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <PhTextBolder :size="16" weight="bold" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :class="{ 'bg-secondary text-primary': editor.isActive('italic') }"
        title="Italic (Ctrl+I)"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <PhTextItalic :size="16" weight="bold" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :class="{ 'bg-secondary text-primary': editor.isActive('underline') }"
        title="Underline (Ctrl+U)"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <PhTextUnderline :size="16" weight="bold" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :class="{ 'bg-secondary text-primary': editor.isActive('strike') }"
        title="Strikethrough"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <PhTextStrikethrough :size="16" weight="bold" />
      </Button>

      <div class="h-4 w-px bg-border mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :class="{ 'bg-secondary text-primary': editor.isActive('heading', { level: 2 }) }"
        title="Heading 2"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <PhTextH :size="16" weight="bold" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :class="{ 'bg-secondary text-primary': editor.isActive('bulletList') }"
        title="Bullet List"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <PhListBullets :size="16" weight="bold" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :class="{ 'bg-secondary text-primary': editor.isActive('orderedList') }"
        title="Numbered List"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <PhListNumbers :size="16" weight="bold" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :class="{ 'bg-secondary text-primary': editor.isActive('link') }"
        title="Link"
        @click="openLinkDialog"
      >
        <PhLink :size="16" weight="bold" />
      </Button>

      <div class="h-4 w-px bg-border mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :disabled="!editor.can().undo()"
        title="Undo"
        @click="editor.chain().focus().undo().run()"
      >
        <PhArrowCounterClockwise :size="16" weight="bold" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="size-8 p-0"
        :disabled="!editor.can().redo()"
        title="Redo"
        @click="editor.chain().focus().redo().run()"
      >
        <PhArrowClockwise :size="16" weight="bold" />
      </Button>
    </div>

    <!-- Content Area -->
    <EditorContent :editor="editor" class="tiptap-editor-content" />

    <!-- Link Dialog -->
    <Dialog v-model:open="isLinkDialogOpen">
      <DialogContent class="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{{ editor?.isActive('link') ? 'Edit link' : 'Add link' }}</DialogTitle>
          <DialogDescription> Add a URL to the selected text. </DialogDescription>
        </DialogHeader>
        <div class="grid gap-2 py-2">
          <label for="context-link-url" class="text-sm font-medium text-foreground">URL</label>
          <Input
            id="context-link-url"
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
            <Button type="button" variant="outline" @click="isLinkDialogOpen = false">
              Cancel
            </Button>
            <Button type="button" :disabled="!linkUrl.trim()" @click="saveLink"> Save link </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style>
/* Scoped custom TipTap typography styles */
.tiptap-editor-content .tiptap h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}
.tiptap-editor-content .tiptap h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}
.tiptap-editor-content .tiptap p {
  margin-bottom: 0.75rem;
}
.tiptap-editor-content .tiptap ul {
  list-style-type: disc;
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
}
.tiptap-editor-content .tiptap ol {
  list-style-type: decimal;
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
}
.tiptap-editor-content .tiptap li p {
  margin: 0;
}
.tiptap-editor-content .tiptap-link {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
