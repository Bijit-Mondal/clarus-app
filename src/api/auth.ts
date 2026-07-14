import { apiRequest } from '@/lib/api'

export type RegisterInput = {
  email: string
  password: string
  name: string
}

export type LoginInput = {
  email: string
  password: string
}

export function registerAccount(input: RegisterInput) {
  return apiRequest<unknown>('/v1/account', {
    method: 'POST',
    body: input,
  })
}

export function loginWithEmail(input: LoginInput) {
  return apiRequest<unknown>('/v1/account/sessions/email', {
    method: 'POST',
    body: input,
  })
}
