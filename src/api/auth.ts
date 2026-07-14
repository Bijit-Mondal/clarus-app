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

export type AccountResponse = {
  $id: string
  $createdAt: string
  name: string
  email: string
  emailVerified: boolean
  status: string
}

export type EmailSessionResponse = {
  $id: string
  $createdAt: string
  userId: string
  provider: 'email'
  expire: string
}

export function registerAccount(input: RegisterInput) {
  return apiRequest<AccountResponse>('/v1/account', {
    method: 'POST',
    body: input,
  })
}

export function loginWithEmail(input: LoginInput) {
  return apiRequest<EmailSessionResponse>('/v1/account/sessions/email', {
    method: 'POST',
    body: input,
  })
}
