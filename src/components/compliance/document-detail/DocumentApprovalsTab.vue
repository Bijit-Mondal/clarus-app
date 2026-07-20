<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhArrowLeft,
  PhArrowRight,
  PhEye,
  PhStamp,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/composables/useAuth'
import {
  useDocumentApprovalsQuery,
  formatTimeAgo,
} from '@/composables/useDocuments'
import {
  getApprovalStatusConfig,
  getUserInitials,
  normalizeApprovalStatus,
} from '@/lib/documentDisplay'
import type {
  DocumentApprovalDecision,
  DocumentVersionApprovalRequest,
} from '@/api/documents'

const props = defineProps<{
  documentId: string
}>()

const route = useRoute()
const router = useRouter()

const { accountQuery } = useAuth()
const currentUserId = computed(() => accountQuery.data.value?.$id ?? '')
const orgSlug = computed(() => route.params.organizationSlug as string)

const currentPage = ref(1)
const itemsPerPage = ref(8)
const offset = computed(() => (currentPage.value - 1) * itemsPerPage.value)

const {
  data: approvalsResponse,
  isPending,
  isError,
} = useDocumentApprovalsQuery(
  computed(() => props.documentId),
  computed(() => ({
    limit: itemsPerPage.value,
    offset: offset.value,
  })),
)

const approvalRequests = computed(
  () => approvalsResponse.value?.documentVersionApprovalRequests ?? [],
)
const totalApprovals = computed(() => approvalsResponse.value?.total ?? 0)
const totalPages = computed(() => Math.ceil(totalApprovals.value / itemsPerPage.value))

const approvalSummary = computed(() => {
  if (!approvalRequests.value.length) {
    return { label: 'No approval requests', tone: 'muted' as const }
  }

  const pending = approvalRequests.value.filter(
    (request) => normalizeApprovalStatus(request.status) === 'pending',
  ).length

  if (pending > 0) {
    return {
      label: `${pending} pending`,
      tone: 'warning' as const,
    }
  }

  const rejected = approvalRequests.value.some(
    (request) => normalizeApprovalStatus(request.status) === 'rejected',
  )
  if (rejected) {
    return { label: 'Rejected', tone: 'destructive' as const }
  }

  return { label: 'All approved', tone: 'success' as const }
})

function versionLabel(request: DocumentVersionApprovalRequest) {
  return `v${request.major}.${request.minor}`
}

function formatRelativeTime(dateString: string) {
  if (!dateString) return '—'
  return formatTimeAgo(dateString)
}

