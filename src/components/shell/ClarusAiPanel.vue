<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { PhX, PhSparkle, PhArrowUp, PhFileText } from '@phosphor-icons/vue'
import ClarusLogo from '@/components/shell/ClarusLogo.vue'
import { useClarusAi } from '@/composables/useClarusAi'
import { useDocumentAiChatMutation, useDocumentAiSession } from '@/composables/useDocumentAi'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  proposalSummary?: string
}

const { open, closePanel } = useClarusAi()
const documentAi = useDocumentAiSession()
const chatMutation = useDocumentAiChatMutation()

const query = ref('')
const messages = ref<ChatMessage[]>([])
const inputRef = useTemplateRef<HTMLTextAreaElement>('inputEl')
const bottomRef = useTemplateRef<HTMLElement>('bottomEl')
const isFocused = ref(false)
const sendError = ref<string | null>(null)

const hasQuery = computed(() => query.value.trim().length > 0)
const hasMessages = computed(() => messages.value.length > 0)
const isDocumentMode = computed(() => documentAi.isActive.value)
const isSending = computed(() => chatMutation.isPending.value)

const placeholder = computed(() =>
  isDocumentMode.value ? 'Ask Helix to draft or revise this policy…' : 'Ask Helix something…',
)

const emptyTitle = computed(() =>
  isDocumentMode.value ? 'Draft this policy with Helix' : 'Hi, how can I help you today?',
)

const emptyBody = computed(() =>
  isDocumentMode.value
    ? `Describe what you need${documentAi.documentTitle.value ? ` for “${documentAi.documentTitle.value}”` : ''}. Helix proposes changes in the editor — you accept or reject each one.`
    : 'Helix can draft policies when you open a document. Elsewhere, more assistants are coming soon.',
)

watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  inputRef.value?.focus()
})

watch(
  () => documentAi.documentId.value,
  () => {
    // Fresh thread when switching documents
    messages.value = []
    sendError.value = null
    query.value = ''
  },
)

async function scrollToBottom() {
  await nextTick()
  bottomRef.value?.scrollIntoView({ block: 'end', behavior: 'smooth' })
}

async function sendDocumentPrompt(text: string) {
  const documentId = documentAi.documentId.value
  const bridge = documentAi.bridge.value
  if (!documentId || !bridge) return

  const priorHistory = messages.value.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
  })
  query.value = ''
  sendError.value = null
  void scrollToBottom()

  try {
    const result = await chatMutation.mutateAsync({
      documentId,
      message: text,
      currentContent: bridge.getMarkdown(),
      history: priorHistory,
    })

    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.message,
      proposalSummary: result.proposal?.summary,
    })

    if (result.proposal?.content) {
      documentAi.setPendingProposal(result.proposal)
      bridge.applyProposal(result.proposal.content)
    }
  } catch (error) {
    sendError.value = getApiErrorMessage(error, 'Couldn’t reach Helix. Try again.')
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'I couldn’t complete that request. Check your connection and try again.',
    })
  }

  void scrollToBottom()
}

function sendPlaceholderPrompt(text: string) {
  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
  })
  query.value = ''
  messages.value.push({
    id: crypto.randomUUID(),
    role: 'assistant',
    content:
      'Open a policy document to draft and revise with Helix. Policy AI is available on the document content editor.',
  })
  void scrollToBottom()
}

function sendPrompt(text: string) {
  const trimmed = text.trim()
  if (!trimmed || isSending.value) return

  if (isDocumentMode.value) {
    void sendDocumentPrompt(trimmed)
  } else {
    sendPlaceholderPrompt(trimmed)
  }
}

function sendStarter(text: string) {
  sendPrompt(text)
}

