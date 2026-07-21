<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhArrowLeft,
  PhCheckCircle,
  PhCircleNotch,
  PhClock,
  PhDownloadSimple,
  PhWarningCircle,
  PhXCircle,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import DocumentEditor from '@/components/compliance/DocumentEditor.vue'
import {
  useDocumentVersionsQuery,
  useDocumentVersionQuery,
  useDocumentApprovalsQuery,
  useDecideDocumentApprovalMutation,
  formatTimeAgo,
  normalizeVersionStatus,
} from '@/composables/useDocuments'
import { useAuth } from '@/composables/useAuth'
import {
  getApprovalStatusConfig,
  getDocumentStatusConfig,
  normalizeApprovalStatus,
} from '@/lib/documentDisplay'
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api'
import type {
  DecideDocumentApprovalAction,
  DocumentVersionItem,
  DocumentVersionApprovalRequest,
} from '@/api/documents'

const COMMENT_MAX_LENGTH = 4096

const route = useRoute()
const router = useRouter()

const documentId = computed(() => route.params.documentId as string)
const approvalRequestId = computed(() => route.params.approvalRequestId as string)
const orgSlug = computed(() => route.params.organizationSlug as string)

const { accountQuery } = useAuth()
const currentUserEmail = computed(() => accountQuery.data.value?.email ?? '')
const currentUserId = computed(() => accountQuery.data.value?.$id ?? '')

const {
  data: versionsResponse,
  isPending: isVersionsLoading,
  isError: isVersionsError,
} = useDocumentVersionsQuery(documentId, { limit: 50, offset: 0 })

const { data: approvalsResponse, isPending: isApprovalsLoading } = useDocumentApprovalsQuery(
  documentId,
  { limit: 50, offset: 0 },
)

const {
  mutateAsync: decideApproval,
  isPending: isSubmittingDecision,
  reset: resetDecideMutation,
} = useDecideDocumentApprovalMutation()

const approvalRequest = computed<DocumentVersionApprovalRequest | undefined>(() =>
  approvalsResponse.value?.documentVersionApprovalRequests.find(
    (request) => request.$id === approvalRequestId.value,
  ),
)

const versions = computed(() => versionsResponse.value?.documentVersions ?? [])

/** Version waiting for this approval — preferred default selection. */
const reviewTargetVersionId = computed(() => approvalRequest.value?.documentVersionId ?? null)

const selectedVersionId = ref<string | null>(null)
const userPickedVersion = ref(false)

watch(
  [reviewTargetVersionId, versions],
  () => {
    if (userPickedVersion.value) return

    const targetId = reviewTargetVersionId.value
    if (targetId && versions.value.some((v) => v.$id === targetId)) {
      selectedVersionId.value = targetId
      return
    }
    if (!selectedVersionId.value && versions.value[0]) {
      selectedVersionId.value = versions.value[0].$id
    }
  },
  { immediate: true },
)

const selectedVersion = computed(() =>
  versions.value.find((version) => version.$id === selectedVersionId.value),
)

const {
  data: versionDetail,
  isPending: isVersionDetailLoading,
  isError: isVersionDetailError,
  isFetching: isVersionDetailFetching,
} = useDocumentVersionQuery(documentId, selectedVersionId)

const isReviewTarget = computed(() => {
  if (!reviewTargetVersionId.value || !selectedVersionId.value) return false
  return selectedVersionId.value === reviewTargetVersionId.value
})

const previewTitle = computed(
  () =>
    versionDetail.value?.title ||
    selectedVersion.value?.title ||
    approvalRequest.value?.title ||
    'Untitled document',
)

const previewVersionLabel = computed(() => {
  const detail = versionDetail.value
  if (detail) return `v${detail.major}.${detail.minor}`
  if (selectedVersion.value) {
    return `v${selectedVersion.value.major}.${selectedVersion.value.minor}`
  }
  if (approvalRequest.value) {
    return `v${approvalRequest.value.major}.${approvalRequest.value.minor}`
  }
  return ''
})

const previewContent = computed(() => versionDetail.value?.content?.trim() ?? '')

const myDecision = computed(() => {
  if (!currentUserId.value || !approvalRequest.value) return undefined
  return approvalRequest.value.decisions.find(
    (decision) => decision.approverId === currentUserId.value,
  )
})

