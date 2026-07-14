import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  getCurrentAccount,
  loginWithEmail,
  logoutCurrentSession,
  registerAccount,
  type LoginInput,
  type RegisterInput,
} from '@/api/auth'
import { useOrganizationStore } from '@/stores/organization'

export const authKeys = {
  session: ['auth', 'session'] as const,
  account: ['auth', 'account'] as const,
}

export function useAuth() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()

  const accountQuery = useQuery({
    queryKey: authKeys.account,
    queryFn: getCurrentAccount,
    enabled: computed(() => authStore.isAuthenticated),
  })

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => loginWithEmail(input),
    onSuccess: () => {
      authStore.markAuthenticated()
      queryClient.invalidateQueries({ queryKey: authKeys.account })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => registerAccount(input),
  })

  const logoutMutation = useMutation({
    mutationFn: () => logoutCurrentSession(),
    onSuccess: () => {
      authStore.markUnauthenticated()
      queryClient.removeQueries({ queryKey: authKeys.account })
      useOrganizationStore().setOrganizations([])
      queryClient.removeQueries({ queryKey: ['tenants'] })
    },
  })

  async function registerAndLogin(input: RegisterInput) {
    await registerMutation.mutateAsync(input)
    await loginMutation.mutateAsync({ email: input.email, password: input.password })
  }

  return {
    authStore,
    accountQuery,
    loginMutation,
    registerMutation,
    registerAndLogin,
    logoutMutation,
  }
}
