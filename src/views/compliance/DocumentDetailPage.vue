<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhCaretRight,
  PhClock,
  PhCheckCircle,
  PhX,
  PhPlus,
  PhTrash,
  PhUser,
  PhNoteBlank,
  PhUploadSimple,
  PhPaperPlaneTilt,
  PhArrowCounterClockwise,
  PhShieldCheck,
  PhPencilSimple,
  PhStamp,
  PhPenNib,
  PhHourglass,
  PhXCircle,
  PhSliders,
} from '@phosphor-icons/vue'
import {
  useDocuments,
  useDocumentQuery,
  useUpdateDocumentMutation,
  useUpdateDocumentApproversMutation,
  getClassificationLabel,
  type DocumentClassification,
  type DocumentItem,
} from '@/composables/useDocuments'
import { useTenantControlSearchQuery } from '@/composables/useControls'
import DocumentEditor from '@/components/compliance/DocumentEditor.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import { useTenantUsersQuery } from '@/composables/useTenants'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

type DocumentTab = 'content' | 'controls' | 'versions' | 'activity' | 'approvals' | 'signatures'

interface ApprovalRecord {
  approver: string
  status: 'approved' | 'pending' | 'rejected'
  requestedAt: string
  respondedAt?: string
}

interface SignatureRecord {
  id: string
  signatory: string
  role: string
  status: 'signed' | 'pending' | 'declined'
  signedAt?: string
}

const route = useRoute()
const router = useRouter()

const documentId = computed(() => route.params.documentId as string)
const orgSlug = computed(() => route.params.organizationSlug as string)

const { isPending: isDocumentLoading, isError: isDocumentError } = useDocumentQuery(documentId)
const { mutateAsync: updateDocumentMutation, isPending: isUpdatingDocument } =
  useUpdateDocumentMutation()
const { mutateAsync: updateDocumentApproversMutation, isPending: isUpdatingApprovers } =
  useUpdateDocumentApproversMutation()
const { data: tenantUsersData } = useTenantUsersQuery()
const tenantUsers = computed(() => tenantUsersData.value?.users ?? [])

function resolveApproverName(approverId: string) {
  const fromTenant = tenantUsers.value.find((user) => user.$id === approverId)?.name
  if (fromTenant) return fromTenant

  const doc = documentItem.value
  const index = doc?.approverIds.indexOf(approverId) ?? -1
  if (index >= 0 && doc?.approvers[index]) return doc.approvers[index]

  return approverId
}

function resolveApproverNames(approverIds: string[]) {
  return approverIds.map(resolveApproverName)
}

const {
  getDocumentById,
  updateDocument,
  addActivity,
  publishVersion,
  requestApproval,
  getDocumentControls,
  linkDocumentControl,
  unlinkDocumentControl,
} = useDocuments()

const documentItem = computed(() => getDocumentById(documentId.value))
const linkedControls = computed(() => getDocumentControls(documentId.value))

const publishedVersionLabel = computed(() => {
  const published = documentItem.value?.currentPublishedVersion
  return published ? published : 'Not published'
})

function goBack() {
  void router.push({
    name: 'compliance-documents',
    params: { organizationSlug: orgSlug.value },
  })
}

const activeTab = ref<DocumentTab>('content')

const tabs = computed(
  () =>
    [
      { id: 'content' as const, label: 'Content', count: 0 },
      {
        id: 'controls' as const,
        label: 'Controls',
        count: linkedControls.value.length,
      },
      {
        id: 'versions' as const,
        label: 'Versions',
        count: documentItem.value?.versions.length || 0,
      },
      {
        id: 'activity' as const,
        label: 'Activity',
        count: documentItem.value?.activity.length || 0,
      },
      {
        id: 'approvals' as const,
        label: 'Approvals',
        count: documentItem.value?.approvers.length || 0,
      },
      { id: 'signatures' as const, label: 'Signatures', count: signatureRecords.value.length },
    ] as const,
)

