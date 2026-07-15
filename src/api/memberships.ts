import { apiRequest } from '@/lib/api'

export type MembershipResponse = {
  $id: string
  $createdAt: string
  tenantId: string
  userId: string
  role: 'owner' | 'admin' | 'auditor' | 'employee' | 'contractor'
  status: 'active' | 'revoked'
}

export type CreateMembershipInput = {
  email: string
  role: 'admin' | 'auditor' | 'employee' | 'contractor'
}

export type MembershipsResponse = {
  total: number
  memberships: MembershipResponse[]
}

export function getMemberships(tenantId: string) {
  return apiRequest<MembershipsResponse>('/v1/memberships', {
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export function createMembership(tenantId: string, input: CreateMembershipInput) {
  return apiRequest<MembershipResponse>('/v1/memberships', {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: input,
  })
}

export function revokeMembership(tenantId: string, membershipId: string) {
  return apiRequest<MembershipResponse>(`/v1/memberships/${membershipId}`, {
    method: 'DELETE',
    headers: {
      'x-tenant-id': tenantId,
    },
  })
}

export function updateMembershipRole(
  tenantId: string,
  membershipId: string,
  role: 'admin' | 'auditor' | 'employee' | 'contractor',
) {
  return apiRequest<MembershipResponse>(`/v1/memberships/${membershipId}`, {
    method: 'PATCH',
    headers: {
      'x-tenant-id': tenantId,
    },
    body: {
      role,
    },
  })
}
