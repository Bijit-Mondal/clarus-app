import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import {
  loginWithEmail,
  logoutCurrentSession,
  registerAccount,
  type LoginInput,
  type RegisterInput,
} from '@/api/auth'
import { useOrganizationStore } from '@/stores/organization'

export const authKeys = {
  session: ['auth', 'session'] as const,
}

export function useAuth() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => loginWithEmail(input),
    onSuccess: () => {
      authStore.markAuthenticated()
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
      useOrganizationStore().setOrganizations([])
      queryClient.removeQueries({ queryKey: ['tenants'] })
    },
  })

  async function registerAndLogin(input: RegisterInput) {
    await registerMutation.mutateAsync(input)
    await loginMutation.mutateAsync({ email: input.email, password: input.password })
  }

  return { authStore, loginMutation, registerMutation, registerAndLogin, logoutMutation }
}
