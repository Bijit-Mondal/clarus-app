import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'
import { markdownToTipTapJSON } from '@/lib/documentAi/policyMarkdown'
import type { SuggestionRange } from '@/lib/documentAi/suggestionTypes'

export function extendDeleteRangesToSections(
  doc: ProseMirrorNode,
  ranges: SuggestionRange[],
): SuggestionRange[] {
  return ranges.map((range) => {
    if (range.type !== 'delete') return range

    let headingLevel: number | null = null
    doc.nodesBetween(range.from, Math.min(range.from + 5, range.to), (node) => {
      if (node.type.name === 'heading' && headingLevel === null) {
        headingLevel = (node.attrs as { level?: number }).level ?? 1
      }
    })
    if (headingLevel === null) return range

    let nextHeadingPos: number | null = null
    doc.nodesBetween(range.to, doc.content.size, (node, pos) => {
      if (nextHeadingPos !== null) return false
      if (node.type.name === 'heading') {
        const level = (node.attrs as { level?: number }).level ?? 1
        if (headingLevel !== null && level <= headingLevel) {
          nextHeadingPos = pos
          return false
        }
      }
      return true
    })

    const extendTo = nextHeadingPos ?? doc.content.size
    return extendTo > range.to ? { ...range, to: extendTo } : range
  })
}

export function buildReplacementNodes(
  state: EditorState,
  proposedText: string,
  at: number,
): ProseMirrorNode[] {
  const pmNodes = markdownToTipTapJSON(proposedText).map((json) => state.schema.nodeFromJSON(json))

  let parent: ProseMirrorNode
  try {
    parent = state.doc.resolve(at).parent
  } catch {
    return pmNodes
  }

  const parentName = parent.type.name
  if (parentName === 'bulletList' || parentName === 'orderedList') {
    return pmNodes.flatMap((node) => {
      if (node.type.name !== 'bulletList' && node.type.name !== 'orderedList') {
        return [node]
      }
      const items: ProseMirrorNode[] = []
      node.forEach((child) => items.push(child))
      return items
    })
  }

  return pmNodes
}
