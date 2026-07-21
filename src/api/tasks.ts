import { apiRequest } from '@/lib/api'
import type { TenantControlsResponse } from '@/api/controls'
import type { TenantDocumentsResponse } from '@/api/documents'

export type TenantTask = {
  $id: string
  $createdAt: string
  $updatedAt: string
  commonTaskId: string
  assigneeId: string | null
  status: 'pending' | 'completed' | string
  title: string
  description: string
  department: string
  type: string
  frequency: string
  lastCompletedAt: string
  approverId: string | null
  approvedAt: string
  dueDate?: string
  assignee: {
    $id: string
    name: string
    email: string
  } | null
  control: {
    $id: string
    controlKey: string
    name: string
    implementationStatus: string
  }
}

export type TenantTasksResponse = {
  total: number
  tenantTasks: TenantTask[]
}

export function getTenantTasks(
  tenantId: string,
  options?: { limit?: number; offset?: number; total?: boolean; status?: string; search?: string },
) {
  return apiRequest<TenantTasksResponse>('/v1/tenants/frameworks/tasks', {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
  })
}

export type UpdateTenantTaskInput = {
  title?: string
  description?: string
  status?: string
  assigneeId?: string | null
  department?: string
  type?: string
  frequency?: string
}

export function updateTenantTask(tenantId: string, taskId: string, updates: UpdateTenantTaskInput) {
  return apiRequest<TenantTask>(`/v1/tenants/frameworks/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: updates,
  })
}

export function getControlTasks(
  tenantId: string,
  controlId: string,
  options?: { limit?: number; offset?: number; total?: boolean; status?: string; search?: string },
) {
  return apiRequest<TenantTasksResponse>(`/v1/tenants/frameworks/controls/${controlId}/tasks`, {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
  })
}

export function getTenantTask(tenantId: string, taskId: string) {
  return apiRequest<TenantTask>(`/v1/tenants/frameworks/tasks/${taskId}`, {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export function getTaskControls(tenantId: string, taskId: string) {
  return apiRequest<TenantControlsResponse>(`/v1/tenants/frameworks/tasks/${taskId}/controls`, {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export function getTaskDocuments(
  tenantId: string,
  taskId: string,
  options?: { limit?: number; offset?: number },
) {
  return apiRequest<TenantDocumentsResponse>(
    `/v1/tenants/frameworks/tasks/${taskId}/documents`,
    {
      headers: {
        'x-tenant-id': tenantId,
      },
      query: options,
    },
  )
}
