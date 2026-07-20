<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhArrowLeft,
  PhCheckCircle,
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
  useDocuments,
  useDocumentQuery,
  useDocumentVersionsQuery,
  useDocumentApprovalsQuery,
  formatTimeAgo,
  normalizeVersionStatus,
  getClassificationLabel,
} from '@/composables/useDocuments'
import { useAuth } from '@/composables/useAuth'
import {
  getApprovalStatusConfig,
  getDocumentStatusConfig,
  normalizeApprovalStatus,
} from '@/lib/documentDisplay'
import type { DocumentVersionItem, DocumentVersionApprovalRequest } from '@/api/documents'

const route = useRoute()
const router = useRouter()

const documentId = computed(() => route.params.documentId as string)
const approvalRequestId = computed(() => route.params.approvalRequestId as string)
const orgSlug = computed(() => route.params.organizationSlug as string)

const { accountQuery } = useAuth()
const currentUserEmail = computed(() => accountQuery.data.value?.email ?? '')
const currentUserId = computed(() => accountQuery.data.value?.$id ?? '')

const { getDocumentById } = useDocuments()
const { isPending: isDocumentLoading, isError: isDocumentError } = useDocumentQuery(documentId)
const documentItem = computed(() => getDocumentById(documentId.value))

const {
  data: versionsResponse,
  isPending: isVersionsLoading,
  isError: isVersionsError,
} = useDocumentVersionsQuery(documentId, { limit: 50, offset: 0 })

const { data: approvalsResponse, isPending: isApprovalsLoading } = useDocumentApprovalsQuery(
  documentId,
  { limit: 50, offset: 0 },
)

const approvalRequest = computed<DocumentVersionApprovalRequest | undefined>(() =>
  approvalsResponse.value?.documentVersionApprovalRequests.find(
    (request) => request.$id === approvalRequestId.value,
  ),
)

const versions = computed(() => versionsResponse.value?.documentVersions ?? [])

const selectedVersionId = ref<string | null>(null)

watch(
  [approvalRequest, versions],
  () => {
    if (selectedVersionId.value) return
    const fromRequest = approvalRequest.value?.documentVersionId
    if (fromRequest && versions.value.some((v) => v.$id === fromRequest)) {
      selectedVersionId.value = fromRequest
      return
    }
    if (versions.value[0]) selectedVersionId.value = versions.value[0].$id
  },
  { immediate: true },
)

const selectedVersion = computed(() =>
  versions.value.find((version) => version.$id === selectedVersionId.value),
)

const isReviewTarget = computed(() => {
  if (!approvalRequest.value || !selectedVersion.value) return false
  return selectedVersion.value.$id === approvalRequest.value.documentVersionId
})

const previewTitle = computed(
  () => selectedVersion.value?.title || documentItem.value?.title || 'Untitled document',
)

const previewVersionLabel = computed(() => {
  if (!selectedVersion.value) return documentItem.value?.version ?? ''
  return `v${selectedVersion.value.major}.${selectedVersion.value.minor}`
})

const previewContent = computed(() => {
  const version = selectedVersion.value
  if (version && 'content' in version && typeof version.content === 'string' && version.content.trim()) {
    return version.content
  }
  // Until version-content APIs land, fall back to the live document for the review target.
  if (isReviewTarget.value) return documentItem.value?.content ?? ''
  return ''
})

const myDecision = computed(() => {
  if (!currentUserId.value || !approvalRequest.value) return undefined
  return approvalRequest.value.decisions.find(
    (decision) => decision.approverId === currentUserId.value,
  )
})

const canDecide = computed(() => {
  if (!approvalRequest.value || !myDecision.value) return false
  return (
    normalizeApprovalStatus(approvalRequest.value.status) === 'pending' &&
    normalizeApprovalStatus(myDecision.value.state) === 'pending'
  )
})

const isDecisionDialogOpen = ref(false)
const decisionComment = ref('')
const pendingDecision = ref<'approved' | 'rejected' | null>(null)

