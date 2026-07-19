<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { PhX, PhSparkle, PhArrowUp } from '@phosphor-icons/vue'
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
const isFocused = ref(false)

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
      'I can help with controls, evidence, and findings once Helix is connected. For now this is a preview of the Helix workspace.',
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
          aria-label="Close Helix"
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
            Hi, how can I help you today?
          </h2>
          <p
            class="mt-2 max-w-[19rem] text-pretty text-sm text-muted-foreground animate-fade-in-up opacity-0"
            style="animation-delay: 300ms"
          >
            Start a conversation with
            <span class="font-wordmark font-medium text-foreground">Helix</span> to explore
            controls, evidence, and findings.
          </p>
        </div>

        <!-- Messages -->
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
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm mt-0.5"
              >
                <PhSparkle :size="14" weight="fill" />
              </div>
              <div class="flex-1 pt-0.5 text-foreground/90">
                {{ message.content }}
              </div>
            </template>
            <template v-else>
              {{ message.content }}
            </template>
          </div>

          <div key="bottom-anchor" ref="bottomEl" class="h-px" />
        </TransitionGroup>
      </div>

      <!-- Input -->
      <div class="shrink-0 px-4 pb-4 pt-2">
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
            <!-- Rotating gradient border when active/focused -->
            <div
              v-if="isFocused"
              class="absolute inset-0 -z-10 overflow-hidden rounded-[11px] pointer-events-none motion-reduce:hidden"
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

            <!-- Static fallback for prefers-reduced-motion -->
            <div
              v-if="isFocused"
              class="absolute inset-0 -z-10 rounded-[11px] bg-primary pointer-events-none hidden motion-reduce:block"
            />

            <!-- Input textarea wrapper containing textarea + action button -->
            <div class="flex items-end bg-background rounded-[11px] pr-2">
              <textarea
                id="helix-ai-input"
                ref="inputEl"
                v-model="query"
                rows="1"
                placeholder="Ask Helix something…"
                class="clarus-scroll block flex-1 resize-none rounded-l-[11px] border-0 bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                @focus="isFocused = true"
                @blur="isFocused = false"
                @keydown="onKeydown"
              />
              <!-- Send Button -->
              <button
                type="submit"
                :disabled="!hasQuery"
                class="mb-1.5 flex size-8 items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :class="[
                  hasQuery
                    ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95'
                    : 'text-muted-foreground/40 cursor-not-allowed bg-transparent',
                ]"
                aria-label="Send message"
              >
                <PhArrowUp :size="16" weight="bold" />
              </button>
            </div>
          </div>
        </form>

        <!-- Disclaimer -->
        <p class="mt-2 text-center text-[10.5px] text-muted-foreground/50 select-none">
          <span class="font-wordmark font-semibold text-foreground">Helix</span> is AI and can make
          mistakes.
        </p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.animate-pulse-slow {
  animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(0.96);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes fade-in-up {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Base starting position for fade-in-up items */
.animate-fade-in-up {
  transform: translateY(8px);
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

/* Transition Group for messages */
.message-list-enter-active {
  transition: all 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.message-list-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
