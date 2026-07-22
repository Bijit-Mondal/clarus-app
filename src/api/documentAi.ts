import { apiRequest } from '@/lib/api'

const AI_TIMEOUT_MS = 120_000

export type DocumentAiChatHistoryTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type DocumentAiProposal = {
  content: string
  summary: string
  title: string
  detail: string
  reviewHint: string
  contentLength: number
  complete: boolean
}

export type DocumentAiChatStep = {
  step: number
  tool: string
  id: string
  ok: boolean
}

export type DocumentAiUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type DocumentAiChatResponse = {
  documentId: string
  message: string
  proposal: DocumentAiProposal | null
  steps: DocumentAiChatStep[]
  usage: DocumentAiUsage
  incomplete: boolean
}

export type DocumentAiChatInput = {
  message: string
  currentContent?: string
  history?: DocumentAiChatHistoryTurn[]
}

export type DocumentAiSectionResponse = {
  documentId: string
  content: string
  usage: DocumentAiUsage
}

export type DocumentAiSectionInput = {
  sectionText: string
  instruction: string
}

export function chatDocumentAi(tenantId: string, documentId: string, input: DocumentAiChatInput) {
  return apiRequest<DocumentAiChatResponse>(`/v1/documents/${documentId}/ai/chat`, {
    method: 'POST',
    timeout: AI_TIMEOUT_MS,
    headers: {
      'x-tenant-id': tenantId,
      'content-type': 'application/json',
    },
    body: {
      message: input.message,
      currentContent: input.currentContent ?? '',
      history: input.history ?? [],
    },
  })
}

export function editDocumentAiSection(
  tenantId: string,
  documentId: string,
  input: DocumentAiSectionInput,
) {
  return apiRequest<DocumentAiSectionResponse>(`/v1/documents/${documentId}/ai/edit-section`, {
    method: 'POST',
    timeout: AI_TIMEOUT_MS,
    headers: {
      'x-tenant-id': tenantId,
      'content-type': 'application/json',
    },
    body: {
      sectionText: input.sectionText,
      instruction: input.instruction,
    },
  })
}
