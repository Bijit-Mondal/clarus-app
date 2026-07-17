<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PhFile, PhLink, PhTrash, PhSpinner, PhWarning, PhCloudArrowUp } from '@phosphor-icons/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateEvidenceMutation, useUploadAttachmentMutation } from '@/composables/useEvidence'
import type { CreateEvidenceInput } from '@/api/evidence'
import { getApiErrorMessage } from '@/lib/api'

const props = defineProps<{
  open: boolean
  tenantTaskId?: string
  tenantControlId?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

// Form State
const title = ref('')
const description = ref('')
const sourceType = ref<'manual' | 'auto'>('manual')
const sourceMode = ref<'file' | 'link'>('file')
const externalReference = ref('')
const collectedAt = ref('')

// File upload state
const file = ref<File | null>(null)
const attachmentId = ref('')
const isUploading = ref(false)
const uploadError = ref('')
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Submit state
const submitError = ref('')

const uploadMutation = useUploadAttachmentMutation()
const createEvidenceMutation = useCreateEvidenceMutation()

// Set default collectedAt to current local time when dialog opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      // Reset form fields
      title.value = ''
      description.value = ''
      sourceType.value = 'manual'
      sourceMode.value = 'file'
      externalReference.value = ''
      file.value = null
      attachmentId.value = ''
      uploadError.value = ''
      submitError.value = ''

      const now = new Date()
      // format to YYYY-MM-DDTHH:MM
      const tzOffset = now.getTimezoneOffset() * 60000
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
      collectedAt.value = localISOTime
    }
  },
)

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const fileVal = target.files[0]
    if (fileVal) {
      await uploadFile(fileVal)
    }
  }
}

function handleDragOver() {
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

async function handleDrop(event: DragEvent) {
  isDragOver.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const fileVal = event.dataTransfer.files[0]
    if (fileVal) {
      await uploadFile(fileVal)
    }
  }
}

async function uploadFile(fileVal: File) {
  file.value = fileVal
  isUploading.value = true
  uploadError.value = ''
  attachmentId.value = ''

  try {
    const res = await uploadMutation.mutateAsync(fileVal)
    attachmentId.value = res.$id
  } catch (err) {
    uploadError.value = getApiErrorMessage(err, 'Failed to upload attachment file.')
    file.value = null
  } finally {
    isUploading.value = false
  }
}