function getUserInitials(name: string) {
  if (!name) return 'U'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getCategoryLabel(category: string) {
  if (category === 'policy') return 'Policies'
  if (category === 'procedure') return 'Procedures'
  if (category === 'sop') return 'SOPs'
  return `${category}s`
}

function getCategoryDisplayLabel(category: string) {
  if (category === 'policy') return 'Policy'
  if (category === 'procedure') return 'Procedure'
  if (category === 'sop') return 'SOP'
  return category
}

const isEditingTitle = ref(false)
const inlineTitle = ref('')

function startTitleEdit() {
  if (!documentItem.value) return
  inlineTitle.value = documentItem.value.title
  isEditingTitle.value = true
}

function saveTitleEdit() {
  if (!documentItem.value || !inlineTitle.value.trim()) return
  const oldTitle = documentItem.value.title
  const newTitle = inlineTitle.value.trim()
  if (newTitle !== oldTitle) {
    updateDocument(documentItem.value.id, { title: newTitle })
    addActivity(documentItem.value.id, `Renamed from "${oldTitle}" to "${newTitle}"`)
  }
  isEditingTitle.value = false
}

function cancelTitleEdit() {
  isEditingTitle.value = false
}

const isEditDialogOpen = ref(false)
const editCategory = ref<DocumentItem['category']>('policy')
const editClassification = ref<DocumentClassification>('internal')
const editApprovers = ref<string[]>([])
const approverSearch = ref('')
const approverDropdownOpen = ref(false)
const highlightedApproverIndex = ref(-1)

const availableApproverPool = computed(() =>
  tenantUsers.value.filter((user) => !editApprovers.value.includes(user.$id)),
)

const filteredApproverPool = computed(() =>
  availableApproverPool.value.filter((user) =>
    user.name.toLowerCase().includes(approverSearch.value.toLowerCase()),
  ),
)

function openEditDialog() {
  if (!documentItem.value) return
  editCategory.value = documentItem.value.category
  editClassification.value = documentItem.value.classification
  editApprovers.value = [...documentItem.value.approverIds]
  approverSearch.value = ''
  approverDropdownOpen.value = false
  highlightedApproverIndex.value = -1
  isEditDialogOpen.value = true
}

async function syncApprovers(approverIds: string[], activityMessage?: string) {
  if (!documentItem.value) return

  const previousApproverIds = [...editApprovers.value]
  editApprovers.value = approverIds

  try {
    await updateDocumentApproversMutation({
      documentId: documentItem.value.id,
      approverIds,
    })
    updateDocument(documentItem.value.id, {
      approverIds,
      approvers: resolveApproverNames(approverIds),
    })
    if (activityMessage) {
      addActivity(documentItem.value.id, activityMessage)
    }
  } catch {
    editApprovers.value = previousApproverIds
  }
}

function selectApprover(userId: string) {
  if (!documentItem.value || editApprovers.value.includes(userId)) return
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
    if (documentItem.value && removedId) {
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
  if (!documentItem.value) return
  const nextApproverIds = editApprovers.value.filter((id) => id !== userId)
  void syncApprovers(
    nextApproverIds,
    `Removed ${resolveApproverName(userId)} from approvers`,
  )
}

const hasMetadataChanges = computed(() => {
  if (!documentItem.value) return false
  const doc = documentItem.value
  return (
    editCategory.value !== doc.category ||
    editClassification.value !== doc.classification
  )
})

async function saveEditDialog() {
  if (!documentItem.value || !hasMetadataChanges.value) return

  const doc = documentItem.value
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
    addActivity(doc.id, `Changed classification to ${getClassificationLabel(editClassification.value)}`)
  }

  isEditDialogOpen.value = false
}

const statusConfig = computed(() => {
  const status = documentItem.value?.status || 'draft'
  if (status === 'approved') {
    return {
      label: 'Approved',
      icon: PhCheckCircle,
      class: 'border-success/30 bg-success/10 text-success-emphasis',
    }
  }
  if (status === 'in-review') {
    return {
      label: 'In review',
      icon: PhClock,
      class: 'border-warning/30 bg-warning/10 text-warning-emphasis',
    }
  }
  return {
    label: 'Draft',
    icon: PhNoteBlank,
    class: 'border-border bg-secondary text-muted-foreground',
  }
})

const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')

watch(
  () => documentItem.value?.content,
  (newContent, oldContent) => {
    if (oldContent !== undefined && newContent !== oldContent) {
      saveStatus.value = 'saving'
      setTimeout(() => {
        saveStatus.value = 'saved'
      }, 1000)
    }
  },
)

const isPublishDialogOpen = ref(false)
const publishChangelog = ref('')
const publishApprovers = ref<string[]>([])
const newApproverName = ref('')

function openPublishDialog() {
  if (!documentItem.value) return
  publishChangelog.value = ''
  publishApprovers.value = [...documentItem.value.approvers]
  isPublishDialogOpen.value = true
}

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

function handlePublish(versionType: 'minor' | 'major') {
  if (!documentItem.value) return
  publishVersion(documentItem.value.id, {
    changelog: publishChangelog.value,
    approvers: publishApprovers.value,
    versionType,
  })
  isPublishDialogOpen.value = false
}

function handleRequestApproval() {
  if (!documentItem.value) return
  requestApproval(documentItem.value.id, {
    changelog: publishChangelog.value,
    approvers: publishApprovers.value,
  })
  isPublishDialogOpen.value = false
  activeTab.value = 'approvals'
}

const isLinkControlDialogOpen = ref(false)
const controlSearchQuery = ref('')
const selectedControlId = ref('')
const isControlSearchEnabled = computed(
  () => isLinkControlDialogOpen.value && controlSearchQuery.value.trim().length > 0,
)
const { data: controlSearchData, isPending: isControlSearchPending } =
  useTenantControlSearchQuery(controlSearchQuery, isControlSearchEnabled)
const availableControls = computed(() => controlSearchData.value?.tenantControls ?? [])

function openLinkControlDialog() {
  controlSearchQuery.value = ''
  selectedControlId.value = ''
  isLinkControlDialogOpen.value = true
}

function linkControl() {
  if (!documentItem.value || !selectedControlId.value) return
  const control = availableControls.value.find(
    (candidate) => candidate.tenantControlId === selectedControlId.value,
  )
  if (!control) return

  linkDocumentControl(documentItem.value.id, control)
  isLinkControlDialogOpen.value = false
}

function unlinkControl(tenantControlId: string) {
  if (!documentItem.value) return
  unlinkDocumentControl(documentItem.value.id, tenantControlId)
}

function restoreVersion(versionContent: string, versionLabel: string) {
  if (!documentItem.value) return
  updateDocument(documentItem.value.id, { content: versionContent })
  addActivity(documentItem.value.id, `Restored content to version ${versionLabel}`)
  activeTab.value = 'content'
}

const approvalRecords = computed<ApprovalRecord[]>(() => {
  const doc = documentItem.value
  if (!doc || !doc.approvers.length) return []

  const baseStatus =
    doc.status === 'approved' ? 'approved' : doc.status === 'in-review' ? 'pending' : 'pending'

  return doc.approvers.map((approver, index) => ({
    approver,
    status:
      doc.status === 'approved'
        ? 'approved'
        : doc.status === 'in-review' && index === 0
          ? 'approved'
          : baseStatus,
    requestedAt: doc.updatedAt,
    respondedAt: doc.status === 'approved' || (doc.status === 'in-review' && index === 0)
      ? doc.updatedAt
      : undefined,
  }))
})

const approvalSummary = computed(() => {
  const doc = documentItem.value
  if (!doc) return { label: 'Not started', tone: 'muted' as const }

  if (doc.status === 'approved') {
    return { label: 'All approvers signed off', tone: 'success' as const }
  }
  if (doc.status === 'in-review') {
    const pending = approvalRecords.value.filter((r) => r.status === 'pending').length
    return { label: `${pending} approval${pending === 1 ? '' : 's'} pending`, tone: 'warning' as const }
  }
  return { label: 'No approval requested', tone: 'muted' as const }
})

const signatureRecords = computed<SignatureRecord[]>(() => {
  const doc = documentItem.value
  if (!doc || doc.category !== 'policy' || !doc.approvers.length) return []

  return doc.approvers.map((approver, index) => ({
    id: `sig-${index}`,
    signatory: approver,
    role: index === 0 ? 'Policy author' : 'Approver',
    status: doc.status === 'approved' ? 'signed' : 'pending',
    signedAt: doc.status === 'approved' ? doc.updatedAt : undefined,
  }))
})

const signatureSummary = computed(() => {
  const total = signatureRecords.value.length
  if (!total) return { label: 'Not required for this document type', tone: 'muted' as const }

  const signed = signatureRecords.value.filter((s) => s.status === 'signed').length
  if (signed === total) return { label: 'All signatures collected', tone: 'success' as const }
  return {
    label: `${signed} of ${total} signed`,
    tone: 'warning' as const,
  }
})

function getApprovalTimeDisplay(record: ApprovalRecord) {
  if (record.respondedAt) {
    return {
      prefix: record.status === 'approved' ? 'Approved' : 'Responded',
      time: record.respondedAt,
    }
  }
  return {
    prefix: 'Requested',
    time: record.requestedAt,
  }
}

const visibleApprovers = computed(() => documentItem.value?.approvers.slice(0, 3) ?? [])

const approverSummary = computed(() => {
  const list = documentItem.value?.approvers ?? []
  if (list.length === 0) return ''
  if (list.length <= 2) return list.join(', ')
  return `${list[0]}, ${list[1]} +${list.length - 2}`
})

function approvalStatusConfig(status: ApprovalRecord['status']) {
  if (status === 'approved') {
    return {
      label: 'Approved',
      icon: PhCheckCircle,
      class: 'border-success/30 bg-success/10 text-success-emphasis',
    }
  }
  if (status === 'rejected') {
    return {
      label: 'Rejected',
      icon: PhXCircle,
      class: 'border-destructive/30 bg-destructive/10 text-destructive',
    }
  }
  return {
    label: 'Pending',
    icon: PhHourglass,
    class: 'border-warning/30 bg-warning/10 text-warning-emphasis',
  }
}

function signatureStatusConfig(status: SignatureRecord['status']) {
  if (status === 'signed') {
    return {
      label: 'Signed',
      icon: PhCheckCircle,
      class: 'border-success/30 bg-success/10 text-success-emphasis',
    }
  }
  if (status === 'declined') {
    return {
      label: 'Declined',
      icon: PhXCircle,
      class: 'border-destructive/30 bg-destructive/10 text-destructive',
    }
  }
  return {
    label: 'Awaiting signature',
    icon: PhPenNib,
    class: 'border-warning/30 bg-warning/10 text-warning-emphasis',
  }
}
</script>

<template>
  <ClarusLoadingState
    v-if="isDocumentLoading"
    variant="compact"
    label="Loading document…"
    class="py-20"
  />
  <div v-else-if="isDocumentError" class="py-20 text-center">
    <p class="text-lg text-muted-foreground">Failed to load document.</p>
    <Button class="mt-4" @click="goBack">Back to Documents</Button>
  </div>
  <div v-else-if="documentItem" class="flex flex-col gap-5">
    <header class="flex flex-col gap-5">
      <nav class="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <router-link
          :to="{ name: 'compliance-documents', params: { organizationSlug: orgSlug } }"
          class="font-medium capitalize transition-colors hover:text-foreground"
        >
          {{ getCategoryLabel(documentItem.category) }}
        </router-link>
        <PhCaretRight :size="13" class="text-muted-foreground/60" aria-hidden="true" />
        <span class="max-w-[min(48vw,420px)] truncate font-medium text-foreground">{{
          documentItem.title
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
            <span class="font-mono text-xs text-muted-foreground">{{ documentItem.version }}</span>
          </div>
          <div class="group/title inline-flex max-w-full items-baseline gap-1.5">
            <h1
              v-if="!isEditingTitle"
              class="text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl"
              style="text-wrap: balance"
            >
              {{ documentItem.title }}
            </h1>
            <Input
              v-else
              v-model="inlineTitle"
              class="h-auto border-primary/40 bg-transparent px-1.5 py-0.5 text-xl font-semibold leading-tight tracking-tight text-foreground focus-visible:ring-primary sm:text-2xl"
              @keydown.enter="saveTitleEdit"
              @keydown.escape="cancelTitleEdit"
              @vue:mounted="($event: { el: HTMLInputElement }) => $event.el.focus()"
            />
            <Button
              v-if="!isEditingTitle"
              variant="ghost"
              size="icon-sm"
              class="size-6 shrink-0 translate-y-[0.12em] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/title:opacity-100 group-focus-within/title:opacity-100 focus-visible:opacity-100"
              aria-label="Edit title"
              @click="startTitleEdit"
            >
              <PhPencilSimple :size="14" />
            </Button>
            <template v-else>
              <Button
                variant="ghost"
                size="icon-sm"
                class="size-6 shrink-0 translate-y-[0.12em] text-muted-foreground hover:text-success"
                aria-label="Save title"
                @click="saveTitleEdit"
              >
                <PhCheckCircle :size="14" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                class="size-6 shrink-0 translate-y-[0.12em] text-muted-foreground hover:text-destructive"
                aria-label="Cancel editing"
                @click="cancelTitleEdit"
              >
                <PhX :size="14" />
              </Button>
            </template>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1.5 text-xs font-semibold"
            @click="openEditDialog"
          >
            <PhPencilSimple :size="15" />
            Edit
          </Button>
          <Button size="sm" class="h-8 gap-1.5 px-3.5 text-xs font-semibold" @click="openPublishDialog">
            <PhUploadSimple :size="15" weight="bold" />
            Publish
          </Button>
        </div>
      </div>
    </header>

    <div
      class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground"
      aria-label="Document properties"
    >
      <div class="inline-flex items-center gap-1.5">
        <PhSliders :size="14" class="text-success/85" />
        <span class="text-muted-foreground">Type:</span>
        <span class="font-semibold capitalize text-foreground">{{
          getCategoryDisplayLabel(documentItem.category)
        }}</span>
      </div>

      <span class="select-none text-muted-foreground/35" aria-hidden="true">&bull;</span>

      <div class="inline-flex items-center gap-1.5">
        <PhShieldCheck :size="14" class="text-info/80" />
        <span class="text-muted-foreground">Classification:</span>
        <span class="font-semibold text-foreground">{{
          getClassificationLabel(documentItem.classification)
        }}</span>
      </div>

      <span class="select-none text-muted-foreground/35" aria-hidden="true">&bull;</span>

      <div class="inline-flex items-center gap-1.5">
        <PhUser :size="14" class="text-primary/70" />
        <span class="text-muted-foreground">Approvers:</span>
        <span
          v-if="documentItem.approvers.length"
          class="inline-flex items-center gap-1.5 font-medium text-foreground"
        >
          <span class="flex -space-x-1.5" aria-hidden="true">
            <Avatar
              v-for="approver in visibleApprovers"
              :key="approver"
              class="size-4 ring-2 ring-card"
            >
              <AvatarFallback class="text-[8px] font-bold">{{
                getUserInitials(approver)
              }}</AvatarFallback>
            </Avatar>
          </span>
          {{ approverSummary }}
        </span>
        <span v-else class="italic text-muted-foreground">None assigned</span>
      </div>

      <span class="select-none text-muted-foreground/35" aria-hidden="true">&bull;</span>

      <div class="inline-flex items-center gap-1.5">
        <PhUploadSimple :size="14" class="text-success/85" />
        <span class="text-muted-foreground">Published:</span>
        <span
          class="font-semibold"
          :class="documentItem.currentPublishedVersion ? 'text-foreground' : 'italic text-muted-foreground'"
        >
          {{ publishedVersionLabel }}
        </span>
      </div>

      <span class="select-none text-muted-foreground/35" aria-hidden="true">&bull;</span>

      <div class="inline-flex items-center gap-1.5">
        <PhClock :size="14" class="text-warning-emphasis/80" />
        <span class="text-muted-foreground">Updated:</span>
        <span class="font-medium text-foreground">{{ documentItem.updatedAt }}</span>
      </div>
    </div>

    <div class="space-y-4">
      <div
        class="scrollbar-none flex overflow-x-auto border-b border-border"
        role="tablist"
        aria-label="Document sections"
      >
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === t.id"
          class="relative whitespace-nowrap px-4 pb-3 text-sm font-medium transition-colors focus-visible:outline-none"
          :class="
            activeTab === t.id
              ? 'font-semibold text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="activeTab = t.id"
        >
          {{ t.label }}
          <span
            v-if="t.count > 0"
            class="ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            :class="
              activeTab === t.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            "
          >
            {{ t.count }}
          </span>
          <span
            v-if="activeTab === t.id"
            class="absolute inset-x-0 bottom-0 h-[2px] rounded-t bg-primary"
          />
        </button>
      </div>

      <div class="min-h-[400px]">
        <!-- Content -->
        <div v-if="activeTab === 'content'" class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
            <div class="flex items-center gap-2 text-muted-foreground" aria-live="polite">
              <div
                class="size-2 rounded-full ring-2 ring-background"
                :class="
                  saveStatus === 'saved'
                    ? 'bg-success'
                    : saveStatus === 'saving'
                      ? 'animate-pulse bg-warning'
                      : 'bg-muted'
                "
              />
              <span v-if="saveStatus === 'saved'">All changes saved</span>
              <span v-else-if="saveStatus === 'saving'">Saving changes…</span>
              <span v-else>Unsaved changes</span>
            </div>
            <span class="text-muted-foreground/70">Autosaves as you type</span>
          </div>

          <DocumentEditor
            v-model="documentItem.content"
            :title="documentItem.title"
            :version="documentItem.version"
          />
        </div>

        <!-- Controls -->
        <div
          v-else-if="activeTab === 'controls'"
          class="overflow-hidden rounded-lg border border-border bg-card"
        >
          <div class="flex items-center justify-between border-b border-border bg-muted/20 p-4">
            <div>
              <h2 class="text-sm font-semibold text-foreground">Linked controls</h2>
              <p class="text-xs text-muted-foreground">
                Connect this document to tenant controls.
              </p>
            </div>
            <Button size="sm" class="gap-1.5" @click="openLinkControlDialog">
              <PhPlus :size="14" weight="bold" />
              Link control
            </Button>
          </div>

          <table v-if="linkedControls.length" class="w-full border-collapse text-left text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <th class="w-[22%] px-5 py-2.5">Control ID</th>
                <th class="px-5 py-2.5">Control name</th>
                <th class="w-[20%] px-5 py-2.5">Status</th>
                <th class="w-12 px-5 py-2.5"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="control in linkedControls"
                :key="control.tenantControlId"
                class="border-b border-border/50 last:border-0"
              >
                <td class="px-5 py-3.5 font-mono text-xs font-semibold text-foreground">
                  {{ control.controlKey }}
                </td>
                <td class="px-5 py-3.5">
                  <router-link
                    :to="{
                      name: 'compliance-control-detail',
                      params: { organizationSlug: orgSlug, controlId: control.controlKey },
                    }"
                    class="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {{ control.name }}
                  </router-link>
                </td>
                <td class="px-5 py-3.5 text-xs capitalize text-muted-foreground">
                  {{ control.implementationStatus.replace(/_/g, ' ') }}
                </td>
                <td class="px-5 py-3.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    :aria-label="`Unlink ${control.controlKey}`"
                    @click="unlinkControl(control.tenantControlId)"
                  >
                    <PhTrash :size="14" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-else class="flex flex-col items-center justify-center px-5 py-14 text-center">
            <PhShieldCheck :size="22" class="mb-3 text-muted-foreground" />
            <p class="text-sm font-medium text-foreground">No controls linked</p>
            <p class="mt-1 max-w-[300px] text-xs text-muted-foreground">
              Search your tenant controls and link the ones supported by this document.
            </p>
            <Button variant="outline" size="sm" class="mt-4 gap-1.5" @click="openLinkControlDialog">
              <PhPlus :size="14" weight="bold" />
              Link control
            </Button>
          </div>
        </div>

        <!-- Versions -->
        <div
          v-else-if="activeTab === 'versions'"
          class="overflow-hidden rounded-lg border border-border bg-card"
        >
          <div class="border-b border-border bg-muted/20 p-4">
            <h2 class="text-sm font-semibold text-foreground">Version history</h2>
            <p class="text-xs text-muted-foreground">
              Review prior iterations and restore earlier content when needed.
            </p>
          </div>

          <table
            v-if="documentItem.versions.length"
            class="w-full border-collapse text-left text-sm"
          >
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <th class="w-[15%] px-5 py-2.5">Version</th>
                <th class="w-[20%] px-5 py-2.5">Published</th>
                <th class="w-[20%] px-5 py-2.5">Author</th>
                <th class="w-[35%] px-5 py-2.5">Changelog</th>
                <th class="w-[10%] px-5 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in documentItem.versions"
                :key="v.version"
                class="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/15"
              >
                <td class="px-5 py-3.5 align-middle font-mono font-semibold text-foreground">
                  {{ v.version }}
                </td>
                <td class="px-5 py-3.5 align-middle text-muted-foreground">{{ v.updatedAt }}</td>
                <td class="px-5 py-3.5 align-middle">
                  <div class="flex items-center gap-1.5">
                    <PhUser :size="13" class="text-muted-foreground" />
                    <span>{{ v.owner }}</span>
                  </div>
                </td>
                <td class="px-5 py-3.5 align-middle text-xs italic leading-relaxed text-muted-foreground">
                  "{{ v.changelog }}"
                </td>
                <td class="px-5 py-3.5 text-right align-middle">
                  <Button
                    variant="outline"
                    size="sm"
                    class="gap-1 text-xs"
                    @click="restoreVersion(v.content, v.version)"
                  >
                    <PhArrowCounterClockwise :size="13" />
                    Restore
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="flex flex-col items-center justify-center py-14 text-center">
            <span
              class="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50"
            >
              <PhClock :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">No published versions yet</p>
            <p class="mt-1 max-w-[280px] text-xs text-muted-foreground">
              Published versions appear here so you can audit changes over time.
            </p>
          </div>
        </div>

        <!-- Activity -->
        <div
          v-else-if="activeTab === 'activity'"
          class="overflow-hidden rounded-lg border border-border bg-card"
        >
          <div class="border-b border-border bg-muted/20 p-4">
            <h2 class="text-sm font-semibold text-foreground">Activity</h2>
            <p class="text-xs text-muted-foreground">
              A chronological log of changes to this document.
            </p>
          </div>

          <div v-if="documentItem.activity.length" class="divide-y divide-border/50 px-5">
            <div
              v-for="act in documentItem.activity"
              :key="act.id"
              class="flex items-start justify-between gap-4 py-3.5"
            >
              <div class="flex min-w-0 items-start gap-3">
                <Avatar class="size-7 shrink-0">
                  <AvatarFallback
                    class="bg-secondary text-[10px] font-semibold text-secondary-foreground"
                  >
                    {{ getUserInitials(act.user) }}
                  </AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                  <p class="text-sm text-foreground">
                    <span class="font-semibold">{{ act.user }}</span>
                    <span class="text-muted-foreground"> {{ act.action }}</span>
                  </p>
                </div>
              </div>
              <span class="shrink-0 text-xs text-muted-foreground">{{ act.timestamp }}</span>
            </div>
          </div>
          <div v-else class="py-14 text-center text-sm text-muted-foreground">
            No activity recorded yet.
          </div>
        </div>

        <!-- Approvals -->
        <div
          v-else-if="activeTab === 'approvals'"
          class="overflow-hidden rounded-lg border border-border bg-card"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"
          >
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <h2 class="text-sm font-semibold text-foreground">Approvals</h2>
              <Badge
                variant="outline"
                :class="[
                  'gap-1 rounded-full px-2 py-0 text-[10px] font-semibold',
                  approvalSummary.tone === 'success'
                    ? 'border-success/30 bg-success/10 text-success-emphasis'
                    : approvalSummary.tone === 'warning'
                      ? 'border-warning/30 bg-warning/10 text-warning-emphasis'
                      : 'border-border bg-muted/50 text-muted-foreground',
                ]"
              >
                {{ approvalSummary.label }}
              </Badge>
              <span class="text-xs text-muted-foreground">· {{ documentItem.version }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                class="h-8 gap-1 px-2.5 text-xs"
                @click="openEditDialog"
              >
                <PhPencilSimple :size="13" />
                Edit approvers
              </Button>
              <Button size="sm" class="h-8 gap-1 px-2.5 text-xs" @click="openPublishDialog">
                <PhStamp :size="13" />
                Request approval
              </Button>
            </div>
          </div>

          <ul v-if="approvalRecords.length" class="divide-y divide-border/60">
            <li
              v-for="record in approvalRecords"
              :key="record.approver"
              class="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/10"
            >
              <Avatar class="size-7 shrink-0">
                <AvatarFallback class="bg-secondary text-[10px] font-semibold text-secondary-foreground">
                  {{ getUserInitials(record.approver) }}
                </AvatarFallback>
              </Avatar>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate text-sm font-medium text-foreground">{{ record.approver }}</span>
                  <Badge
                    variant="outline"
                    :class="[
                      'gap-1 rounded-full px-1.5 py-0 text-[10px] font-semibold',
                      approvalStatusConfig(record.status).class,
                    ]"
                  >
                    <component
                      :is="approvalStatusConfig(record.status).icon"
                      :size="10"
                      weight="fill"
                    />
                    {{ approvalStatusConfig(record.status).label }}
                  </Badge>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-[11px] text-muted-foreground">
                  {{ getApprovalTimeDisplay(record).prefix }}
                </p>
                <p class="text-xs tabular-nums text-foreground">
                  {{ getApprovalTimeDisplay(record).time }}
                </p>
              </div>
            </li>
          </ul>
          <div v-else class="flex flex-col items-center justify-center px-4 py-12 text-center">
            <span
              class="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground/50"
            >
              <PhStamp :size="20" />
            </span>
            <p class="text-sm font-medium text-foreground">No approvers yet</p>
            <p class="mt-1 max-w-[280px] text-xs text-muted-foreground">
              Assign reviewers above, then request approval when this version is ready to publish.
            </p>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs" @click="openEditDialog">
                <PhPencilSimple :size="13" />
                Add approvers
              </Button>
              <Button size="sm" class="h-8 gap-1.5 text-xs" @click="openPublishDialog">
                <PhPaperPlaneTilt :size="13" />
                Request approval
              </Button>
            </div>
          </div>
        </div>

        <!-- Signatures -->
        <div
          v-else-if="activeTab === 'signatures'"
          class="overflow-hidden rounded-lg border border-border bg-card"
        >
          <div class="border-b border-border bg-muted/20 p-4">
            <h2 class="text-sm font-semibold text-foreground">Signatures</h2>
            <p class="text-xs text-muted-foreground">
              Collect acknowledgments from stakeholders after approval.
            </p>
            <p
              class="mt-2 text-xs font-medium"
              :class="{
                'text-success-emphasis': signatureSummary.tone === 'success',
                'text-warning-emphasis': signatureSummary.tone === 'warning',
                'text-muted-foreground': signatureSummary.tone === 'muted',
              }"
            >
              {{ signatureSummary.label }}
            </p>
          </div>

          <table
            v-if="signatureRecords.length"
            class="w-full border-collapse text-left text-sm"
          >
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <th class="w-[35%] px-5 py-2.5">Signatory</th>
                <th class="w-[25%] px-5 py-2.5">Role</th>
                <th class="w-[20%] px-5 py-2.5">Status</th>
                <th class="w-[20%] px-5 py-2.5">Signed</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sig in signatureRecords"
                :key="sig.id"
                class="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/15"
              >
                <td class="px-5 py-3.5 align-middle">
                  <div class="flex items-center gap-2.5">
                    <Avatar class="size-7">
                      <AvatarFallback
                        class="bg-secondary text-[10px] font-semibold text-secondary-foreground"
                      >
                        {{ getUserInitials(sig.signatory) }}
                      </AvatarFallback>
                    </Avatar>
                    <span class="font-medium text-foreground">{{ sig.signatory }}</span>
                  </div>
                </td>
                <td class="px-5 py-3.5 align-middle text-muted-foreground">{{ sig.role }}</td>
                <td class="px-5 py-3.5 align-middle">
                  <Badge
                    variant="outline"
                    :class="[
                      'gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      signatureStatusConfig(sig.status).class,
                    ]"
                  >
                    <component
                      :is="signatureStatusConfig(sig.status).icon"
                      :size="11"
                      weight="fill"
                    />
                    {{ signatureStatusConfig(sig.status).label }}
                  </Badge>
                </td>
                <td class="px-5 py-3.5 align-middle text-muted-foreground">
                  {{ sig.signedAt ?? '—' }}
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="flex flex-col items-center justify-center py-14 text-center">
            <span
              class="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground/50"
            >
              <PhPenNib :size="22" />
            </span>
            <p class="text-sm font-medium text-foreground">Signatures not required</p>
            <p class="mt-1 max-w-[300px] text-xs text-muted-foreground">
              Policy documents typically require stakeholder acknowledgment. Procedures and SOPs
              usually do not.
            </p>
          </div>
        </div>
      </div>
    </div>

    <Dialog :open="isPublishDialogOpen" @update:open="isPublishDialogOpen = $event">
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
              <span v-if="!publishApprovers.length" class="text-xs text-muted-foreground"
                >No approvers specified</span
              >
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
          <Button variant="outline" size="sm" @click="isPublishDialogOpen = false">Cancel</Button>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" class="gap-1 text-xs" @click="handlePublish('minor')">
              <PhUploadSimple :size="14" />
              Publish as minor
            </Button>
            <Button size="sm" class="gap-1 bg-primary text-xs text-primary-foreground" @click="handleRequestApproval">
              <PhPaperPlaneTilt :size="14" />
              Request approval
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="isLinkControlDialogOpen" @update:open="isLinkControlDialogOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Link control</DialogTitle>
          <DialogDescription>
            Search the controls available to this tenant and select one to link.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-3 py-2">
          <Label for="control-search">Search controls</Label>
          <Input
            id="control-search"
            v-model="controlSearchQuery"
            placeholder="Search by control ID or name…"
            autocomplete="off"
          />

          <div
            class="max-h-64 overflow-y-auto rounded-md border border-border"
            aria-live="polite"
          >
            <p
              v-if="!controlSearchQuery.trim()"
              class="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              Enter a control ID or name to search.
            </p>
            <p
              v-else-if="isControlSearchPending"
              class="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              Searching controls…
            </p>
            <p
              v-else-if="availableControls.length === 0"
              class="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              No matching controls found.
            </p>
            <div v-else class="divide-y divide-border">
              <Button
                v-for="control in availableControls"
                :key="control.tenantControlId"
                type="button"
                variant="ghost"
                class="h-auto w-full justify-start rounded-none px-4 py-3 text-left"
                :class="{ 'bg-accent text-accent-foreground': selectedControlId === control.tenantControlId }"
                :disabled="
                  linkedControls.some(
                    (linkedControl) =>
                      linkedControl.tenantControlId === control.tenantControlId,
                  )
                "
                @click="selectedControlId = control.tenantControlId"
              >
                <span class="min-w-0">
                  <span class="flex items-center gap-2">
                    <span class="font-mono text-xs font-semibold">{{ control.controlKey }}</span>
                    <span
                      v-if="
                        linkedControls.some(
                          (linkedControl) =>
                            linkedControl.tenantControlId === control.tenantControlId,
                        )
                      "
                      class="text-xs text-muted-foreground"
                    >
                      Already linked
                    </span>
                  </span>
                  <span class="mt-0.5 block truncate text-sm font-normal text-muted-foreground">
                    {{ control.name }}
                  </span>
                </span>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="isLinkControlDialogOpen = false">Cancel</Button>
          <Button :disabled="!selectedControlId" @click="linkControl">Link control</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-lg" @pointer-down-outside.prevent>
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            Update the details and properties of this document.
          </DialogDescription>
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
                      :class="idx === highlightedApproverIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'"
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
            <Button type="button" variant="outline" @click="isEditDialogOpen = false">
              {{ hasMetadataChanges ? 'Cancel' : 'Close' }}
            </Button>
            <Button type="submit" :disabled="!hasMetadataChanges || isUpdatingDocument">
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
  <div v-else class="py-20 text-center">
    <p class="text-lg text-muted-foreground">Document not found.</p>
    <Button class="mt-4" @click="goBack">Back to Documents</Button>
  </div>
</template>
