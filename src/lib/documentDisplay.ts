import {
  PhCheckCircle,
  PhClock,
  PhHourglass,
  PhNoteBlank,
  PhPenNib,
  PhXCircle,
} from '@phosphor-icons/vue'
import type { DocumentVersionStatus } from '@/composables/useDocuments'

export function getUserInitials(name: string) {
  if (!name) return 'U'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getCategoryLabel(category: string) {
  if (category === 'policy') return 'Policies'
  if (category === 'procedure') return 'Procedures'
  if (category === 'sop') return 'SOPs'
  return `${category}s`
}

export function getCategoryDisplayLabel(category: string) {
  if (category === 'policy') return 'Policy'
  if (category === 'procedure') return 'Procedure'
  if (category === 'sop') return 'SOP'
  return category
}

export function getDocumentStatusConfig(status: DocumentVersionStatus) {
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
  if (status === 'rejected') {
    return {
      label: 'Rejected',
      icon: PhXCircle,
      class: 'border-destructive/30 bg-destructive/10 text-destructive',
    }
  }
  return {
    label: 'Draft',
    icon: PhNoteBlank,
    class: 'border-border bg-secondary text-muted-foreground',
  }
}

export type ApprovalRecordStatus = 'approved' | 'pending' | 'rejected' | 'void'

export function normalizeApprovalStatus(status: string): ApprovalRecordStatus {
  const normalized = status.toLowerCase().replace(/_/g, '-')
  if (normalized === 'approved' || normalized === 'accepted') return 'approved'
  if (normalized === 'rejected' || normalized === 'declined' || normalized === 'denied') {
    return 'rejected'
  }
  if (normalized === 'void' || normalized === 'voided' || normalized === 'cancelled') {
    return 'void'
  }
  return 'pending'
}

export function getApprovalStatusConfig(status: ApprovalRecordStatus | string) {
  const resolved = normalizeApprovalStatus(status)
  if (resolved === 'approved') {
    return {
      label: 'Approved',
      icon: PhCheckCircle,
      class: 'border-success/30 bg-success/10 text-success-emphasis',
    }
  }
  if (resolved === 'rejected') {
    return {
      label: 'Rejected',
      icon: PhXCircle,
      class: 'border-destructive/30 bg-destructive/10 text-destructive',
    }
  }
  if (resolved === 'void') {
    return {
      label: 'Void',
      icon: PhXCircle,
      class: 'border-border bg-muted/40 text-muted-foreground',
    }
  }
  return {
    label: 'Pending',
    icon: PhHourglass,
    class: 'border-warning/30 bg-warning/10 text-warning-emphasis',
  }
}

export type SignatureRecordStatus = 'signed' | 'pending' | 'declined'

export function getSignatureStatusConfig(status: SignatureRecordStatus) {
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
