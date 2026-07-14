import { apiRequest } from '@/lib/api'

export type Framework = {
  $id: string
  $createdAt: string
  $updatedAt: string
  key: string
  name: string
  publisher: string
  status: string
}

export type FrameworkRelease = {
  $id: string
  $createdAt: string
  $updatedAt: string
  frameworkId: string
  version: string
  title: string
  publishedAt: string
  status: string
  releaseNotes: string
}

type FrameworksResponse = {
  total: number
  frameworks: Framework[]
}

type FrameworkReleasesResponse = {
  total: number
  frameworkReleases: FrameworkRelease[]
}

export type TenantFramework = {
  $id: string
  $createdAt: string
  $updatedAt: string
  frameworkReleaseId: string
  status: string
  targetDate: string
  adoptedAt: string
  adoptedById: string
  framework?: Framework
  frameworkRelease?: FrameworkRelease
}

type TenantFrameworksResponse = {
  total: number
  tenantFrameworks: TenantFramework[]
}

export type AdoptFrameworkInput = {
  frameworkReleaseId: string
  mappingMode: 'recommended' | 'assessments_only'
}

export function getFrameworks() {
  return apiRequest<FrameworksResponse>('/v1/frameworks')
}

export function getTenantFrameworks(tenantId: string) {
  return apiRequest<TenantFrameworksResponse>('/v1/tenants/frameworks', {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export function getFrameworkReleases(frameworkId: string) {
  return apiRequest<FrameworkReleasesResponse>(`/v1/frameworks/${frameworkId}/releases`)
}

export function adoptFramework(tenantId: string, input: AdoptFrameworkInput) {
  return apiRequest<TenantFramework>('/v1/tenant/frameworks/adoptions', {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: input,
  })
}

export type FrameworkNode = {
  $id: string
  $createdAt: string
  $updatedAt: string
  frameworkReleaseId: string
  parentNodeId: string
  externalId: string
  title: string
  description: string
  nodeType: string
  isAssessable: boolean
  sortOrder: number
  status: string
}

export type TenantRequirementAssessment = {
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
  frameworkNode: FrameworkNode
}

export type TenantFrameworkRequirementsResponse = {
  total: number
  tenantRequirementAssessments: TenantRequirementAssessment[]
}

export function getTenantFrameworkRequirements(
  tenantId: string,
  tenantFrameworkId: string,
  options?: { limit?: number; offset?: number },
) {
  return apiRequest<TenantFrameworkRequirementsResponse>(
    `/v1/tenants/frameworks/${tenantFrameworkId}/requirements`,
    {
      headers: {
        'x-tenant-id': tenantId,
      },
      query: options,
    },
  )
}

export type TenantRequirementControlMap = {
  $id: string
  $createdAt: string
  $updatedAt: string
  tenantRequirementAssessmentId: string
  tenantControlId: string
  coverage: string
  rationale: string
  tenantControl: {
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
    reviewFrequency: string
    lastReviewedAt: string
    nextReviewAt: string
    isCustom: boolean
    archivedAt: string
  }
}

export type TenantRequirementControlsResponse = {
  total: number
  tenantRequirementControlMaps: TenantRequirementControlMap[]
}

export function getRequirementControls(
  tenantId: string,
  tenantFrameworkId: string,
  requirementId: string,
) {
  return apiRequest<TenantRequirementControlsResponse>(
    `/v1/tenants/frameworks/${tenantFrameworkId}/requirements/${requirementId}/controls`,
    {
      headers: {
        'x-tenant-id': tenantId,
      },
    },
  )
}
