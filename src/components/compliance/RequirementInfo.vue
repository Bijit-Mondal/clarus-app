<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  PhCheckCircle,
  PhCircle,
  PhClock,
  PhMinusCircle,
  PhWarningCircle,
  PhXCircle,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ASSESSMENT_STATUSES,
  ASSESSMENT_STATUS_LABELS,
  isAssessmentStatus,
  type AssessmentStatus,
  type Requirement,
} from './types'

const RATIONALE_MAX_LENGTH = 8192

const props = defineProps<{
  requirement: Requirement
  isUpdating?: boolean
  updateError?: string
}>()

const emit = defineEmits<{
  'update:status': [payload: { status: AssessmentStatus; rationale?: string }]
}>()

const isExpanded = ref(false)
const isNaDialogOpen = ref(false)
const naRationale = ref('')
const naError = ref('')
const pendingNaSubmit = ref(false)

const statusVisual = {
  not_started: {
    icon: PhCircle,
    base: 'var(--muted-foreground)',
  },
  in_progress: {
    icon: PhClock,
    base: 'var(--info)',
  },
  satisfied: {
    icon: PhCheckCircle,
    base: 'var(--success-emphasis)',
  },
  partially_satisfied: {
    icon: PhWarningCircle,
    base: 'var(--warning-emphasis)',
  },
  not_applicable: {
    icon: PhMinusCircle,
    base: 'var(--muted-foreground)',
  },
  not_satisfied: {
    icon: PhXCircle,
    base: 'var(--destructive-emphasis)',
  },
} as const

const currentStatus = computed(() => props.requirement.assessmentStatus)
const currentVisual = computed(() => statusVisual[currentStatus.value])
const currentLabel = computed(() => ASSESSMENT_STATUS_LABELS[currentStatus.value])

watch(
  () => props.requirement.id,
  () => {
    isExpanded.value = false
    isNaDialogOpen.value = false
    naRationale.value = ''
    naError.value = ''
    pendingNaSubmit.value = false
  },
)

watch(
  () => [props.isUpdating, props.updateError, props.requirement.assessmentStatus] as const,
  ([isUpdating, updateError, status], previous) => {
    if (!pendingNaSubmit.value) return
    const wasUpdating = previous?.[0]
    if (wasUpdating && !isUpdating) {
      if (!updateError && status === 'not_applicable') {
        isNaDialogOpen.value = false
        naRationale.value = ''
        naError.value = ''
      }
      pendingNaSubmit.value = false
    }
  },
)

function applyStatus(status: AssessmentStatus, rationale?: string) {
  emit('update:status', { status, rationale })
}

function onStatusChange(value: unknown) {
  if (props.isUpdating) return
  if (typeof value !== 'string' || !isAssessmentStatus(value)) return
  if (value === currentStatus.value) return

  if (value === 'not_applicable') {
    naRationale.value = props.requirement.rationale?.trim() || ''
    naError.value = ''
    pendingNaSubmit.value = false
    isNaDialogOpen.value = true
    return
  }

  applyStatus(value)
}

function cancelNaDialog() {
  if (props.isUpdating) return
  isNaDialogOpen.value = false
  naRationale.value = ''
  naError.value = ''
  pendingNaSubmit.value = false
}

function confirmNotApplicable() {
  if (props.isUpdating) return

  const rationale = naRationale.value.trim()
  if (!rationale) {
    naError.value = 'A rationale is required for not applicable.'
    return
  }
  if (rationale.length > RATIONALE_MAX_LENGTH) {
    naError.value = `Rationale must be ${RATIONALE_MAX_LENGTH.toLocaleString()} characters or fewer.`
    return
  }

  naError.value = ''
  pendingNaSubmit.value = true
  applyStatus('not_applicable', rationale)
}
</script>