function formatFullDateTime(dateString: string) {
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

function decisionTimeDisplay(decision: DocumentApprovalDecision) {
  const state = normalizeApprovalStatus(decision.state)
  if (decision.decidedAt && state !== 'pending') {
    const prefix =
      state === 'approved' ? 'Approved' : state === 'rejected' ? 'Rejected' : 'Voided'
    return {
      prefix,
      time: decision.decidedAt,
    }
  }
  return {
    prefix: 'Requested',
    time: decision.$createdAt,
  }
}

function canReview(request: DocumentVersionApprovalRequest) {
  if (!currentUserId.value) return false
  return request.decisions.some(
    (decision) =>
      decision.approverId === currentUserId.value &&
      normalizeApprovalStatus(decision.state) === 'pending',
  )
}

function handleReview(request: DocumentVersionApprovalRequest) {
  void router.push({
    name: 'compliance-document-approval-review',
    params: {
      organizationSlug: orgSlug.value,
      documentId: props.documentId,
      approvalRequestId: request.$id,
    },
  })
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div class="min-w-0">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <h2 class="text-sm font-semibold text-foreground text-balance">Approvals</h2>
          <Badge
            v-if="!isPending && !isError"
            variant="outline"
            :class="[
              'gap-1 rounded-full px-2 py-0 text-[10px] font-semibold',
              approvalSummary.tone === 'success'
                ? 'border-success/30 bg-success/10 text-success-emphasis'
                : approvalSummary.tone === 'warning'
                  ? 'border-warning/30 bg-warning/10 text-warning-emphasis'
                  : approvalSummary.tone === 'destructive'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-border bg-muted/50 text-muted-foreground',
            ]"
          >
            {{ approvalSummary.label }}
          </Badge>
        </div>
        <p class="mt-0.5 text-xs text-muted-foreground">
          Approval requests for published versions of this document.
        </p>
      </div>
      <span
        v-if="!isPending && !isError"
        class="shrink-0 tabular-nums text-xs text-muted-foreground"
      >
        {{ totalApprovals }} {{ totalApprovals === 1 ? 'request' : 'requests' }}
      </span>
    </div>

    <div v-if="isPending" class="divide-y divide-border/60">
      <div v-for="i in 3" :key="i" class="animate-pulse space-y-3 px-4 py-3.5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <div class="h-5 w-10 rounded bg-muted" />
            <div class="h-5 w-16 rounded-full bg-muted" />
          </div>
          <div class="h-3.5 w-14 rounded bg-muted" />
        </div>
        <div class="space-y-2 pl-1">
          <div class="flex items-center gap-2">
            <div class="size-7 rounded-full bg-muted" />
            <div class="h-3.5 w-28 rounded bg-muted" />
          </div>
          <div class="flex items-center gap-2">
            <div class="size-7 rounded-full bg-muted" />
            <div class="h-3.5 w-24 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="isError"
      class="flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <span
        class="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <PhWarningCircle :size="20" />
      </span>
      <p class="text-sm font-medium text-foreground">Couldn’t load approvals</p>
      <p class="mt-1 max-w-[280px] text-xs text-muted-foreground">
        Something went wrong fetching approval requests. Try reloading the page.
      </p>
    </div>

    <div
      v-else-if="!approvalRequests.length"
      class="flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <span
        class="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground/50"
      >
        <PhStamp :size="20" />
      </span>
      <p class="text-sm font-medium text-foreground">No approval requests yet</p>
      <p class="mt-1 max-w-[280px] text-xs text-muted-foreground">
        Requests appear here when a major version is published for review.
      </p>
    </div>

    <template v-else>
      <ul class="divide-y divide-border/60">
        <li
          v-for="request in approvalRequests"
          :key="request.$id"
          class="flex flex-col gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/10"
        >
          <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <span class="font-mono text-sm font-semibold tabular-nums text-foreground">
                {{ versionLabel(request) }}
              </span>
              <Badge
                variant="outline"
                :class="[
                  'gap-1 rounded-full px-2 py-0 text-[10px] font-semibold',
                  getApprovalStatusConfig(request.status).class,
                ]"
              >
                <component
                  :is="getApprovalStatusConfig(request.status).icon"
                  :size="10"
                  weight="fill"
                />
                {{ getApprovalStatusConfig(request.status).label }}
              </Badge>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <time
                class="text-xs tabular-nums text-muted-foreground"
                :datetime="request.$createdAt"
                :title="formatFullDateTime(request.$createdAt)"
              >
                {{ formatRelativeTime(request.$createdAt) }}
              </time>
              <Button
                v-if="canReview(request)"
                size="sm"
                class="h-8 gap-1.5 px-2.5 text-xs"
                @click="handleReview(request)"
              >
                <PhEye :size="13" />
                Review
              </Button>
            </div>
          </div>

          <ul class="space-y-0">
            <li
              v-for="decision in request.decisions"
              :key="decision.$id"
              class="flex items-start gap-3 border-t border-border/50 py-2.5 first:border-t-0 first:pt-0"
            >
              <Avatar class="mt-0.5 size-7 shrink-0">
                <AvatarFallback
                  class="bg-secondary text-[10px] font-semibold text-secondary-foreground"
                >
                  {{ getUserInitials(decision.approver?.name || '') }}
                </AvatarFallback>
              </Avatar>
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                  <span class="truncate text-sm font-medium text-foreground">
                    {{ decision.approver?.name || 'Unknown approver' }}
                  </span>
                  <Badge
                    variant="outline"
                    :class="[
                      'gap-1 rounded-full px-1.5 py-0 text-[10px] font-semibold',
                      getApprovalStatusConfig(decision.state).class,
                    ]"
                  >
                    <component
                      :is="getApprovalStatusConfig(decision.state).icon"
                      :size="10"
                      weight="fill"
                    />
                    {{ getApprovalStatusConfig(decision.state).label }}
                  </Badge>
                </div>
                <p
                  v-if="decision.approver?.email"
                  class="truncate text-xs text-muted-foreground"
                >
                  {{ decision.approver.email }}
                </p>
                <p
                  v-if="decision.comment?.trim()"
                  class="mt-1.5 line-clamp-3 break-words text-xs text-foreground/80 text-pretty"
                  :title="decision.comment"
                >
                  “{{ decision.comment.trim() }}”
                </p>
              </div>
              <div class="shrink-0 pt-0.5 text-right">
                <p class="text-[11px] text-muted-foreground">
                  {{ decisionTimeDisplay(decision).prefix }}
                </p>
                <p
                  class="text-xs tabular-nums text-foreground"
                  :title="formatFullDateTime(decisionTimeDisplay(decision).time)"
                >
                  {{ formatRelativeTime(decisionTimeDisplay(decision).time) }}
                </p>
              </div>
            </li>
          </ul>
        </li>
      </ul>

      <div
        v-if="totalApprovals > itemsPerPage"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
      >
        <span class="text-xs text-muted-foreground">
          Showing
          <span class="font-medium tabular-nums text-foreground">{{ offset + 1 }}</span>
          –
          <span class="font-medium tabular-nums text-foreground">{{
            Math.min(offset + itemsPerPage, totalApprovals)
          }}</span>
          of
          <span class="font-medium tabular-nums text-foreground">{{ totalApprovals }}</span>
        </span>

        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            class="size-8 p-0"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            <span class="sr-only">Previous page</span>
            <PhArrowLeft :size="14" />
          </Button>

          <Button
            v-for="page in totalPages"
            :key="page"
            variant="outline"
            size="sm"
            class="size-8 p-0 font-mono text-xs"
            :class="{
              'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground':
                currentPage === page,
            }"
            @click="currentPage = page"
          >
            {{ page }}
          </Button>

          <Button
            variant="outline"
            size="sm"
            class="size-8 p-0"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            <span class="sr-only">Next page</span>
            <PhArrowRight :size="14" />
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
