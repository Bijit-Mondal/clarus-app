export type DocumentTab =
  | 'content'
  | 'controls'
  | 'versions'
  | 'activity'
  | 'approvals'
  | 'signatures'

export interface ApprovalRecord {
  approver: string
  status: 'approved' | 'pending' | 'rejected'
  requestedAt: string
  respondedAt?: string
}

export interface SignatureRecord {
  id: string
  signatory: string
  role: string
  status: 'signed' | 'pending' | 'declined'
  signedAt?: string
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
