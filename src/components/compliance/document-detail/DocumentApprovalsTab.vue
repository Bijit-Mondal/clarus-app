<script setup lang="ts">
import { computed } from 'vue'
import { PhPaperPlaneTilt, PhPencilSimple, PhStamp } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getApprovalStatusConfig, getUserInitials } from '@/lib/documentDisplay'
import type { ApprovalRecord } from '@/components/compliance/document-detail/types'
import type { DocumentItem } from '@/composables/useDocuments'

const props = defineProps<{
  document: DocumentItem
}>()

const emit = defineEmits<{
  editApprovers: []
  requestApproval: []
}>()

const approvalRecords = computed<ApprovalRecord[]>(() => {
  const doc = props.document
  if (!doc.approvers.length) return []

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
    respondedAt:
      doc.status === 'approved' || (doc.status === 'in-review' && index === 0)
        ? doc.updatedAt
        : undefined,
  }))
})

const approvalSummary = computed(() => {
  const doc = props.document
  if (doc.status === 'approved') {
    return { label: 'All approvers signed off', tone: 'success' as const }
  }
  if (doc.status === 'in-review') {
    const pending = approvalRecords.value.filter((r) => r.status === 'pending').length
    return {
      label: `${pending} approval${pending === 1 ? '' : 's'} pending`,
      tone: 'warning' as const,
    }
  }
  return { label: 'No approval requested', tone: 'muted' as const }
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
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
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
        <span class="text-xs text-muted-foreground">· {{ document.version }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1 px-2.5 text-xs"
          @click="emit('editApprovers')"
        >
          <PhPencilSimple :size="13" />
          Edit approvers
        </Button>
        <Button size="sm" class="h-8 gap-1 px-2.5 text-xs" @click="emit('requestApproval')">
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
                getApprovalStatusConfig(record.status).class,
              ]"
            >
              <component
                :is="getApprovalStatusConfig(record.status).icon"
                :size="10"
                weight="fill"
              />
              {{ getApprovalStatusConfig(record.status).label }}
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
        <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs" @click="emit('editApprovers')">
          <PhPencilSimple :size="13" />
          Add approvers
        </Button>
        <Button size="sm" class="h-8 gap-1.5 text-xs" @click="emit('requestApproval')">
          <PhPaperPlaneTilt :size="13" />
          Request approval
        </Button>
      </div>
    </div>
  </div>
</template>
