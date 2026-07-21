import { apiRequest } from '@/lib/api'

export type Tenant = {
  id: string
  name: string
  slug: string
  initials: string
}

export type CreateTenantInput = {
  name: string
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

function normalizeTenant(value: unknown): Tenant | null {
  const record = asRecord(value)
  if (!record) return null

  const id = record.id ?? record.$id ?? record.tenantId ?? record.tenant_id
  const name = record.name ?? record.displayName
  if ((typeof id !== 'string' && typeof id !== 'number') || typeof name !== 'string') return null

  const normalizedName = name.trim()
  const slug = typeof record.slug === 'string' ? record.slug : slugify(normalizedName)

  return {
    id: String(id),
    name: normalizedName,
    slug: slug || 'tenant',
    initials: initialsFrom(normalizedName),
  }
}

function collectionFrom(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  if (!record) return []

  for (const key of ['tenants', 'items', 'data']) {
    if (Array.isArray(record[key])) return record[key]
  }

  return []
}

export async function getTenants() {
  const response = await apiRequest<unknown>('/v1/tenants')
  return collectionFrom(response).flatMap((tenant) => {
    const normalized = normalizeTenant(tenant)
    return normalized ? [normalized] : []
  })
}

export async function getCurrentTenant(tenantId: string) {
  const response = await apiRequest<unknown>('/v1/tenants/current', {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
  return normalizeTenant(response)
}

export async function createTenant(input: CreateTenantInput) {
  const response = await apiRequest<unknown>('/v1/tenants', {
    method: 'POST',
    body: input,
  })
  return normalizeTenant(asRecord(response)?.tenant ?? asRecord(response)?.data ?? response)
}

export type TenantUser = {
  $id: string
  name: string
  role: string
  status: string
}

export type TenantUsersResponse = {
  total: number
  users: TenantUser[]
}

export function getTenantUsers(tenantId: string) {
  return apiRequest<TenantUsersResponse>('/v1/tenants/users', {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export type ComplianceMetric = {
  total: number
  applicable: number
  passing: number
  attention: number
  failing: number
  excluded: number
  progress: number
}

export type ComplianceFramework = {
  tenantFrameworkId: string
  frameworkId: string
  frameworkReleaseId: string
  key: string
  name: string
  version: string
  targetDate: string
  requirements: ComplianceMetric
}

export type ComplianceOverview = {
  generatedAt: string
  requirements: ComplianceMetric
  controls: ComplianceMetric
  frameworks: ComplianceFramework[]
}

export function getComplianceOverview(tenantId: string) {
  return apiRequest<ComplianceOverview>('/v1/tenants/dashboard/compliance', {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}
