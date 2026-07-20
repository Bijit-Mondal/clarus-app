import { apiRequest } from '@/lib/api'

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

export type TenantDocumentDetail = TenantDocument

export type TenantDocumentsResponse = {
  total: number
  documents: TenantDocument[]
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