<template>
  <div class="border-b border-border px-6 py-6 lg:px-8">
    <span
      class="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary"
    >
      {{ requirement.code }}
    </span>

    <h2
      v-if="requirement.title"
      class="mt-3 text-xl font-semibold tracking-tight text-foreground text-balance"
    >
      {{ requirement.title }}
    </h2>
    <p
      v-if="requirement.description"
      class="mt-3 max-w-[75ch] text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty"
      :class="{ 'line-clamp-3': !isExpanded }"
    >
      {{ requirement.description }}
    </p>
    <p v-else class="mt-3 text-sm italic text-muted-foreground">No description provided.</p>
    <button
      v-if="requirement.description && requirement.description.length > 240"
      type="button"
      class="mt-2 text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:underline"
      @click="isExpanded = !isExpanded"
    >
      {{ isExpanded ? 'Show less' : 'Show more' }}
    </button>

    <div class="mt-5 border-t border-border pt-4">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span class="text-xs font-medium text-muted-foreground">Assessment status</span>
        <Select
          :model-value="currentStatus"
          :disabled="isUpdating"
          @update:model-value="onStatusChange"
        >
          <SelectTrigger
            size="sm"
            class="h-8 w-[11.5rem] bg-background px-2.5 text-xs font-medium text-foreground shadow-none hover:bg-muted/50 disabled:opacity-70"
            aria-label="Change assessment status"
          >
            <component
              :is="currentVisual.icon"
              :size="14"
              weight="fill"
              class="shrink-0"
              :style="{ color: currentVisual.base }"
              aria-hidden="true"
            />
            <SelectValue>{{ currentLabel }}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem
              v-for="status in ASSESSMENT_STATUSES"
              :key="status"
              :value="status"
              class="text-sm"
            >
              <component
                :is="statusVisual[status].icon"
                :size="14"
                weight="fill"
                class="shrink-0"
                :style="{ color: statusVisual[status].base }"
                aria-hidden="true"
              />
              <span>{{ ASSESSMENT_STATUS_LABELS[status] }}</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p
        v-if="currentStatus === 'not_applicable'"
        class="mt-2 text-xs leading-relaxed text-muted-foreground"
      >
        Requires a rationale and Owner approval.
      </p>
      <p v-if="updateError" class="mt-2 text-xs text-destructive" role="alert">
        {{ updateError }}
      </p>
    </div>

    <div
      v-if="currentStatus === 'not_applicable' && requirement.rationale"
      class="mt-4 rounded-lg bg-muted/50 px-4 py-3"
    >
      <p class="text-xs font-medium text-foreground">Not applicable rationale</p>
      <p class="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
        {{ requirement.rationale }}
      </p>
    </div>
  </div>

  <Dialog :open="isNaDialogOpen" @update:open="(open) => !open && cancelNaDialog()">
    <DialogContent class="sm:max-w-[440px]">
      <DialogHeader>
        <DialogTitle>Mark as not applicable</DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          Provide a rationale. Not applicable requires Owner approval before it is treated as final.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-2 py-1">
        <Label for="na-rationale" class="text-xs font-semibold text-foreground">
          Rationale
          <span class="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Textarea
          id="na-rationale"
          v-model="naRationale"
          placeholder="Explain why this requirement does not apply…"
          class="min-h-24 text-sm"
          :maxlength="RATIONALE_MAX_LENGTH"
          :disabled="isUpdating"
          :aria-invalid="!!naError || !!updateError"
          @keydown.meta.enter="confirmNotApplicable"
          @keydown.ctrl.enter="confirmNotApplicable"
        />
        <p class="text-[11px] text-muted-foreground">
          {{ naRationale.trim().length.toLocaleString() }} /
          {{ RATIONALE_MAX_LENGTH.toLocaleString() }}
        </p>
        <p v-if="naError" class="text-xs text-destructive" role="alert">{{ naError }}</p>
        <p v-else-if="updateError && pendingNaSubmit" class="text-xs text-destructive" role="alert">
          {{ updateError }}
        </p>
      </div>

      <DialogFooter class="gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="isUpdating"
          @click="cancelNaDialog"
        >
          Cancel
        </Button>
        <Button type="button" size="sm" :disabled="isUpdating" @click="confirmNotApplicable">
          {{ isUpdating ? 'Saving…' : 'Save status' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
