export interface TiptapMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  marks?: TiptapMark[]
  text?: string
}

export interface TiptapDocument extends TiptapNode {
  type: 'doc'
  content?: TiptapNode[]
}

const EMPTY_PARAGRAPH: TiptapNode = { type: 'paragraph' }

const EMPTY_DOCUMENT: TiptapDocument = {
  type: 'doc',
  content: [EMPTY_PARAGRAPH],
}

function normalizeEmptyDocument(document: TiptapDocument): TiptapDocument {
  if (!document.content?.length) {
    return { ...document, content: [EMPTY_PARAGRAPH] }
  }
  return document
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTiptapNode(value: unknown): value is TiptapNode {
  if (!isRecord(value) || typeof value.type !== 'string') return false
  if (value.content !== undefined) {
    if (!Array.isArray(value.content) || !value.content.every(isTiptapNode)) return false
  }
  return true
}

export function isTiptapDocument(value: unknown): value is TiptapDocument {
  return isTiptapNode(value) && value.type === 'doc'
}

/**
 * Converts persisted content into a value TipTap can consume.
 * Serialized TipTap JSON is preferred; HTML remains supported for older records.
 */
export function parseTiptapContent(value: unknown): TiptapDocument | string {
  if (isTiptapDocument(value)) return normalizeEmptyDocument(value)
  if (typeof value !== 'string') return EMPTY_DOCUMENT

  const trimmed = value.trim()
  if (!trimmed) return EMPTY_DOCUMENT

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (isTiptapDocument(parsed)) return normalizeEmptyDocument(parsed)

    // Some transports can return a JSON string that was serialized twice.
    if (typeof parsed === 'string') {
      const nested: unknown = JSON.parse(parsed)
      if (isTiptapDocument(nested)) return normalizeEmptyDocument(nested)
    }
  } catch {
    // Non-JSON values are treated as legacy HTML by TipTap.
  }

  return value
}

export function serializeTiptapContent(document: TiptapDocument): string {
  return JSON.stringify(document)
}

/** True when content is missing or an empty TipTap doc (single blank paragraph). */
export function isEmptyTiptapContent(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string' && !value.trim()) return true

  const parsed = parseTiptapContent(value)
  if (typeof parsed === 'string') return !parsed.trim()

  const nodes = parsed.content ?? []
  if (nodes.length === 0) return true
  if (nodes.length > 1) return false

  const only = nodes[0]
  return only?.type === 'paragraph' && (only.content == null || only.content.length === 0)
}