function removeFile() {
  file.value = null
  attachmentId.value = ''
  uploadError.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const isFormValid = computed(() => {
  if (!title.value.trim()) return false
  if (sourceMode.value === 'file' && !attachmentId.value) return false
  if (sourceMode.value === 'link' && !externalReference.value.trim()) return false
  return true
})

async function handleSubmit() {
  if (!isFormValid.value) return
  submitError.value = ''

  const collectedAtISO = collectedAt.value
    ? new Date(collectedAt.value).toISOString()
    : new Date().toISOString()

  const payload: CreateEvidenceInput = {
    title: title.value.trim(),
    sourceType: sourceType.value,
    collectedAt: collectedAtISO,
    description: description.value.trim(),
  }

  if (sourceMode.value === 'file') {
    payload.attachmentId = attachmentId.value
  } else {
    payload.externalReference = externalReference.value.trim()
  }

  if (props.tenantTaskId) {
    payload.tenantTaskId = props.tenantTaskId
  }

  if (props.tenantControlId) {
    payload.tenantControlId = props.tenantControlId
  }

  try {
    await createEvidenceMutation.mutateAsync(payload)
    emit('success')
    isOpen.value = false
  } catch (err) {
    submitError.value = getApiErrorMessage(err, 'Failed to attach evidence.')
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[460px] border-border bg-card">
      <DialogHeader>
        <DialogTitle class="text-base font-semibold tracking-tight text-foreground"
          >Add Evidence</DialogTitle
        >
        <DialogDescription class="text-xs text-muted-foreground">
          Provide screenshot files or links verifying task compliance execution.
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 py-1 text-sm">
        <!-- Title -->
        <div class="space-y-1.5">
          <Label for="title" class="text-xs font-semibold text-foreground">Evidence Title</Label>
          <Input
            id="title"
            v-model="title"
            placeholder="e.g., IAM Password Policy configuration screenshot"
            required
            class="h-9"
          ></Input>
        </div>

        <!-- Mode Toggle (Tabs UI) -->
        <div class="space-y-1.5">
          <Label class="text-xs font-semibold text-foreground">Evidence Source</Label>
          <div class="flex rounded-md bg-muted p-0.5 border border-border/40">
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-1.5 py-1 px-3 rounded text-xs font-semibold transition-all cursor-pointer"
              :class="
                sourceMode === 'file'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="sourceMode = 'file'"
            >
              <component :is="PhCloudArrowUp" :size="14"></component>
              File Upload
            </button>
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-1.5 py-1 px-3 rounded text-xs font-semibold transition-all cursor-pointer"
              :class="
                sourceMode === 'link'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="sourceMode = 'link'"
            >
              <component :is="PhLink" :size="14"></component>
              External Link
            </button>
          </div>
        </div>

        <!-- File Upload Area -->
        <div v-if="sourceMode === 'file'" class="space-y-1.5">
          <Label class="text-xs font-semibold text-foreground">Upload File</Label>
          <input
            type="file"
            ref="fileInputRef"
            class="hidden"
            accept="image/*,application/pdf,application/json,text/plain"
            @change="handleFileChange"
          />

          <div
            v-if="!file && !isUploading"
            class="border border-dashed rounded-lg p-5 text-center cursor-pointer transition-all hover:bg-muted/10 border-border"
            :class="{ 'border-primary bg-primary/5': isDragOver }"
            @dragover.prevent="handleDragOver"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <!-- Drag and Drop Area -->
            <div class="flex flex-col items-center justify-center gap-1.5">
              <component
                :is="PhCloudArrowUp"
                :size="24"
                class="text-muted-foreground/60"
              ></component>
              <p class="text-xs font-semibold text-foreground">Drag and drop file, or browse</p>
              <p class="text-[10px] text-muted-foreground">PDF, PNG, JPG, or JSON up to 10MB</p>
            </div>
          </div>

          <div
            v-else-if="isUploading"
            class="border border-border/60 rounded-lg p-5 flex flex-col items-center justify-center gap-2 bg-muted/20"
          >
            <!-- Uploading State -->
            <component :is="PhSpinner" :size="20" class="animate-spin text-primary"></component>
            <span class="text-xs text-muted-foreground">Uploading file attachment...</span>
          </div>

          <div
            v-else-if="file"
            class="border border-border/80 rounded-lg p-3.5 flex items-center justify-between bg-muted/15"
          >
            <!-- Uploaded File State -->
            <div class="flex items-center gap-2.5 min-w-0">
              <span
                class="flex size-7 items-center justify-center rounded bg-success/10 text-success"
              >
                <component :is="PhFile" :size="15"></component>
              </span>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-foreground truncate max-w-[240px]">
                  {{ file.name }}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Uploaded Successfully • ID: {{ attachmentId.slice(0, 8) }}...
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              @click="removeFile"
              aria-label="Remove uploaded file"
            >
              <component :is="PhTrash" :size="14"></component>
            </Button>
          </div>

          <p v-if="uploadError" class="text-[11px] text-destructive flex items-center gap-1 mt-1">
            <!-- Upload Error -->
            <component :is="PhWarning" :size="12"></component>
            {{ uploadError }}
          </p>
        </div>

        <div v-else class="space-y-1.5">
          <!-- External Link Input -->
          <Label for="link-url" class="text-xs font-semibold text-foreground"
            >Reference Link URL</Label
          >
          <Input
            id="link-url"
            v-model="externalReference"
            type="url"
            placeholder="https://github.com/my-org/repo/settings/security"
            required
            class="h-9"
          ></Input>
        </div>

        <!-- Optional Description -->
        <div class="space-y-1.5">
          <Label for="desc" class="text-xs font-semibold text-foreground"
            >Description / Notes</Label
          >
          <Input
            id="desc"
            v-model="description"
            placeholder="Verification of 2FA requirements on critical repositories."
            class="h-9"
          ></Input>
        </div>

        <!-- Collected At -->
        <div class="space-y-1.5">
          <Label for="collected-at" class="text-xs font-semibold text-foreground"
            >Collected At</Label
          >
          <Input id="collected-at" v-model="collectedAt" type="datetime-local" class="h-9"></Input>
        </div>

        <!-- Submit Error -->
        <div
          v-if="submitError"
          class="p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-xs text-destructive flex items-start gap-2"
        >
          <component :is="PhWarning" :size="15" class="shrink-0 mt-0.5"></component>
          <span>{{ submitError }}</span>
        </div>

        <!-- Footer Actions -->
        <DialogFooter class="pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-8 font-semibold text-xs"
            @click="isOpen = false"
            :disabled="createEvidenceMutation.isPending.value"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            class="h-8 font-semibold text-xs"
            :disabled="!isFormValid || createEvidenceMutation.isPending.value || isUploading"
          >
            <component
              v-if="createEvidenceMutation.isPending.value"
              :is="PhSpinner"
              :size="14"
              class="animate-spin mr-1.5"
            ></component>
            Attach Evidence
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