function clearChat() {
  messages.value = []
  query.value = ''
  sendError.value = null
  documentAi.bridge.value?.clearSuggestions()
  documentAi.setPendingProposal(null)
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
      aria-label="Dismiss Helix"
      @click="closePanel"
    />
  </Transition>

  <aside
    id="clarus-ai-panel"
    role="dialog"
    aria-label="Helix"
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
      <div class="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
        <div
          v-if="isDocumentMode"
          class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
        >
          <PhFileText :size="14" class="shrink-0" aria-hidden="true" />
          <span class="truncate">Policy writer</span>
        </div>
        <div v-else class="flex-1" />

        <div class="flex shrink-0 items-center">
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
            aria-label="Close Helix"
            @click="closePanel"
          >
            <PhX :size="16" weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="clarus-scroll min-h-0 flex-1 overflow-y-auto">
        <div
          v-if="!hasMessages"
          class="flex h-full flex-col items-center justify-center px-6 pb-12 text-center"
        >
          <span
            class="mb-5 flex size-14 items-center justify-center text-foreground/80 animate-fade-in-up opacity-0"
            style="animation-delay: 100ms"
            aria-hidden="true"
          >
            <ClarusLogo :size="48" />
          </span>

          <h2
            class="text-balance text-xl font-semibold tracking-tight text-foreground animate-fade-in-up opacity-0 font-sans"
            style="animation-delay: 200ms"
          >
            {{ emptyTitle }}
          </h2>
          <p
            class="mt-2 max-w-[19rem] text-pretty text-sm text-muted-foreground animate-fade-in-up opacity-0"
            style="animation-delay: 300ms"
          >
            {{ emptyBody }}
          </p>

          <div
            v-if="isDocumentMode"
            class="mt-6 flex w-full max-w-[19rem] flex-col gap-2 animate-fade-in-up opacity-0"
            style="animation-delay: 400ms"
          >
            <button
              type="button"
              class="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="sendStarter('Draft me the policy.')"
            >
              Draft me the policy
            </button>
            <button
              type="button"
              class="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="sendStarter('Tighten this for SOC 2 and ISO 27001.')"
            >
              Align to SOC 2 &amp; ISO 27001
            </button>
          </div>
        </div>

        <TransitionGroup
          v-else
          name="message-list"
          tag="div"
          class="flex flex-col gap-5 px-4 pb-4 pt-2"
        >
          <div
            v-for="message in messages"
            :key="message.id"
            :class="
              cn(
                'max-w-[85%] text-pretty text-sm leading-relaxed transition-all duration-300',
                message.role === 'user'
                  ? 'ml-auto rounded-[18px] rounded-tr-[4px] bg-secondary/80 text-foreground px-4 py-2.5 shadow-sm'
                  : 'text-foreground flex gap-3 items-start mr-auto',
              )
            "
          >
            <template v-if="message.role === 'assistant'">
              <div
                class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
              >
                <PhSparkle :size="14" weight="fill" />
              </div>
              <div class="flex-1 space-y-2 pt-0.5 text-foreground/90">
                <p>{{ message.content }}</p>
                <p
                  v-if="message.proposalSummary"
                  class="rounded-md border border-border bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground"
                >
                  Proposal ready in the editor — accept or reject each change.
                  <span class="mt-0.5 block text-foreground/80">{{ message.proposalSummary }}</span>
                </p>
              </div>
            </template>
            <template v-else>
              {{ message.content }}
            </template>
          </div>

          <div
            v-if="isSending"
            key="sending"
            class="mr-auto flex max-w-[85%] items-start gap-3 text-sm text-muted-foreground"
          >
            <div
              class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
            >
              <PhSparkle :size="14" weight="fill" class="animate-pulse" />
            </div>
            <span class="pt-0.5">Helix is drafting…</span>
          </div>

          <div key="bottom-anchor" ref="bottomEl" class="h-px" />
        </TransitionGroup>
      </div>

      <div class="shrink-0 px-4 pb-4 pt-2">
        <p v-if="sendError" class="mb-2 text-center text-xs text-[#82071e]" role="alert">
          {{ sendError }}
        </p>
        <form @submit.prevent="onSubmit">
          <label for="helix-ai-input" class="sr-only">Ask Helix</label>
          <div
            class="relative rounded-xl p-[1px] transition-all duration-300"
            :class="[
              isFocused
                ? 'ring-1 ring-primary/30 shadow-[0_0_14px_color-mix(in_oklch,var(--primary)_15%,transparent)]'
                : 'bg-border hover:border-muted-foreground/30',
            ]"
          >
            <div
              v-if="isFocused"
              class="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[11px] motion-reduce:hidden"
            >
              <div
                class="absolute top-1/2 left-1/2 h-[200%] w-[200%] spin-glow"
                style="
                  background: conic-gradient(
                    from 0deg,
                    transparent 0%,
                    color-mix(in oklch, var(--primary) 30%, transparent) 25%,
                    transparent 50%,
                    color-mix(in oklch, var(--primary) 30%, transparent) 75%,
                    transparent 100%
                  );
                "
              />
            </div>

            <div
              v-if="isFocused"
              class="pointer-events-none absolute inset-0 -z-10 hidden rounded-[11px] bg-primary motion-reduce:block"
            />

            <div class="flex items-end rounded-[11px] bg-background pr-2">
              <textarea
                id="helix-ai-input"
                ref="inputEl"
                v-model="query"
                rows="1"
                :placeholder="placeholder"
                :disabled="isSending"
                class="clarus-scroll block flex-1 resize-none rounded-l-[11px] border-0 bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
                @focus="isFocused = true"
                @blur="isFocused = false"
                @keydown="onKeydown"
              />
              <button
                type="submit"
                :disabled="!hasQuery || isSending"
                class="mb-1.5 flex size-8 items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :class="[
                  hasQuery && !isSending
                    ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95'
                    : 'cursor-not-allowed bg-transparent text-muted-foreground/40',
                ]"
                aria-label="Send message"
              >
                <PhArrowUp :size="16" weight="bold" />
              </button>
            </div>
          </div>
        </form>

        <p class="mt-2 select-none text-center text-[10.5px] text-muted-foreground/50">
          <span class="font-wordmark font-semibold text-foreground">Helix</span> is AI and can make
          mistakes. Review every proposal before accepting.
        </p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fade-in-up 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transform: translateY(8px);
}

@keyframes fade-in-up {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.spin-glow {
  animation: spin-glow-rot 6s linear infinite;
}

@keyframes spin-glow-rot {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.message-list-enter-active {
  transition: all 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.message-list-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .spin-glow {
    animation: none;
  }
  .message-list-enter-active {
    transition: none;
  }
}
</style>
