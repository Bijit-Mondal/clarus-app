<script setup lang="ts">
import { ref, watch } from 'vue'
import { PhPaperPlaneTilt, PhUploadSimple, PhX } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import type { DocumentItem } from '@/composables/useDocuments'

const props = defineProps<{
  open: boolean
  document: DocumentItem
  tenantUsers: Array<{ $id: string; name: string }>
  isPublishing: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  publishMinor: []
  publishMajor: []
}>()

const publishChangelog = ref('')
const publishApprovers = ref<string[]>([])
const newApproverName = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    publishChangelog.value = ''
    publishApprovers.value = [...props.document.approvers]
    newApproverName.value = ''
  },
)

function addApprover() {
  const name = newApproverName.value.trim()
  if (name && !publishApprovers.value.includes(name)) {
    publishApprovers.value.push(name)
    newApproverName.value = ''
  }
}

function removeApprover(name: string) {
  publishApprovers.value = publishApprovers.value.filter((n) => n !== name)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Publish document</DialogTitle>
        <DialogDescription class="text-xs">
          Review changes, specify versions, and request compliance approvals.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="changelog" class="text-xs font-semibold text-foreground">Changelog</Label>
          <Textarea
            id="changelog"
            v-model="publishChangelog"
            placeholder="Describe what changed in this version..."
            class="h-24 text-sm"
          />
          <p class="text-[11px] text-muted-foreground">
            Approvers will receive an email and the document will be published as a major version
            once all have approved. Remove all approvers to publish directly as major.
          </p>
        </div>

        <div class="grid gap-2">
          <Label class="text-xs font-semibold text-foreground">Approvers</Label>
          <div
            class="flex min-h-[40px] flex-wrap gap-1.5 rounded-md border border-border bg-muted/10 p-2"
          >
            <Badge
              v-for="name in publishApprovers"
              :key="name"
              variant="secondary"
              class="gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {{ name }}
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground"
                @click="removeApprover(name)"
              >
                <PhX :size="10" />
              </button>
            </Badge>
            <span v-if="!publishApprovers.length" class="text-xs text-muted-foreground">
              No approvers specified
            </span>
          </div>

          <div class="mt-1 flex gap-2">
            <Select v-model="newApproverName">
              <SelectTrigger class="h-8 flex-1 text-xs">
                <SelectValue placeholder="Add an approver..." />
              </SelectTrigger>
              <SelectContent class="text-xs">
                <SelectItem
                  v-for="user in tenantUsers"
                  :key="user.$id"
                  :value="user.name"
                  :disabled="publishApprovers.includes(user.name)"
                >
                  {{ user.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              class="h-8"
              :disabled="!newApproverName"
              @click="addApprover"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter class="flex items-center gap-2 sm:justify-between">
        <Button variant="outline" size="sm" :disabled="isPublishing" @click="emit('update:open', false)">
          Cancel
        </Button>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            class="gap-1 text-xs"
            :disabled="isPublishing"
            @click="emit('publishMinor')"
          >
            <PhUploadSimple :size="14" />
            {{ isPublishing ? 'Publishing…' : 'Publish as minor' }}
          </Button>
          <Button
            size="sm"
            class="gap-1 bg-primary text-xs text-primary-foreground"
            :disabled="isPublishing"
            @click="emit('publishMajor')"
          >
            <PhPaperPlaneTilt :size="14" />
            {{
              isPublishing
                ? 'Publishing…'
                : publishApprovers.length
                  ? 'Request approval'
                  : 'Publish as major'
            }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
