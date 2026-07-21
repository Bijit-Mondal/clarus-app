<script setup lang="ts">
import { watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { parseTiptapContent } from '@/lib/tiptapContent'

const props = defineProps<{
  value: string
}>()

const editor = useEditor({
  content: parseTiptapContent(props.value),
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Underline,
    Link.configure({
      openOnClick: true,
      HTMLAttributes: { class: 'tiptap-link target="_blank" rel="noopener noreferrer"' },
    }),
  ],
  editable: false,
  editorProps: {
    attributes: {
      class:
        'focus:outline-none leading-relaxed text-sm text-foreground prose dark:prose-invert max-w-none',
    },
  },
})

watch(
  () => props.value,
  (newVal) => {
    editor.value?.commands.setContent(parseTiptapContent(newVal))
  },
)
</script>

<template>
  <div class="tiptap-viewer">
    <EditorContent :editor="editor" />
  </div>
</template>

<style>
/* Style match with the editor view */
.tiptap-viewer .tiptap h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}
.tiptap-viewer .tiptap h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}
.tiptap-viewer .tiptap p {
  margin-bottom: 0.75rem;
}
.tiptap-viewer .tiptap ul {
  list-style-type: disc;
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
}
.tiptap-viewer .tiptap ol {
  list-style-type: decimal;
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
}
.tiptap-viewer .tiptap li p {
  margin: 0;
}
.tiptap-viewer .tiptap-link {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
