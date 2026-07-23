import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { serializeInline } from '@/lib/documentAi/policyMarkdown'
import type { PositionMap } from '@/lib/documentAi/suggestionTypes'

export function buildPositionMap(doc: ProseMirrorNode): PositionMap {
  const lineToPos = new Map<number, { from: number; to: number }>()
  const markdownLines: string[] = []

  const entries: Array<{
    type: 'heading' | 'paragraph' | 'list-item' | 'other'
    markdown: string
    from: number
    to: number
  }> = []

  doc.forEach((node, offset) => {
    const nodeFrom = offset + 1

    if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
      node.forEach((listItem, childOffset) => {
        const itemFrom = nodeFrom + childOffset
        const itemTo = itemFrom + listItem.nodeSize
        const text = serializeInline(listItem)
        const prefix = node.type.name === 'orderedList' ? '1. ' : '- '
        entries.push({ type: 'list-item', markdown: prefix + text, from: itemFrom, to: itemTo })
      })
      return
    }

    const nodeStart = offset
    const nodeEnd = offset + node.nodeSize

    if (node.type.name === 'heading') {
      const level = (node.attrs.level as number) || 1
      entries.push({
        type: 'heading',
        markdown: '#'.repeat(level) + ' ' + serializeInline(node),
        from: nodeStart,
        to: nodeEnd,
      })
    } else if (node.type.name === 'paragraph') {
      entries.push({
        type: 'paragraph',
        markdown: serializeInline(node),
        from: nodeStart,
        to: nodeEnd,
      })
    } else if (node.type.name === 'blockquote') {
      entries.push({
        type: 'other',
        markdown: '> ' + serializeInline(node),
        from: nodeStart,
        to: nodeEnd,
      })
    } else if (node.type.name === 'horizontalRule') {
      entries.push({ type: 'other', markdown: '---', from: nodeStart, to: nodeEnd })
    } else {
      const text = serializeInline(node)
      if (text) {
        entries.push({ type: 'other', markdown: text, from: nodeStart, to: nodeEnd })
      }
    }
  })

  let currentLine = 1
  let prevType: string | null = null

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!

    if (entry.type === 'heading' && prevType !== null) {
      markdownLines.push('')
      currentLine++
    }

    if (entry.type === 'list-item' && prevType !== 'list-item' && prevType !== null) {
      markdownLines.push('')
      currentLine++
    }

    markdownLines.push(entry.markdown)
    if (entry.markdown.trim()) {
      lineToPos.set(currentLine, { from: entry.from, to: entry.to })
    }
    currentLine++

    if (entry.type === 'heading') {
      markdownLines.push('')
      currentLine++
    }

    if (entry.type === 'paragraph' || entry.type === 'other') {
      const next = entries[i + 1]
      if (next && next.type !== 'list-item') {
        markdownLines.push('')
        currentLine++
      }
    }

    if (entry.type === 'list-item') {
      const next = entries[i + 1]
      if (!next || next.type !== 'list-item') {
        markdownLines.push('')
        currentLine++
      }
    }

    prevType = entry.type
  }

  while (markdownLines.length > 0 && markdownLines[markdownLines.length - 1] === '') {
    markdownLines.pop()
  }

  return {
    lineToPos,
    markdown: markdownLines.join('\n').trim(),
  }
}