const isDecisionDialogOpen = ref(false)
const decisionComment = ref('')
const pendingDecision = ref<'approved' | 'rejected' | null>(null)
const decisionError = ref('')
/** Keeps the rail in “already decided” while approvals refetch after submit. */
const localDecisionState = ref<'approved' | 'rejected' | null>(null)
const localDecisionComment = ref('')

const trimmedComment = computed(() => decisionComment.value.trim())
const commentTooLong = computed(() => decisionComment.value.length > COMMENT_MAX_LENGTH)
const rejectNeedsComment = computed(
  () => pendingDecision.value === 'rejected' && !trimmedComment.value,
)
const canSubmitDecision = computed(
  () =>
    !!pendingDecision.value &&
    !isSubmittingDecision.value &&
    !commentTooLong.value &&
    !rejectNeedsComment.value,
)

const effectiveMyDecisionState = computed(() => {
  if (localDecisionState.value) return localDecisionState.value
  return myDecision.value?.state
})

const effectiveMyDecisionComment = computed(() => {
  if (localDecisionState.value) return localDecisionComment.value
  return myDecision.value?.comment ?? ''
})

const canDecide = computed(() => {
  if (localDecisionState.value) return false
  if (!approvalRequest.value || !myDecision.value) return false
  return (
    normalizeApprovalStatus(approvalRequest.value.status) === 'pending' &&
    normalizeApprovalStatus(myDecision.value.state) === 'pending'
  )
})

const isRailLoading = computed(() => isVersionsLoading.value || isApprovalsLoading.value)

const isPreviewLoading = computed(
  () =>
    !!selectedVersionId.value &&
    (isVersionDetailLoading.value || (isVersionDetailFetching.value && !versionDetail.value)),
)

function versionLabel(version: DocumentVersionItem) {
  return `v${version.major}.${version.minor}`
}

function formatListDate(dateString: string) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatFullDate(dateString: string) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function selectVersion(versionId: string) {
  userPickedVersion.value = true
  selectedVersionId.value = versionId
}

function goBack() {
  void router.push({
    name: 'compliance-document-detail',
    params: {
      organizationSlug: orgSlug.value,
      documentId: documentId.value,
    },
  })
}

function mapDecisionToAction(decision: 'approved' | 'rejected'): DecideDocumentApprovalAction {
  return decision === 'approved' ? 'approve' : 'reject'
}

function openDecision(decision: 'approved' | 'rejected') {
  if (!canDecide.value || !isReviewTarget.value || isSubmittingDecision.value) return
  pendingDecision.value = decision
  decisionComment.value = ''
  decisionError.value = ''
  resetDecideMutation()
  isDecisionDialogOpen.value = true
}

function closeDecisionDialog() {
  if (isSubmittingDecision.value) return
  isDecisionDialogOpen.value = false
  pendingDecision.value = null
  decisionComment.value = ''
  decisionError.value = ''
  resetDecideMutation()
}

function onDecisionDialogOpenChange(open: boolean) {
  if (open) {
    isDecisionDialogOpen.value = true
    return
  }
  closeDecisionDialog()
}

function decisionErrorFallback(error: unknown) {
  const status = getApiErrorStatus(error)
  if (status === 403) {
    return 'You are not an assigned approver on this request.'
  }
  if (status === 404) {
    return 'This approval request was not found. It may have been removed.'
  }
  if (status === 429) {
    return 'Too many attempts. Wait a moment, then try again.'
  }
  if (status && status >= 500) {
    return 'The server could not record your decision. Try again in a moment.'
  }
  return 'Could not submit your decision. Check your connection and try again.'
}

async function confirmDecision() {
  if (!canSubmitDecision.value || !pendingDecision.value) return

  decisionError.value = ''
  const action = mapDecisionToAction(pendingDecision.value)
  const comment = trimmedComment.value

  try {
    await decideApproval({
      documentId: documentId.value,
      approvalRequestId: approvalRequestId.value,
      input: {
        action,
        comment,
      },
    })
    localDecisionState.value = pendingDecision.value
    localDecisionComment.value = comment
    isDecisionDialogOpen.value = false
    pendingDecision.value = null
    decisionComment.value = ''
    decisionError.value = ''
  } catch (error) {
    decisionError.value = getApiErrorMessage(error, decisionErrorFallback(error))
  }
}

