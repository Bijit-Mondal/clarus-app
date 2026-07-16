import { apiRequest } from '@/lib/api'

export type TenantControl = {
  $id: string
  $createdAt: string
  $updatedAt: string
  sourceKey: string
  commonControlReleaseId: string
  controlKey: string
  name: string
  statement: string
  implementationStatus: string
  isCustom: boolean
  archivedAt: string
}

export type TenantControlsResponse = {
  total: number
  tenantControls: TenantControl[]
}

export type TenantControlSearchResult = {
  tenantControlId: string
  controlKey: string
  name: string
  implementationStatus: string
  isCustom: boolean
}

export type TenantControlSearchResponse = {
  tenantControls: TenantControlSearchResult[]
}

export function searchTenantControls(tenantId: string, query: string, limit = 10) {
  return apiRequest<TenantControlSearchResponse>('/v1/tenants/frameworks/controls/search', {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: { query, limit },
  })
}

export function getTenantControls(tenantId: string, options?: { limit?: number; offset?: number }) {
  return apiRequest<TenantControlsResponse>('/v1/tenants/frameworks/controls', {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
  })
}

export type UpdateTenantControlInput = {
  statement?: string | null
  implementationStatus?:
    | 'not_started'
    | 'in_progress'
    | 'implemented'
    | 'partially_implemented'
    | 'not_applicable'
    | 'needs_review'
    | null
  archive?: boolean | null
}

export function updateTenantControl(
  tenantId: string,
  tenantControlId: string,
  updates: UpdateTenantControlInput,
) {
  return apiRequest<TenantControl>(`/v1/tenants/frameworks/controls/${tenantControlId}`, {
    method: 'PATCH',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: updates,
  })
}

export type ControlRequirementMap = {
  $id: string
  $createdAt: string
  $updatedAt: string
  tenantRequirementAssessmentId: string
  tenantControlId: string
  coverage: string
  rationale: string
  tenantControl: TenantControl | null
  tenantRequirementAssessment: {
    $id: string
    $createdAt: string
    $updatedAt: string
    tenantFrameworkId: string
    frameworkNodeId: string
    status: string
    rationale: string
    assessedById: string
    assessedAt: string
    nextReviewAt: string
    frameworkNode: {
      $id: string
      $createdAt: string
      $updatedAt: string
      frameworkReleaseId: string
      frameworkName: string
      frameworkPublisher: string
      parentNodeId: string
      externalId: string
      title: string
      description: string
      nodeType: string
      isAssessable: boolean
      sortOrder: number
      status: string
    }
  }
}

export type ControlRequirementsResponse = {
  total: number
  tenantRequirementControlMaps: ControlRequirementMap[]
}

export function getControlRequirements(tenantId: string, controlKey: string) {
  return apiRequest<ControlRequirementsResponse>(
    `/v1/tenants/frameworks/controls/${controlKey}/requirements`,
    {
      headers: {
        'x-tenant-id': tenantId,
      },
    },
  )
}

export type LinkControlRequirementInput = {
  tenantRequirementAssessmentId: string
  coverage: string
  rationale: string
}

export function linkControlRequirement(
  tenantId: string,
  tenantControlId: string,
  input: LinkControlRequirementInput,
) {
  return apiRequest<ControlRequirementMap>(
    `/v1/tenants/frameworks/controls/${tenantControlId}/requirements/link`,
    {
      method: 'POST',
      headers: {
        'x-tenant-id': tenantId,
      },
      body: input,
    },
  )
}

export function unlinkControlRequirement(
  tenantId: string,
  tenantControlId: string,
  tenantRequirementAssessmentId: string,
) {
  return apiRequest<void>(
    `/v1/tenants/frameworks/controls/${tenantControlId}/requirements/link/${tenantRequirementAssessmentId}`,
    {
      method: 'DELETE',
      headers: {
        'x-tenant-id': tenantId,
      },
    },
  )
}
