<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
  PhCaretRight,
  PhCheckCircle,
  PhPencilSimple,
  PhUploadSimple,
  PhX,
  PhXCircle,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getCategoryLabel,
  getDocumentStatusConfig,
} from '@/lib/documentDisplay'
import type { DocumentItem } from '@/composables/useDocuments'
import type { SaveStatus } from '@/components/compliance/document-detail/types'

const props = defineProps<{
  document: DocumentItem
  orgSlug: string
  draftTitle: string
  saveStatus: SaveStatus
}>()

const emit = defineEmits<{
  'update:draftTitle': [value: string]
  edit: []
  publish: []
  titleSaved: []
}>()

const isEditingTitle = ref(false)
const titleInputRef = ref<HTMLInputElement | null>(null)
const titleValidationError = ref<string | null>(null)

const statusConfig = computed(() => getDocumentStatusConfig(props.document.status))

function validateTitle(title: string): string | null {
  const trimmed = title.trim()
  if (!trimmed) return 'Title cannot be empty'
  if (trimmed.length < 3) return 'Title must be at least 3 characters'
  if (trimmed.length > 200) return 'Title cannot exceed 200 characters'
  return null
}

function startTitleEdit() {
  emit('update:draftTitle', props.document.title)
  titleValidationError.value = null
  isEditingTitle.value = true
  void nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

function saveTitleEdit() {
  const error = validateTitle(props.draftTitle)
  if (error) {
    titleValidationError.value = error
    titleInputRef.value?.focus()
    return
  }

  if (props.draftTitle.trim() === props.document.title) {
    isEditingTitle.value = false
    titleValidationError.value = null
    return
  }

  titleValidationError.value = null
  emit('titleSaved')
  isEditingTitle.value = false
}

function cancelTitleEdit() {
  emit('update:draftTitle', props.document.title)
  titleValidationError.value = null
  isEditingTitle.value = false
}

function handleTitleInput() {
  if (titleValidationError.value) {
    titleValidationError.value = null
  }
}
</script>

<template>
  <header class="flex flex-col gap-5">
    <nav class="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <router-link
        :to="{ name: 'compliance-documents', params: { organizationSlug: orgSlug } }"
        class="font-medium capitalize transition-colors hover:text-foreground"
      >
        {{ getCategoryLabel(document.category) }}
      </router-link>
      <PhCaretRight :size="13" class="text-muted-foreground/60" aria-hidden="true" />
      <span class="max-w-[min(48vw,420px)] truncate font-medium text-foreground">{{
        document.title
      }}</span>
    </nav>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1 space-y-2">
        <div class="flex items-center gap-3">
          <Badge
            variant="outline"
            :class="[
              'gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              statusConfig.class,
            ]"
          >
            <component :is="statusConfig.icon" :size="13" weight="fill" />
            {{ statusConfig.label }}
          </Badge>
          <span class="font-mono text-xs text-muted-foreground">{{ document.version }}</span>
        </div>
        <div class="group/title space-y-1.5">
          <div class="flex max-w-full items-baseline gap-1.5">
            <button
              v-if="!isEditingTitle"
              type="button"
              class="group/edit-trigger -mx-1.5 cursor-text rounded px-1.5 text-left transition-colors hover:bg-accent/30 focus-visible:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Click to edit title"
              @click="startTitleEdit"
            >
              <h1
                class="text-balance text-xl font-semibold leading-tight tracking-tight text-foreground transition-colors duration-150 group-hover/edit-trigger:text-foreground/90 sm:text-2xl"
              >
                {{ document.title }}
              </h1>
            </button>
            <div v-else class="flex-1 animate-in fade-in-0 zoom-in-95 duration-150">
              <input
                ref="titleInputRef"
                :value="draftTitle"
                type="text"
                :class="[
                  'w-full rounded-lg border bg-background/50 px-1.5 py-1.5 text-xl font-semibold leading-tight tracking-tight text-foreground shadow-none outline-none transition-all sm:text-2xl',
                  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:shadow-sm',
                  titleValidationError
                    ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                    : 'border-input',
                ]"
                @input="
                  emit('update:draftTitle', ($event.target as HTMLInputElement).value);
                  handleTitleInput()
                "
                @keydown.enter="saveTitleEdit"
                @keydown.escape="cancelTitleEdit"
              />
            </div>
            <span
              v-if="!isEditingTitle"
              class="flex size-6 shrink-0 translate-y-[0.125rem] items-center justify-center text-muted-foreground/60 opacity-0 transition-all duration-150 group-hover/title:opacity-100 group-focus-within/title:opacity-100"
              aria-hidden="true"
            >
              <PhPencilSimple :size="13" weight="regular" />
            </span>
            <template v-else>
              <Button
                variant="ghost"
                size="icon-sm"
                class="size-6 shrink-0 translate-y-[0.125rem] text-muted-foreground transition-colors hover:bg-success/10 hover:text-success"
                aria-label="Save title"
                :disabled="saveStatus === 'saving'"
                @click="saveTitleEdit"
              >
                <PhCheckCircle :size="14" :weight="saveStatus === 'saving' ? 'regular' : 'fill'" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                class="size-6 shrink-0 translate-y-[0.125rem] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Cancel editing"
                :disabled="saveStatus === 'saving'"
                @click="cancelTitleEdit"
              >
                <PhX :size="14" />
              </Button>
            </template>
          </div>
          <Transition
            enter-active-class="animate-in fade-in-0 slide-in-from-top-1 duration-150"
            leave-active-class="animate-out fade-out-0 slide-out-to-top-1 duration-150"
          >
            <div role="status" aria-live="polite" aria-atomic="true">
              <p
                v-if="isEditingTitle && titleValidationError"
                class="flex items-center gap-1.5 text-xs font-medium text-destructive"
              >
                <PhXCircle :size="12" weight="fill" />
                {{ titleValidationError }}
              </p>
              <p
                v-else-if="isEditingTitle && !titleValidationError"
                class="text-[11px] text-muted-foreground"
              >
                Press
                <kbd
                  class="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] font-medium"
                  >Enter</kbd
                >
                to save or
                <kbd
                  class="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] font-medium"
                  >Esc</kbd
                >
                to cancel
              </p>
            </div>
          </Transition>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 text-xs font-semibold"
          @click="emit('edit')"
        >
          <PhPencilSimple :size="15" />
          Edit
        </Button>
        <Button
          size="sm"
          class="h-8 gap-1.5 px-3.5 text-xs font-semibold"
          @click="emit('publish')"
        >
          <PhUploadSimple :size="15" weight="bold" />
          Publish
        </Button>
      </div>
    </div>
  </header>
</template>
