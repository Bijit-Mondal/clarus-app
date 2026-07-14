<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import ClarusLogo from '@/components/shell/ClarusLogo.vue'
import { useClarusAi } from '@/composables/useClarusAi'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const { open, closePanel } = useClarusAi()

const query = ref('')
const messages = ref<ChatMessage[]>([])
const inputRef = useTemplateRef<HTMLTextAreaElement>('inputEl')
const bottomRef = useTemplateRef<HTMLElement>('bottomEl')

const hasQuery = computed(() => query.value.trim().length > 0)
const hasMessages = computed(() => messages.value.length > 0)

watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  inputRef.value?.focus()
})

async function scrollToBottom() {
  await nextTick()
  bottomRef.value?.scrollIntoView({ block: 'end', behavior: 'smooth' })
}

function sendPrompt(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return

  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: trimmed,
  })

  query.value = ''

  // Shell placeholder — real AI streaming lands later.
  messages.value.push({
    id: crypto.randomUUID(),
    role: 'assistant',
    content:
      'I can help with controls, evidence, and findings once AI is connected. For now this is a preview of the Clarus AI workspace.',
  })

  void scrollToBottom()
}

function clearChat() {
  messages.value = []
  query.value = ''
  void nextTick(() => inputRef.value?.focus())
}

function onSubmit() {
  if (!hasQuery.value) return
  sendPrompt(query.value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    onSubmit()
  }
  if (event.key === 'Escape') {
    closePanel()
  }
}
</script>

<template>
  <!-- Mobile backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out motion-reduce:transition-none"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-150 ease-out motion-reduce:transition-none"
    leave-to-class="opacity-0"
  >
    <button
      v-if="open"
      type="button"
      class="fixed inset-0 z-40 bg-foreground/20 md:hidden"
      aria-label="Dismiss Clarus AI"
      @click="closePanel"
    />
  </Transition>

  <aside
    id="clarus-ai-panel"
    role="dialog"
    aria-label="Clarus AI"
    :aria-hidden="!open"
    :inert="!open"
    :class="
      cn(
        'flex h-full shrink-0 flex-col overflow-hidden border-border bg-card',
        'transition-[width,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        'md:relative md:border-l',
        open
          ? 'md:w-[min(100%,24rem)] md:opacity-100'
          : 'pointer-events-none md:w-0 md:border-l-0 md:opacity-0',
        'fixed inset-y-0 right-0 z-50 w-[min(100vw,24rem)] border-l shadow-md md:pointer-events-auto md:shadow-none',
        open ? 'pointer-events-auto translate-x-0' : 'translate-x-full md:translate-x-0',
      )
    "
  >
    <div class="flex h-full w-[min(100vw,24rem)] flex-col md:w-96">
      <!-- Minimal top bar -->
      <div class="flex h-12 shrink-0 items-center justify-end px-4">
        <button
          v-if="hasMessages"
          type="button"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="clearChat"
        >
          Clear chat
        </button>

        <button
          type="button"
          class="ml-2 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-label="Close Clarus AI"
          @click="closePanel"
        >
          <PhX :size="16" weight="bold" aria-hidden="true" />
        </button>
      </div>

      <!-- Content -->
      <div class="clarus-scroll min-h-0 flex-1 overflow-y-auto">
        <!-- Empty state -->
        <div
          v-if="!hasMessages"
          class="flex h-full flex-col items-center justify-center px-6 pb-8 text-center"
        >
          <span
            class="mb-5 flex size-14 items-center justify-center text-foreground/80"
            aria-hidden="true"
          >
            <ClarusLogo :size="48" />
          </span>

          <h2 class="text-balance text-lg font-semibold tracking-tight text-foreground">
            Hi, how can I help you today?
          </h2>
          <p class="mt-1.5 max-w-[18rem] text-pretty text-sm text-muted-foreground">
            Start a conversation to see messages here
          </p>
        </div>

        <!-- Messages -->
        <div v-else class="flex flex-col gap-5 px-4 pb-4 pt-2">
          <div
            v-for="message in messages"
            :key="message.id"
            :class="
              cn(
                'max-w-[90%] text-pretty text-sm leading-relaxed',
                message.role === 'user'
                  ? 'ml-auto rounded-lg bg-muted px-3.5 py-2.5 text-foreground'
                  : 'text-foreground',
              )
            "
          >
            {{ message.content }}
          </div>

          <div ref="bottomEl" />
        </div>
      </div>

      <!-- Input -->
      <div class="shrink-0 px-4 pb-4 pt-2">
        <form @submit.prevent="onSubmit">
          <label for="clarus-ai-input" class="sr-only">Ask Clarus AI</label>
          <textarea
            id="clarus-ai-input"
            ref="inputEl"
            v-model="query"
            rows="1"
            placeholder="Ask Clarus something…"
            class="clarus-scroll w-full resize-none rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            @keydown="onKeydown"
          />
        </form>
      </div>
    </div>
  </aside>
</template>
