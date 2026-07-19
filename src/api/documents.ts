import { apiRequest } from '@/lib/api'

export type TenantDocument = {
  $id: string
  $createdAt: string
  $updatedAt: string
  documentType: string
  classification: string
  status: string
  currentVersion: string
  versionId: string
  major: number
  minor: number
  title: string
  descriptionSnippet: string
  versionStatus: string
  mappedControlsCount: number
  commonDocumentId: string
  documentKey: string
}

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
