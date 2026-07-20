<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import {
  useDocuments,
  useUpdateDocumentMutation,
  useUpdateDocumentApproversMutation,
  getClassificationLabel,
  type DocumentClassification,
  type DocumentItem,
} from '@/composables/useDocuments'
import { getCategoryDisplayLabel } from '@/lib/documentDisplay'

const props = defineProps<{
  open: boolean
  document: DocumentItem
  tenantUsers: Array<{ $id: string; name: string }>
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const { updateDocument, addActivity } = useDocuments()
const { mutateAsync: updateDocumentMutation, isPending: isUpdatingDocument } =
  useUpdateDocumentMutation()
const { mutateAsync: updateDocumentApproversMutation, isPending: isUpdatingApprovers } =
  useUpdateDocumentApproversMutation()

const editCategory = ref<DocumentItem['category']>('policy')
const editClassification = ref<DocumentClassification>('internal')
const editApprovers = ref<string[]>([])
const approverSearch = ref('')
const approverDropdownOpen = ref(false)
const highlightedApproverIndex = ref(-1)

const availableApproverPool = computed(() =>
  props.tenantUsers.filter((user) => !editApprovers.value.includes(user.$id)),
)

const filteredApproverPool = computed(() =>
  availableApproverPool.value.filter((user) =>
    user.name.toLowerCase().includes(approverSearch.value.toLowerCase()),
  ),
)

const hasMetadataChanges = computed(() => {
  const doc = props.document
  return editCategory.value !== doc.category || editClassification.value !== doc.classification
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    editCategory.value = props.document.category
    editClassification.value = props.document.classification
    editApprovers.value = [...props.document.approverIds]
    approverSearch.value = ''
    approverDropdownOpen.value = false
    highlightedApproverIndex.value = -1
  },
)

function resolveApproverName(approverId: string) {
  const fromTenant = props.tenantUsers.find((user) => user.$id === approverId)?.name
  if (fromTenant) return fromTenant

  const index = props.document.approverIds.indexOf(approverId)
  if (index >= 0 && props.document.approvers[index]) return props.document.approvers[index]

  return approverId
}

function resolveApproverNames(approverIds: string[]) {
  return approverIds.map(resolveApproverName)
}

async function syncApprovers(approverIds: string[], activityMessage?: string) {
  const previousApproverIds = [...editApprovers.value]
  editApprovers.value = approverIds

  try {
    await updateDocumentApproversMutation({
      documentId: props.document.id,
      approverIds,
    })
    updateDocument(props.document.id, {
      approverIds,
      approvers: resolveApproverNames(approverIds),
    })
    if (activityMessage) {
      addActivity(props.document.id, activityMessage)
    }
  } catch {
    editApprovers.value = previousApproverIds
  }
}

function selectApprover(userId: string) {
  if (editApprovers.value.includes(userId)) return
  const nextApproverIds = [...editApprovers.value, userId]
  void syncApprovers(nextApproverIds, `Added ${resolveApproverName(userId)} as approver`)
  approverSearch.value = ''
  highlightedApproverIndex.value = -1
}

function handleApproverKeydown(e: KeyboardEvent) {
  const list = filteredApproverPool.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    approverDropdownOpen.value = true
    highlightedApproverIndex.value = Math.min(highlightedApproverIndex.value + 1, list.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedApproverIndex.value = Math.max(highlightedApproverIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const selectedApprover =
      highlightedApproverIndex.value >= 0 ? list[highlightedApproverIndex.value] : list[0]
    if (selectedApprover && (highlightedApproverIndex.value >= 0 || list.length === 1)) {
      selectApprover(selectedApprover.$id)
    }
  } else if (e.key === 'Escape') {
    approverDropdownOpen.value = false
  } else if (e.key === 'Backspace' && !approverSearch.value && editApprovers.value.length) {
    const removedId = editApprovers.value.at(-1)
    if (removedId) {
      const nextApproverIds = editApprovers.value.slice(0, -1)
      void syncApprovers(
        nextApproverIds,
        `Removed ${resolveApproverName(removedId)} from approvers`,
      )
    }
  }
}

function onApproverSearchFocus() {
  approverDropdownOpen.value = true
  highlightedApproverIndex.value = -1
}

function onApproverSearchBlur() {
  setTimeout(() => {
    approverDropdownOpen.value = false
  }, 150)
}

function removeEditApprover(userId: string) {
  const nextApproverIds = editApprovers.value.filter((id) => id !== userId)
  void syncApprovers(nextApproverIds, `Removed ${resolveApproverName(userId)} from approvers`)
}

async function saveEditDialog() {
  if (!hasMetadataChanges.value) return

  const doc = props.document
  const updates: { documentType?: string; classification?: string } = {}
  if (editCategory.value !== doc.category) updates.documentType = editCategory.value
  if (editClassification.value !== doc.classification) {
    updates.classification = editClassification.value
  }

  await updateDocumentMutation({
    documentId: doc.id,
    updates,
  })

  if (editCategory.value !== doc.category) {
    addActivity(doc.id, `Changed type to ${getCategoryDisplayLabel(editCategory.value)}`)
  }
  if (editClassification.value !== doc.classification) {
    addActivity(
      doc.id,
      `Changed classification to ${getClassificationLabel(editClassification.value)}`,
    )
  }

  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg" @pointer-down-outside.prevent>
      <DialogHeader>
        <DialogTitle>Edit document</DialogTitle>
        <DialogDescription>Update the details and properties of this document.</DialogDescription>
      </DialogHeader>
      <form class="space-y-5" @submit.prevent="saveEditDialog">
        <div class="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="edit-doc-type">Type</Label>
              <Select v-model="editCategory">
                <SelectTrigger id="edit-doc-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="sop">SOP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label for="edit-doc-classification">Classification</Label>
              <Select v-model="editClassification">
                <SelectTrigger id="edit-doc-classification">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Approvers</Label>
            <div class="relative">
              <div
                class="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              >
                <Badge
                  v-for="approverId in editApprovers"
                  :key="approverId"
                  variant="secondary"
                  class="gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {{ resolveApproverName(approverId) }}
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-foreground"
                    :aria-label="`Remove ${resolveApproverName(approverId)}`"
                    :disabled="isUpdatingApprovers"
                    @click="removeEditApprover(approverId)"
                  >
                    <PhX :size="10" />
                  </button>
                </Badge>
                <input
                  v-model="approverSearch"
                  class="min-w-[120px] flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="Search approvers..."
                  autocomplete="off"
                  :disabled="isUpdatingApprovers"
                  @focus="onApproverSearchFocus"
                  @blur="onApproverSearchBlur"
                  @keydown="handleApproverKeydown"
                />
              </div>
              <ul
                v-if="approverDropdownOpen && filteredApproverPool.length"
                class="absolute inset-x-0 top-full z-50 mt-1 max-h-[160px] overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
              >
                <li
                  v-for="(user, idx) in filteredApproverPool"
                  :key="user.$id"
                  class="cursor-pointer px-3 py-1.5 text-xs text-foreground transition-colors"
                  :class="
                    idx === highlightedApproverIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  "
                  @mousedown.prevent="selectApprover(user.$id)"
                >
                  {{ user.name }}
                </li>
              </ul>
              <p
                v-if="approverDropdownOpen && approverSearch && !filteredApproverPool.length"
                class="absolute inset-x-0 top-full z-50 mt-1 rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md"
              >
                No matching approvers
              </p>
            </div>
            <p class="text-[11px] text-muted-foreground">
              Approver changes are saved immediately.
              <span v-if="isUpdatingApprovers"> Saving…</span>
            </p>
          </div>
        </div>

        <DialogFooter class="border-t border-border pt-3">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ hasMetadataChanges ? 'Cancel' : 'Close' }}
          </Button>
          <Button type="submit" :disabled="!hasMetadataChanges || isUpdatingDocument">
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
