import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { TiptapMark, TiptapNode } from '@/lib/tiptapContent'

// Strip C0/C1 controls except TAB/LF (CR normalized separately). Intentional.
// eslint-disable-next-line no-control-regex -- control-char sanitization for AI markdown
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g

export function sanitizeMarkdown(markdown: string): string {
  if (!markdown) return markdown
  return markdown.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '')
}

function collapseSpaces(text: string): string {
  return text.replace(/[ \t]{2,}/g, ' ')
}

type InlineMark = {
  type: string
  attrs?: Record<string, unknown>
}

function addMark(marks: InlineMark[], mark: InlineMark): InlineMark[] {
  if (marks.some((m) => m.type === mark.type)) return marks
  return [...marks, mark]
}

function makeTextNode(text: string, marks: InlineMark[]): TiptapNode {
  const isCode = marks.some((m) => m.type === 'code')
  const value = isCode ? text : collapseSpaces(text)
  return marks.length > 0
    ? { type: 'text', text: value, marks: marks.map((m) => ({ ...m }) as TiptapMark) }
    : { type: 'text', text: value }
}

export function parseInline(text: string): TiptapNode[] {
  return parseInlineWithMarks(text, [])
}

function parseInlineWithMarks(text: string, marks: InlineMark[]): TiptapNode[] {
  const nodes: TiptapNode[] = []
  let buffer = ''
  let i = 0

  const flush = () => {
    if (buffer) {
      nodes.push(makeTextNode(buffer, marks))
      buffer = ''
    }
  }

  while (i < text.length) {
    const rest = text.slice(i)

    const link = /^\[([^\]]*)\]\(([^)]*)\)/.exec(rest)
    if (link) {
      flush()
      nodes.push(
        ...parseInlineWithMarks(
          link[1]!,
          addMark(marks, { type: 'link', attrs: { href: link[2]! } }),
        ),
      )
      i += link[0].length
      continue
    }

    const code = /^`([^`]+)`/.exec(rest)
    if (code) {
      flush()
      nodes.push(makeTextNode(code[1]!, addMark(marks, { type: 'code' })))
      i += code[0].length
      continue
    }

    const boldItalic = /^\*\*\*([^]+?)\*\*\*/.exec(rest)
    if (boldItalic) {
      flush()
      nodes.push(
        ...parseInlineWithMarks(
          boldItalic[1]!,
          addMark(addMark(marks, { type: 'bold' }), { type: 'italic' }),
        ),
      )
      i += boldItalic[0].length
      continue
    }

    const bold = /^\*\*([^]+?)\*\*/.exec(rest)
    if (bold) {
      flush()
      nodes.push(...parseInlineWithMarks(bold[1]!, addMark(marks, { type: 'bold' })))
      i += bold[0].length
      continue
    }

    const italic = /^\*([^*\n]+?)\*/.exec(rest)
    if (italic) {
      flush()
      nodes.push(...parseInlineWithMarks(italic[1]!, addMark(marks, { type: 'italic' })))
      i += italic[0].length
      continue
    }

    buffer += text[i]
    i += 1
  }

  flush()
  return nodes
}

export function serializeInline(node: ProseMirrorNode): string {
  let out = ''
  node.forEach((child) => {
    if (child.isText) {
      out += applyMarks(child.text ?? '', child.marks)
    } else if (child.type.name === 'hardBreak') {
      out += ' '
    } else {
      out += serializeInline(child)
    }
  })
  return out
}

function applyMarks(
  text: string,
  marks: readonly { type: { name: string }; attrs: Record<string, unknown> }[],
): string {
  const names = new Set(marks.map((m) => m.type.name))
  const link = marks.find((m) => m.type.name === 'link')

  let out = names.has('code') ? '`' + text + '`' : collapseSpaces(text)

  if (names.has('bold') && names.has('italic')) {
    out = '***' + out + '***'
  } else if (names.has('bold')) {
    out = '**' + out + '**'
  } else if (names.has('italic')) {
    out = '*' + out + '*'
  }

  if (link && typeof link.attrs.href === 'string') {
    out = '[' + out + '](' + link.attrs.href + ')'
  }

  return out
}

export function markdownToTipTapJSON(markdown: string): TiptapNode[] {
  const lines = sanitizeMarkdown(markdown).split('\n')
  const content: TiptapNode[] = []
  let currentList: TiptapNode | null = null
  let listType: 'bulletList' | 'orderedList' | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      if (currentList) {
        content.push(currentList)
        currentList = null
        listType = null
      }
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      if (currentList) {
        content.push(currentList)
        currentList = null
        listType = null
      }
      content.push({
        type: 'heading',
        attrs: { level: Math.min(headingMatch[1]!.length, 3) },
        content: parseInline(headingMatch[2]!),
      })
      continue
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      if (listType !== 'bulletList') {
        if (currentList) content.push(currentList)
        currentList = { type: 'bulletList', content: [] }
        listType = 'bulletList'
      }
      ;(currentList!.content as TiptapNode[]).push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: parseInline(bulletMatch[1]!) }],
      })
      continue
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      if (listType !== 'orderedList') {
        if (currentList) content.push(currentList)
        currentList = { type: 'orderedList', content: [] }
        listType = 'orderedList'
      }
      ;(currentList!.content as TiptapNode[]).push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: parseInline(orderedMatch[1]!) }],
      })
      continue
    }

    if (currentList) {
      content.push(currentList)
      currentList = null
      listType = null
    }
    content.push({
      type: 'paragraph',
      content: parseInline(trimmed),
    })
  }

  if (currentList) content.push(currentList)

  return content.length > 0
    ? content
    : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }]
}
