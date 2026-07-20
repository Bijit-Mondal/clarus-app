import { apiRequest } from '@/lib/api'
import type { TenantControlsResponse } from '@/api/controls'

export type TenantDocument = {
  $id: string
  $createdAt: string
  $updatedAt: string
  documentType: string
  classification: string
  /** Document record lifecycle (e.g. active, archived). */
  status: string
  currentVersion: string
  major: number
  minor: number
  title: string
  /** Version workflow state (e.g. draft, in_review, approved). */
  versionStatus: string
  commonDocumentId: string
  documentKey: string
  /** Serialized TipTap JSON. Empty until the document has content. */
  content: string
}

export type DocumentApprover = {
  $id: string
  $createdAt?: string
  name: string
  email?: string
  emailVerified?: boolean
  status?: string
}

export type TenantDocumentDetail = TenantDocument & {
  approvers?: DocumentApprover[]
}

export type TenantDocumentsResponse = {
  total: number
  documents: TenantDocument[]
}

export type DocumentVersionItem = {
  $id: string
  $createdAt: string
  $updatedAt: string
  documentId: string
  major: number
  minor: number
  title: string
  changeLog: string
  status: string
  publishedAt: string
}

/** Single version with body — from GET /v1/documents/:id/versions/:versionId */
export type DocumentVersionDetail = DocumentVersionItem & {
  /** Serialized TipTap JSON. Empty when the version has no body. */
  content: string
}

export type DocumentVersionsResponse = {
  total: number
  documentVersions: DocumentVersionItem[]
}

export type DocumentApprovalDecisionApprover = {
  $id: string
  $createdAt: string
  name: string
  email: string
  emailVerified: boolean
  status: string
}

export type DocumentApprovalDecision = {
  $id: string
  $createdAt: string
  $updatedAt: string
  approvalRequestId: string
  approverId: string
  state: string
  comment: string
  decidedAt: string
  approver: DocumentApprovalDecisionApprover
}

export type DocumentVersionApprovalRequest = {
  $id: string
  $createdAt: string
  $updatedAt: string
  status: string
  completedAt: string
  documentVersionId: string
  documentId: string
  documentType: string
  documentKey: string
  title: string
  major: number
  minor: number
  decisions: DocumentApprovalDecision[]
}

export type DocumentApprovalsResponse = {
  total: number
  documentVersionApprovalRequests: DocumentVersionApprovalRequest[]
}

export type UpdateDocumentInput = {
  documentType?: string
  classification?: string
}

export type WriteDocumentInput = {
  title?: string
  content?: string
}

export type UpdateDocumentApproversInput = {
  approverIds: string[]
}

export function getDocuments(
  tenantId: string,
  options?: { documentType?: string; limit?: number; offset?: number },
) {
  return apiRequest<TenantDocumentsResponse>('/v1/documents', {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
  })
}

export function getDocument(tenantId: string, documentId: string) {
  return apiRequest<TenantDocumentDetail>(`/v1/documents/${documentId}`, {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export function getDocumentVersions(
  tenantId: string,
  documentId: string,
  options?: { limit?: number; offset?: number },
) {
  return apiRequest<DocumentVersionsResponse>(`/v1/documents/${documentId}/versions`, {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
  })
}

export function getDocumentVersion(tenantId: string, documentId: string, versionId: string) {
  return apiRequest<DocumentVersionDetail>(
    `/v1/documents/${documentId}/versions/${versionId}`,
    {
      headers: {
        'x-tenant-id': tenantId,
      },
    },
  )
}

export function getDocumentControls(
  tenantId: string,
  documentId: string,
  options?: { limit?: number; offset?: number },
) {
  return apiRequest<TenantControlsResponse>(`/v1/documents/${documentId}/controls`, {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
  })
}

export function getDocumentApprovals(
  tenantId: string,
  documentId: string,
  options?: { limit?: number; offset?: number },
) {
  return apiRequest<DocumentApprovalsResponse>(`/v1/documents/${documentId}/approvals`, {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
  })
}

export function updateDocument(tenantId: string, documentId: string, input: UpdateDocumentInput) {
  return apiRequest<TenantDocumentDetail>(`/v1/documents/${documentId}`, {
    method: 'PATCH',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: input,
  })
}

export function writeDocument(tenantId: string, documentId: string, input: WriteDocumentInput) {
  return apiRequest<TenantDocumentDetail>(`/v1/documents/${documentId}/write`, {
    method: 'PATCH',
    headers: {
      'x-tenant-id': tenantId,
      'content-type': 'application/json',
    },
    body: input,
  })
}

export function updateDocumentApprovers(
  tenantId: string,
  documentId: string,
  input: UpdateDocumentApproversInput,
) {
  return apiRequest<void>(`/v1/documents/${documentId}/approvers`, {
    method: 'PUT',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: input,
  })
}

export type PublishDocumentInput = {
  changeLog: string
}

export function publishDocumentMajor(
  tenantId: string,
  documentId: string,
  input: PublishDocumentInput,
) {
  return apiRequest<TenantDocumentDetail>(`/v1/documents/${documentId}/publish/major`, {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
      'content-type': 'application/json',
    },
    body: input,
  })
}

export function publishDocumentMinor(
  tenantId: string,
  documentId: string,
  input: PublishDocumentInput,
) {
  return apiRequest<TenantDocumentDetail>(`/v1/documents/${documentId}/publish/minor`, {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
      'content-type': 'application/json',
    },
    body: input,
  })
}
