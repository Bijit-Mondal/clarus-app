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
