import { api, apiRequest } from '@/lib/api'

export type Evidence = {
  $id: string
  $createdAt: string
  $updatedAt: string
  title: string
  sourceType: 'manual' | 'auto' | string
  attachmentId?: string
  tenantTaskId?: string
  tenantControlId?: string
  externalReference?: string
  description?: string
  collectedAt: string
  status: 'pending' | 'verified' | string
  createdById: string
}

export type EvidenceListResponse = {
  total: number
  evidences: Evidence[]
}

export type AttachmentResponse = {
  $id: string
  $createdAt: string
  $updatedAt: string
  name: string
  mimeType: string
  sizeOriginal: number
  sizeActual: number
  algorithm: string
}

export type CreateEvidenceInput = {
  title: string
  sourceType: 'manual' | 'auto'
  attachmentId?: string
  externalReference?: string
  collectedAt: string
  description?: string
  tenantTaskId?: string
  tenantControlId?: string
}

export function getEvidences(
  tenantId: string,
  options?: { limit?: number; offset?: number; total?: boolean },
) {
  return apiRequest<EvidenceListResponse>('/v1/evidences', {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
  })
}

export function getTaskEvidences(
  tenantId: string,
  taskId: string,
  options?: { limit?: number; offset?: number; total?: boolean },
) {
  return apiRequest<EvidenceListResponse>(`/v1/tenants/frameworks/tasks/${taskId}/evidences`, {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
  })
}

export function getControlEvidences(
  tenantId: string,
  controlId: string,
  options?: { limit?: number; offset?: number; total?: boolean },
) {
  return apiRequest<EvidenceListResponse>(
    `/v1/tenants/frameworks/controls/${controlId}/evidences`,
    {
      headers: {
        'x-tenant-id': tenantId,
      },
      query: options,
    },
  )
}

export function createEvidence(tenantId: string, input: CreateEvidenceInput) {
  return apiRequest<Evidence>('/v1/evidences', {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: input,
  })
}

export function uploadAttachment(tenantId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest<AttachmentResponse>('/v1/attachments', {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: formData,
  })
}

export function deleteEvidence(tenantId: string, evidenceId: string) {
  return apiRequest<void>(`/v1/evidences/${evidenceId}`, {
    method: 'DELETE',
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export async function downloadEvidence(tenantId: string, evidenceId: string) {
  const response = await api.raw(`/v1/evidences/${evidenceId}/download`, {
    headers: {
      'x-tenant-id': tenantId,
    },
    responseType: 'blob',
  })

  const blob = response._data as Blob
  const url = window.URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => {
    window.URL.revokeObjectURL(url)
  }, 10000)
}
