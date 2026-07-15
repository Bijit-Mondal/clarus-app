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
  implementationDescription: string
  implementationStatus: string
  ownerId: string
  owner: any | null
  reviewFrequency: string
  lastReviewedAt: string
  nextReviewAt: string
  isCustom: boolean
  archivedAt: string
}

export type TenantControlsResponse = {
  total: number
  tenantControls: TenantControl[]
}

export function getTenantControls(
  tenantId: string,
  options?: { limit?: number; offset?: number }
) {
  return apiRequest<TenantControlsResponse>('/v1/tenants/frameworks/controls', {
    headers: {
      'x-tenant-id': tenantId,
    },
    query: options,
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
  tenantRequirementAssessment: {
    $id: string
    $createdAt: string
    $updatedAt: string
    tenantFrameworkId: string
    frameworkNodeId: string
    status: string
    rationale: string
    frameworkNode: {
      $id: string
      $createdAt: string
      $updatedAt: string
      frameworkReleaseId: string
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
  return apiRequest<ControlRequirementsResponse>(`/v1/tenants/frameworks/controls/${controlKey}/requirements`, {
    headers: {
      'x-tenant-id': tenantId
    }
  })
}