watch(isDecisionDialogOpen, (open) => {
  if (!open && !isSubmittingDecision.value) {
    pendingDecision.value = null
    decisionComment.value = ''
    decisionError.value = ''
    resetDecideMutation()
  }
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-background lg:flex-row">
    <!-- Review rail -->
    <aside
      class="flex w-full shrink-0 flex-col border-b border-border bg-card lg:w-[340px] lg:border-r lg:border-b-0 xl:w-[380px]"
    >
      <div class="flex items-start gap-3 border-b border-border px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          class="mt-0.5 size-8 shrink-0 p-0"
          aria-label="Back to document"
          @click="goBack"
        >
          <PhArrowLeft :size="16" />
        </Button>
        <div class="min-w-0 flex-1">
          <p class="text-xs text-muted-foreground">Approval review</p>
          <h1 class="mt-0.5 text-base font-semibold text-foreground text-balance">
            {{ approvalRequest?.title || previewTitle || 'Document review' }}
          </h1>
          <div v-if="approvalRequest" class="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              :class="[
                'gap-1 rounded-full px-2 py-0 text-[10px] font-semibold',
                getApprovalStatusConfig(approvalRequest.status).class,
              ]"
            >
              <component
                :is="getApprovalStatusConfig(approvalRequest.status).icon"
                :size="10"
                weight="fill"
              />
              {{ getApprovalStatusConfig(approvalRequest.status).label }}
            </Badge>
            <span class="font-mono text-xs tabular-nums text-muted-foreground">
              v{{ approvalRequest.major }}.{{ approvalRequest.minor }}
            </span>
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div class="mb-2 flex items-baseline justify-between gap-2">
          <h2 class="text-sm font-semibold text-foreground">Versions</h2>
          <span class="text-xs tabular-nums text-muted-foreground">
            {{ versions.length }}
          </span>
        </div>
        <p class="mb-3 text-xs text-muted-foreground text-pretty">
          Open another version to compare. Your decision applies only to the one marked Under
          review.
        </p>

        <ClarusLoadingState
          v-if="isRailLoading"
          variant="compact"
          label="Loading versions…"
          class="py-10"
        />

        <div
          v-else-if="isVersionsError"
          class="rounded-lg border border-border bg-muted/20 px-3 py-6 text-center"
        >
          <PhWarningCircle :size="20" class="mx-auto text-destructive" />
          <p class="mt-2 text-sm font-medium text-foreground">Couldn’t load versions</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Check your connection, then go back and open this review again.
          </p>
        </div>

        <div
          v-else-if="!approvalRequest"
          class="rounded-lg border border-border bg-muted/20 px-3 py-6 text-center"
        >
          <PhWarningCircle :size="20" class="mx-auto text-muted-foreground" />
          <p class="mt-2 text-sm font-medium text-foreground">This approval request isn’t here</p>
          <p class="mt-1 text-xs text-muted-foreground">
            It may already be finished or removed. Return to the document for the latest requests.
          </p>
          <Button variant="outline" size="sm" class="mt-3" @click="goBack">Back to document</Button>
        </div>

        <ul
          v-else-if="versions.length"
          class="space-y-1.5"
          role="listbox"
          aria-label="Document versions"
        >
          <li v-for="version in versions" :key="version.$id">
            <button
              type="button"
              role="option"
              :aria-selected="selectedVersionId === version.$id"
              class="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150"
              :class="
                selectedVersionId === version.$id
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-transparent bg-muted/30 hover:bg-muted/50'
              "
              @click="selectVersion(version.$id)"
            >
              <span
                class="flex size-4 shrink-0 items-center justify-center rounded-full border"
                :class="
                  selectedVersionId === version.$id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background'
                "
                aria-hidden="true"
              >
                <span
                  v-if="selectedVersionId === version.$id"
                  class="size-1.5 rounded-full bg-current"
                />
              </span>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {{ versionLabel(version) }}
                  </span>
                  <Badge
                    v-if="version.$id === reviewTargetVersionId"
                    variant="outline"
                    class="rounded-full border-warning/30 bg-warning/10 px-1.5 py-0 text-[10px] font-semibold text-warning-emphasis"
                  >
                    Under review
                  </Badge>
                </div>
                <p
                  class="mt-0.5 text-xs tabular-nums text-muted-foreground"
                  :title="formatFullDate(version.publishedAt || version.$createdAt)"
                >
                  {{ formatListDate(version.publishedAt || version.$createdAt) }}
                  <span class="text-muted-foreground/70">
                    · {{ formatTimeAgo(version.publishedAt || version.$createdAt) }}
                  </span>
                </p>
              </div>

              <Badge
                variant="outline"
                :class="[
                  'shrink-0 gap-1 rounded-full px-1.5 py-0 text-[10px] font-semibold',
                  getDocumentStatusConfig(normalizeVersionStatus(version.status)).class,
                ]"
              >
                <component
                  :is="getDocumentStatusConfig(normalizeVersionStatus(version.status)).icon"
                  :size="10"
                  weight="fill"
                />
                {{ getDocumentStatusConfig(normalizeVersionStatus(version.status)).label }}
              </Badge>
            </button>
          </li>
        </ul>

        <div v-else class="rounded-lg border border-dashed border-border px-3 py-8 text-center">
          <PhClock :size="20" class="mx-auto text-muted-foreground/50" />
          <p class="mt-2 text-sm font-medium text-foreground">No versions to review</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Versions appear after this document is published.
          </p>
        </div>
      </div>

      <div class="border-t border-border bg-muted/20 px-4 py-4">
        <div v-if="canDecide" class="flex flex-col gap-2">
          <Button
            class="h-10 w-full gap-2 text-sm font-semibold"
            :disabled="!isReviewTarget || isSubmittingDecision"
            @click="openDecision('approved')"
          >
            <PhCheckCircle :size="16" weight="fill" />
            Approve version
          </Button>
          <Button
            variant="outline"
            class="h-9 w-full gap-2 text-sm"
            :disabled="!isReviewTarget || isSubmittingDecision"
            @click="openDecision('rejected')"
          >
            <PhXCircle :size="15" />
            Reject version
          </Button>
          <p v-if="!isReviewTarget" class="text-[11px] text-muted-foreground text-pretty">
            Select the Under review version to record your decision.
          </p>
        </div>
        <div
          v-else-if="
            effectiveMyDecisionState &&
            normalizeApprovalStatus(effectiveMyDecisionState) !== 'pending'
          "
          class="rounded-lg border border-border bg-background px-3 py-2.5"
        >
          <p class="text-xs font-medium text-foreground">You already decided on this request</p>
          <Badge
            variant="outline"
            :class="[
              'mt-1.5 gap-1 rounded-full px-2 py-0 text-[10px] font-semibold',
              getApprovalStatusConfig(effectiveMyDecisionState).class,
            ]"
          >
            <component
              :is="getApprovalStatusConfig(effectiveMyDecisionState).icon"
              :size="10"
              weight="fill"
            />
            {{ getApprovalStatusConfig(effectiveMyDecisionState).label }}
          </Badge>
          <p
            v-if="effectiveMyDecisionComment"
            class="mt-2 line-clamp-3 break-words text-xs text-muted-foreground text-pretty"
            :title="effectiveMyDecisionComment"
          >
            {{ effectiveMyDecisionComment }}
          </p>
        </div>
        <p v-else class="text-xs text-muted-foreground text-pretty">
          No decision is needed from you on this request.
        </p>
      </div>
    </aside>

    <!-- Document preview -->
    <section class="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-foreground">{{ previewTitle }}</p>
          <p class="text-xs text-muted-foreground">
            <span class="font-mono tabular-nums">{{ previewVersionLabel }}</span>
            <span v-if="isReviewTarget" class="text-warning-emphasis"> · Under review</span>
            <span v-else class="text-muted-foreground/70"> · Comparing another version</span>
          </p>
        </div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <PhDownloadSimple :size="14" class="opacity-60" />
          <span>Read-only preview</span>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <ClarusLoadingState
          v-if="isRailLoading || isPreviewLoading"
          variant="compact"
          label="Loading version…"
          class="py-20"
        />

        <div
          v-else-if="isVersionDetailError"
          class="mx-auto flex max-w-md flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-16 text-center"
        >
          <PhWarningCircle :size="22" class="text-destructive" />
          <p class="mt-3 text-sm font-medium text-foreground">Couldn’t load this version</p>
          <p class="mt-1 text-xs text-muted-foreground text-pretty">
            Try selecting it again, or go back to the document and reopen the review.
          </p>
        </div>

        <div
          v-else-if="!selectedVersionId"
          class="mx-auto flex max-w-md flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
        >
          <PhClock :size="22" class="text-muted-foreground/50" />
          <p class="mt-3 text-sm font-medium text-foreground">Select a version</p>
          <p class="mt-1 text-xs text-muted-foreground text-pretty">
            Choose a version in the list to read its content here.
          </p>
        </div>

        <div
          v-else-if="!previewContent"
          class="mx-auto flex max-w-md flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
        >
          <PhClock :size="22" class="text-muted-foreground/50" />
          <p class="mt-3 text-sm font-medium text-foreground">This version has no content</p>
          <p class="mt-1 text-xs text-muted-foreground text-pretty">
            Ask the document owners to publish content before you approve or reject.
          </p>
        </div>

        <DocumentEditor
          v-else
          :key="`${selectedVersionId}-${previewContent.length}`"
          :model-value="previewContent"
          :editable="false"
          :preview-only="true"
          :title="previewTitle"
          :version="previewVersionLabel"
          :download-user-email="currentUserEmail"
          :download-filename="`${previewTitle.replace(/[^a-z0-9]/gi, '_')}_${previewVersionLabel}.pdf`"
        />
      </div>
    </section>

    <Dialog :open="isDecisionDialogOpen" @update:open="onDecisionDialogOpenChange">
      <DialogContent
        class="sm:max-w-md"
        :show-close-button="!isSubmittingDecision"
        @escape-key-down="(event) => isSubmittingDecision && event.preventDefault()"
        @pointer-down-outside="(event) => isSubmittingDecision && event.preventDefault()"
        @interact-outside="(event) => isSubmittingDecision && event.preventDefault()"
      >
        <DialogHeader>
          <DialogTitle>
            {{
              pendingDecision === 'approved'
                ? `Approve ${previewVersionLabel}?`
                : `Reject ${previewVersionLabel}?`
            }}
          </DialogTitle>
          <DialogDescription>
            {{
              pendingDecision === 'approved'
                ? 'Confirm you have reviewed this version and are ready to approve it.'
                : 'This sends the version back to authors. Add a comment so they know what to fix.'
            }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-2">
          <div class="flex items-baseline justify-between gap-2">
            <label class="text-sm font-medium text-foreground" for="decision-comment">
              Comment
              <span v-if="pendingDecision === 'rejected'" class="text-destructive">*</span>
              <span v-else class="font-normal text-muted-foreground">(optional)</span>
            </label>
            <span
              class="text-[11px] tabular-nums"
              :class="commentTooLong ? 'font-medium text-destructive' : 'text-muted-foreground'"
            >
              {{ decisionComment.length }}/{{ COMMENT_MAX_LENGTH }}
            </span>
          </div>
          <Textarea
            id="decision-comment"
            v-model="decisionComment"
            rows="3"
            :maxlength="COMMENT_MAX_LENGTH"
            :disabled="isSubmittingDecision"
            :aria-invalid="commentTooLong || (!!decisionError && pendingDecision === 'rejected')"
            :aria-describedby="
              decisionError
                ? 'decision-error'
                : commentTooLong
                  ? 'decision-comment-hint'
                  : undefined
            "
            class="min-w-0 break-words"
            :placeholder="
              pendingDecision === 'rejected'
                ? 'What should authors change before resubmitting?'
                : 'Optional note for the document owners…'
            "
          />
          <p v-if="commentTooLong" id="decision-comment-hint" class="text-xs text-destructive">
            Comments can be up to {{ COMMENT_MAX_LENGTH }} characters.
          </p>
        </div>

        <div
          v-if="decisionError"
          id="decision-error"
          role="alert"
          class="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
        >
          <PhWarningCircle :size="16" class="mt-0.5 shrink-0 text-destructive" />
          <p class="min-w-0 break-words text-sm text-destructive text-pretty">
            {{ decisionError }}
          </p>
        </div>

        <Separator />

        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" :disabled="isSubmittingDecision" @click="closeDecisionDialog">
            Keep reviewing
          </Button>
          <Button
            :variant="pendingDecision === 'rejected' ? 'destructive' : 'default'"
            :disabled="!canSubmitDecision"
            :aria-busy="isSubmittingDecision"
            @click="confirmDecision"
          >
            <PhCircleNotch
              v-if="isSubmittingDecision"
              :size="14"
              class="animate-spin"
              aria-hidden="true"
            />
            {{
              isSubmittingDecision
                ? pendingDecision === 'approved'
                  ? 'Approving…'
                  : 'Rejecting…'
                : pendingDecision === 'approved'
                  ? 'Approve version'
                  : 'Reject version'
            }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