const isPageLoading = computed(
  () => isDocumentLoading.value || isVersionsLoading.value || isApprovalsLoading.value,
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

function openDecision(decision: 'approved' | 'rejected') {
  pendingDecision.value = decision
  decisionComment.value = ''
  isDecisionDialogOpen.value = true
}

function confirmDecision() {
  // Decision API lands later — keep the dialog UX ready.
  isDecisionDialogOpen.value = false
  pendingDecision.value = null
  decisionComment.value = ''
}
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
            {{ documentItem?.title || approvalRequest?.title || 'Document review' }}
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
          Select a version to compare. The version under review is marked.
        </p>

        <ClarusLoadingState
          v-if="isPageLoading"
          variant="compact"
          label="Loading versions…"
          class="py-10"
        />

        <div
          v-else-if="isVersionsError || isDocumentError"
          class="rounded-lg border border-border bg-muted/20 px-3 py-6 text-center"
        >
          <PhWarningCircle :size="20" class="mx-auto text-destructive" />
          <p class="mt-2 text-sm font-medium text-foreground">Couldn’t load review data</p>
          <p class="mt-1 text-xs text-muted-foreground">Try going back and opening review again.</p>
        </div>

        <div
          v-else-if="!approvalRequest"
          class="rounded-lg border border-border bg-muted/20 px-3 py-6 text-center"
        >
          <PhWarningCircle :size="20" class="mx-auto text-muted-foreground" />
          <p class="mt-2 text-sm font-medium text-foreground">Approval request not found</p>
          <p class="mt-1 text-xs text-muted-foreground">
            It may have been completed or removed. Return to the document to continue.
          </p>
          <Button variant="outline" size="sm" class="mt-3" @click="goBack">Back to document</Button>
        </div>

        <ul v-else-if="versions.length" class="space-y-1.5" role="listbox" aria-label="Document versions">
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
                    v-if="version.$id === approvalRequest?.documentVersionId"
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

        <div
          v-else
          class="rounded-lg border border-dashed border-border px-3 py-8 text-center"
        >
          <PhClock :size="20" class="mx-auto text-muted-foreground/50" />
          <p class="mt-2 text-sm font-medium text-foreground">No versions yet</p>
        </div>
      </div>

      <div class="border-t border-border bg-muted/20 px-4 py-4">
        <p class="text-xs text-muted-foreground text-pretty">
          Review the selected version carefully before recording your decision.
        </p>

        <div v-if="canDecide" class="mt-3 flex flex-col gap-2">
          <Button
            class="h-10 w-full gap-2 text-sm font-semibold"
            :disabled="!isReviewTarget"
            @click="openDecision('approved')"
          >
            <PhCheckCircle :size="16" weight="fill" />
            Approve
          </Button>
          <Button
            variant="outline"
            class="h-9 w-full gap-2 text-sm"
            :disabled="!isReviewTarget"
            @click="openDecision('rejected')"
          >
            <PhXCircle :size="15" />
            Reject
          </Button>
          <p v-if="!isReviewTarget" class="text-[11px] text-muted-foreground text-pretty">
            Switch back to the version under review to record a decision.
          </p>
        </div>
        <div
          v-else-if="myDecision && normalizeApprovalStatus(myDecision.state) !== 'pending'"
          class="mt-3 rounded-lg border border-border bg-background px-3 py-2.5"
        >
          <p class="text-xs font-medium text-foreground">Your decision is recorded</p>
          <Badge
            variant="outline"
            :class="[
              'mt-1.5 gap-1 rounded-full px-2 py-0 text-[10px] font-semibold',
              getApprovalStatusConfig(myDecision.state).class,
            ]"
          >
            <component
              :is="getApprovalStatusConfig(myDecision.state).icon"
              :size="10"
              weight="fill"
            />
            {{ getApprovalStatusConfig(myDecision.state).label }}
          </Badge>
        </div>
        <p v-else class="mt-3 text-xs text-muted-foreground">
          You don’t have a pending decision on this request.
        </p>

        <p class="mt-3 text-[11px] leading-relaxed text-muted-foreground/80 text-pretty">
          Your decision applies to the version under review, not a prior version you open for
          comparison.
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
            <span v-if="documentItem" class="text-muted-foreground/70">
              · {{ getClassificationLabel(documentItem.classification) }}
            </span>
            <span v-if="isReviewTarget" class="text-warning-emphasis"> · Version under review</span>
            <span v-else class="text-muted-foreground/70"> · Comparing prior version</span>
          </p>
        </div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <PhDownloadSimple :size="14" class="opacity-60" />
          <span>PDF preview</span>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <ClarusLoadingState
          v-if="isPageLoading"
          variant="compact"
          label="Loading document…"
          class="py-20"
        />

        <div
          v-else-if="!previewContent"
          class="mx-auto flex max-w-md flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
        >
          <PhClock :size="22" class="text-muted-foreground/50" />
          <p class="mt-3 text-sm font-medium text-foreground">Content not available yet</p>
          <p class="mt-1 text-xs text-muted-foreground text-pretty">
            Version content will load here once the review APIs are connected. The under-review
            version uses the current document body as a stand-in.
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

    <Dialog v-model:open="isDecisionDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {{ pendingDecision === 'approved' ? 'Approve this version?' : 'Reject this version?' }}
          </DialogTitle>
          <DialogDescription>
            {{
              pendingDecision === 'approved'
                ? 'Confirm that you have reviewed the document and approve this version.'
                : 'Rejecting will send this version back. Add a short comment so authors know why.'
            }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground" for="decision-comment">
            Comment
            <span v-if="pendingDecision === 'rejected'" class="text-destructive">*</span>
            <span v-else class="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id="decision-comment"
            v-model="decisionComment"
            rows="3"
            placeholder="Add context for the document owners…"
          />
        </div>

        <Separator />

        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" @click="isDecisionDialogOpen = false">Cancel</Button>
          <Button
            :variant="pendingDecision === 'rejected' ? 'destructive' : 'default'"
            :disabled="pendingDecision === 'rejected' && !decisionComment.trim()"
            @click="confirmDecision"
          >
            {{ pendingDecision === 'approved' ? 'Confirm approval' : 'Confirm rejection' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
