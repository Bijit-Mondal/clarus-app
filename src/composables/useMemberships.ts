import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/vue-query'
import {
  createMembership,
  getMemberships,
  revokeMembership,
  updateMembershipRole,
  type CreateMembershipInput,
} from '@/api/memberships'
import { tenantUserKeys } from '@/composables/useTenants'
import { useOrganizationStore } from '@/stores/organization'

export const membershipKeys = {
  all: ['memberships'] as const,
  list: (tenantId: string) => [...membershipKeys.all, tenantId] as const,
}

function useMembershipTenantId() {
  const organizationStore = useOrganizationStore()
  return computed(() => organizationStore.activeOrganization?.id)
}

async function invalidateMembershipQueries(queryClient: QueryClient, tenantId: string) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: tenantUserKeys.list(tenantId),
    }),
    queryClient.invalidateQueries({
      queryKey: membershipKeys.list(tenantId),
    }),
  ])
}

export function useMembershipsQuery() {
  const tenantId = useMembershipTenantId()

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      return membershipKeys.list(tId)
    }),
    queryFn: () => getMemberships(tenantId.value!),
    enabled: computed(() => !!tenantId.value),
  })
}

export function useCreateMembershipMutation() {
  const queryClient = useQueryClient()
  const tenantId = useMembershipTenantId()

  return useMutation({
    mutationFn: (input: CreateMembershipInput) => {
      if (!tenantId.value) throw new Error('No active tenant')
      return createMembership(tenantId.value, input)
    },
    onSuccess: async () => {
      if (tenantId.value) await invalidateMembershipQueries(queryClient, tenantId.value)
    },
  })
}

export function useRevokeMembershipMutation() {
  const queryClient = useQueryClient()
  const tenantId = useMembershipTenantId()

  return useMutation({
    mutationFn: (membershipId: string) => {
      if (!tenantId.value) throw new Error('No active tenant')
      return revokeMembership(tenantId.value, membershipId)
    },
    onSuccess: async () => {
      if (tenantId.value) await invalidateMembershipQueries(queryClient, tenantId.value)
    },
  })
}

export function useUpdateMembershipRoleMutation() {
  const queryClient = useQueryClient()
  const tenantId = useMembershipTenantId()

  return useMutation({
    mutationFn: ({
      membershipId,
      role,
    }: {
      membershipId: string
      role: 'admin' | 'auditor' | 'employee' | 'contractor'
    }) => {
      if (!tenantId.value) throw new Error('No active tenant')
      return updateMembershipRole(tenantId.value, membershipId, role)
    },
    onSuccess: async () => {
      if (tenantId.value) await invalidateMembershipQueries(queryClient, tenantId.value)
    },
  })
}
