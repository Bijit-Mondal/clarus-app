import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import { loginWithEmail, registerAccount, type LoginInput, type RegisterInput } from '@/api/auth'

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

  async function registerAndLogin(input: RegisterInput) {
    await registerMutation.mutateAsync(input)
    await loginMutation.mutateAsync({ email: input.email, password: input.password })
  }

  return { authStore, loginMutation, registerMutation, registerAndLogin }
}
