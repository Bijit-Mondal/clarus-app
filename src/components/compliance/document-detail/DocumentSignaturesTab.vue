<script setup lang="ts">
import { computed } from 'vue'
import { PhPenNib } from '@phosphor-icons/vue'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getSignatureStatusConfig, getUserInitials } from '@/lib/documentDisplay'
import type { SignatureRecord } from '@/components/compliance/document-detail/types'
import type { DocumentItem } from '@/composables/useDocuments'

const props = defineProps<{
  document: DocumentItem
}>()

const signatureRecords = computed<SignatureRecord[]>(() => {
  const doc = props.document
  if (doc.category !== 'policy' || !doc.approvers.length) return []

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
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
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

    <table v-if="signatureRecords.length" class="w-full border-collapse text-left text-sm">
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
                getSignatureStatusConfig(sig.status).class,
              ]"
            >
              <component
                :is="getSignatureStatusConfig(sig.status).icon"
                :size="11"
                weight="fill"
              />
              {{ getSignatureStatusConfig(sig.status).label }}
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
        Policy documents typically require stakeholder acknowledgment. Procedures and SOPs usually
        do not.
      </p>
    </div>
  </div>
</template>
