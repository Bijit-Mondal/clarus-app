import { ofetch, type FetchOptions } from 'ofetch'

const apiBaseURL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8080'

export const api = ofetch.create({
  baseURL: apiBaseURL,
  timeout: 15_000,
  credentials: 'include',
  headers: {
    Accept: 'application/json',
  },
})

export function apiRequest<T>(url: string, options?: FetchOptions<'json'>) {
  return api<T>(url, options)
}

type FetchErrorLike = {
  data?: unknown
  message?: string
  response?: {
    status?: number
    _data?: unknown
  }
  statusCode?: number
}

function isFetchErrorLike(error: unknown): error is FetchErrorLike {
  return typeof error === 'object' && error !== null
}

export function getApiErrorStatus(error: unknown) {
  if (!isFetchErrorLike(error)) return undefined
  return error.response?.status ?? error.statusCode
}

function getApiErrorPayload(error: FetchErrorLike) {
  return error.response?._data ?? error.data
}

export function getApiErrorCode(error: unknown) {
  if (!isFetchErrorLike(error)) return undefined

  const payload = getApiErrorPayload(error)
  if (typeof payload !== 'object' || payload === null) return undefined

  const record = payload as Record<string, unknown>
  for (const key of ['type', 'code']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return undefined
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.') {
  if (!isFetchErrorLike(error)) return fallback

  const payload = getApiErrorPayload(error)
  if (typeof payload === 'string' && payload.trim()) return payload

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>
    for (const key of ['message', 'error', 'detail']) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value
    }
  }

  return error.message?.trim() || fallback
}
