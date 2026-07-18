<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { watch, onBeforeUnmount } from 'vue'
import {
  PhTextBolder,
  PhTextItalic,
  PhListBullets,
  PhListNumbers,
  PhQuotes,
  PhCode,
  PhArrowCounterClockwise,
  PhArrowClockwise,
  PhTextHOne,
  PhTextHTwo,
  PhParagraph,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  modelValue: string
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit.configure()],
  editable: props.editable ?? true,
  onUpdate: () => {
    emit('update:modelValue', editor.value?.getHTML() ?? '')
  },
})

// Watch for changes to content from external sources
watch(
  () => props.modelValue,
  (newValue) => {
    if (!editor.value) return
    const isSame = editor.value.getHTML() === newValue
    if (!isSame && !editor.value.isFocused) {
      editor.value.commands.setContent(newValue, { emitUpdate: false })
    }
  },
)

// Watch editable prop
watch(
  () => props.editable,
  (newVal) => {
    if (editor.value) {
      editor.value.setEditable(newVal ?? true)
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="flex flex-col border border-border rounded-lg bg-card overflow-hidden">
    <!-- Toolbar -->
    <div
      v-if="editor && editable !== false"
      class="flex flex-wrap items-center gap-1 p-2 bg-muted/40 border-b border-border"
    >
      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :class="{ 'bg-secondary text-primary': editor.isActive('bold') }"
        title="Bold"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <PhTextBolder :size="16" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :class="{ 'bg-secondary text-primary': editor.isActive('italic') }"
        title="Italic"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <PhTextItalic :size="16" />
      </Button>

      <div class="h-4 w-px bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :class="{ 'bg-secondary text-primary': editor.isActive('heading', { level: 1 }) }"
        title="Heading 1"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        <PhTextHOne :size="16" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :class="{ 'bg-secondary text-primary': editor.isActive('heading', { level: 2 }) }"
        title="Heading 2"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <PhTextHTwo :size="16" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :class="{ 'bg-secondary text-primary': editor.isActive('paragraph') }"
        title="Paragraph"
        @click="editor.chain().focus().setParagraph().run()"
      >
        <PhParagraph :size="16" />
      </Button>

      <div class="h-4 w-px bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :class="{ 'bg-secondary text-primary': editor.isActive('bulletList') }"
        title="Bullet List"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <PhListBullets :size="16" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :class="{ 'bg-secondary text-primary': editor.isActive('orderedList') }"
        title="Ordered List"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <PhListNumbers :size="16" />
      </Button>

      <div class="h-4 w-px bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :class="{ 'bg-secondary text-primary': editor.isActive('blockquote') }"
        title="Blockquote"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        <PhQuotes :size="16" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :class="{ 'bg-secondary text-primary': editor.isActive('codeBlock') }"
        title="Code Block"
        @click="editor.chain().focus().toggleCodeBlock().run()"
      >
        <PhCode :size="16" />
      </Button>

      <div class="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :disabled="!editor.can().undo()"
        title="Undo"
        @click="editor.chain().focus().undo().run()"
      >
        <PhArrowCounterClockwise :size="16" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        class="size-8"
        :disabled="!editor.can().redo()"
        title="Redo"
        @click="editor.chain().focus().redo().run()"
      >
        <PhArrowClockwise :size="16" />
      </Button>
    </div>

    <!-- Editor Surface -->
    <div
      class="p-6 overflow-y-auto min-h-[350px] max-h-[600px] cursor-text focus-within:outline-hidden"
      @click="editor?.commands.focus()"
    >
      <EditorContent :editor="editor" class="tiptap-content" />
    </div>
  </div>
</template>

<style>
/* TipTap Custom Editor Styles */
.tiptap-content .tiptap {
  outline: none;
  font-family: var(--font-sans);
  color: var(--foreground);
  font-size: 0.9375rem;
  line-height: 1.6;
  min-height: 300px;
}

.tiptap-content .tiptap h1 {
  font-size: 1.625rem;
  font-weight: 600;
  line-height: 1.25;
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
}

.tiptap-content .tiptap h2 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.tiptap-content .tiptap p {
  margin-top: 0;
  margin-bottom: 0.875rem;
}

.tiptap-content .tiptap p:last-child {
  margin-bottom: 0;
}

.tiptap-content .tiptap ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-top: 0;
  margin-bottom: 0.875rem;
}

.tiptap-content .tiptap ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-top: 0;
  margin-bottom: 0.875rem;
}

.tiptap-content .tiptap li {
  margin-bottom: 0.25rem;
}

.tiptap-content .tiptap blockquote {
  border-left: 3px solid var(--primary);
  padding-left: 1rem;
  font-style: italic;
  color: var(--muted-foreground);
  margin: 1.25rem 0;
}

.tiptap-content .tiptap code {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  background: var(--muted);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
}

.tiptap-content .tiptap pre {
  background: var(--muted);
  padding: 0.875rem 1.125rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.25rem 0;
}

.tiptap-content .tiptap pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-size: 0.8125rem;
  color: inherit;
}
</style>
