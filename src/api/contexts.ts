import { apiRequest } from '@/lib/api'

export interface TenantContext {
  $id: string
  $createdAt: string
  $updatedAt: string
  section: 'product' | 'architecture' | 'team' | 'processes' | 'customers' | string
  content: string // JSON representation of TipTap document
  empty: boolean
}

export interface TenantContextsResponse {
  contexts: TenantContext[]
  total: number
}

export function getTenantContexts(tenantId: string) {
  return apiRequest<TenantContextsResponse>('/v1/tenants/contexts', {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export function getTenantContext(tenantId: string, section: string) {
  return apiRequest<TenantContext>(`/v1/tenants/contexts/${section}`, {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export function updateTenantContext(tenantId: string, section: string, content: string) {
  return apiRequest<TenantContext>(`/v1/tenants/contexts/${section}`, {
    method: 'PUT',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: {
      content,
    },
  })
}
