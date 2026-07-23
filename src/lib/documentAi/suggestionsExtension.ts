import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  DOMSerializer,
  Fragment,
  type Node as ProseMirrorNode,
  type Schema,
} from '@tiptap/pm/model'
import { markdownToTipTapJSON } from '@/lib/documentAi/policyMarkdown'
import type { SuggestionRange } from '@/lib/documentAi/suggestionTypes'

export type SuggestionsPluginState = {
  ranges: SuggestionRange[]
  focusedId: string | null
  decorations: DecorationSet
}

export const suggestionsPluginKey = new PluginKey<SuggestionsPluginState>('documentAiSuggestions')

export type SuggestionsExtensionOptions = {
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
}

type ActionCallbacks = {
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
}

function createActionBar(rangeId: string, callbacks: ActionCallbacks): HTMLElement {
  const bar = document.createElement('div')
  bar.className = 'suggestion-actions'
  bar.dataset.rangeId = rangeId

  const buttonsRow = document.createElement('div')
  buttonsRow.className = 'suggestion-actions-buttons'

  const acceptBtn = document.createElement('button')
  acceptBtn.type = 'button'
  acceptBtn.className = 'suggestion-action-btn suggestion-action-accept'
  acceptBtn.textContent = 'Accept'
  acceptBtn.title = 'Accept change'
  acceptBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    callbacks.onAccept?.(rangeId)
  })

  const rejectBtn = document.createElement('button')
  rejectBtn.type = 'button'
  rejectBtn.className = 'suggestion-action-btn suggestion-action-reject'
  rejectBtn.textContent = 'Reject'
  rejectBtn.title = 'Reject change'
  rejectBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    callbacks.onReject?.(rangeId)
  })

  buttonsRow.appendChild(acceptBtn)
  buttonsRow.appendChild(rejectBtn)
  bar.appendChild(buttonsRow)
  return bar
}

function createInsertionWidget(
  rangeId: string,
  text: string,
  schema: Schema,
  callbacks: ActionCallbacks,
): (view: EditorView) => HTMLElement {
  return () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'suggestion-change-group'
    wrapper.appendChild(createActionBar(rangeId, callbacks))

    const content = document.createElement('div')
    content.className = 'suggestion-new-section'

    const jsonNodes = markdownToTipTapJSON(text)
    const nodes = jsonNodes.map((json) => schema.nodeFromJSON(json))
    const fragment = Fragment.from(nodes)
    const tempDoc = schema.topNodeType.create(null, fragment)
    const dom = DOMSerializer.fromSchema(schema).serializeFragment(tempDoc.content, {
      document,
    })
    content.appendChild(dom)
    wrapper.appendChild(content)
    return wrapper
  }
}

function createSkeletonWidget(lineCount: number): (view: EditorView) => HTMLElement {
  const count = Math.max(4, Math.min(lineCount + 2, 10))
  const widths = [100, 92, 78, 95, 60, 85, 70, 50]

  return () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'suggestion-change-group suggestion-loading'

    const labelEl = document.createElement('div')
    labelEl.className = 'suggestion-loading-label'
    labelEl.textContent = 'Helix is rewriting…'
    wrapper.appendChild(labelEl)

    const skeleton = document.createElement('div')
    skeleton.className = 'suggestion-skeleton'
    for (let i = 0; i < count; i++) {
      const line = document.createElement('div')
      line.className = 'suggestion-skeleton-line'
      line.style.width = `${widths[i % widths.length]}%`
      skeleton.appendChild(line)
    }
    wrapper.appendChild(skeleton)
    return wrapper
  }
}

function resolveTopLevelPos(doc: ProseMirrorNode, pos: number): number {
  const clamped = Math.max(0, Math.min(pos, doc.content.size))
  const resolved = doc.resolve(clamped)
  if (resolved.depth > 1) {
    return resolved.before(1)
  }
  return clamped
}

function findBlockNodesInRange(
  doc: ProseMirrorNode,
  from: number,
  to: number,
): Array<{ node: ProseMirrorNode; pos: number; end: number }> {
  const results: Array<{ node: ProseMirrorNode; pos: number; end: number }> = []
  const seen = new Set<number>()

  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      const nodeEnd = pos + node.nodeSize
      if (pos < to && nodeEnd > from) {
        const resolved = doc.resolve(pos)
        for (let d = resolved.depth; d >= 1; d--) {
          const ancestor = resolved.node(d)
          if (ancestor.type.name === 'listItem') {
            const parentDepth = d - 1
            if (parentDepth >= 1) {
              const parentNode = resolved.node(parentDepth)
              if (parentNode.type.name === 'bulletList' || parentNode.type.name === 'orderedList') {
                const parentPos = resolved.before(parentDepth)
                const parentEnd = parentPos + parentNode.nodeSize
                let allItemsCovered = true
                parentNode.forEach((item, offset) => {
                  const itemStart = parentPos + 1 + offset
                  const itemEnd = itemStart + item.nodeSize
                  if (itemEnd <= from || itemStart >= to) allItemsCovered = false
                })
                if (allItemsCovered) {
                  if (!seen.has(parentPos)) {
                    seen.add(parentPos)
                    results.push({ node: parentNode, pos: parentPos, end: parentEnd })
                  }
                  return false
                }
              }
            }
            const ancestorPos = resolved.before(d)
            if (!seen.has(ancestorPos)) {
              seen.add(ancestorPos)
              results.push({
                node: ancestor,
                pos: ancestorPos,
                end: ancestorPos + ancestor.nodeSize,
              })
            }
            return false
          }
          if (ancestor.type.name === 'bulletList' || ancestor.type.name === 'orderedList') {
            break
          }
        }
        if (!seen.has(pos)) {
          seen.add(pos)
          results.push({ node, pos, end: nodeEnd })
        }
      }
      return false
    }
    return true
  })

  return results
}

function buildDecorations(
  doc: ProseMirrorNode,
  ranges: SuggestionRange[],
  focusedId: string | null,
  callbacks: ActionCallbacks,
): DecorationSet {
  const decorations: Decoration[] = []
  const schema = doc.type.schema

  for (const range of ranges) {
    if (range.from < 0 || range.to > doc.content.size) continue
    const isFocused = range.id === focusedId
    const focusedSuffix = isFocused ? ' suggestion-focused' : ''

    if (range.decision === 'loading') {
      const blocks = findBlockNodesInRange(doc, range.from, Math.max(range.to, range.from + 1))
      const lineCount =
        range.proposedText.split('\n').filter((l) => l.trim().length > 0).length || 3
      const firstBlock = blocks[0]
      const widgetPos = firstBlock
        ? resolveTopLevelPos(doc, firstBlock.pos)
        : resolveTopLevelPos(doc, range.from)
      decorations.push(
        Decoration.widget(widgetPos, createSkeletonWidget(lineCount), {
          side: -1,
          key: `skeleton-${range.id}`,
        }),
      )
      for (const block of blocks) {
        decorations.push(
          Decoration.node(block.pos, block.end, { class: 'suggestion-loading-content' }),
        )
      }
      continue
    }

    switch (range.type) {
      case 'modify': {
        const blocks = findBlockNodesInRange(doc, range.from, range.to)
        if (blocks.length > 0) {
          const firstBlock = blocks[0]!
          const widgetPos = resolveTopLevelPos(doc, firstBlock.pos)
          decorations.push(
            Decoration.widget(
              widgetPos,
              createInsertionWidget(range.id, range.proposedText, schema, callbacks),
              { side: -1, key: `insert-${range.id}-${range.proposedText.length}` },
            ),
          )
        }
        for (const block of blocks) {
          decorations.push(
            Decoration.node(block.pos, block.end, {
              class: `suggestion-deleted-section${focusedSuffix}`,
            }),
          )
        }
        break
      }
      case 'insert': {
        const widgetPos = resolveTopLevelPos(doc, range.from || 0)
        decorations.push(
          Decoration.widget(
            widgetPos,
            createInsertionWidget(range.id, range.proposedText, schema, callbacks),
            { side: 1, key: `insert-${range.id}-${range.proposedText.length}` },
          ),
        )
        break
      }
      case 'delete': {
        const blocks = findBlockNodesInRange(doc, range.from, range.to)
        const firstDeleteBlock = blocks[0]
        if (firstDeleteBlock) {
          const widgetPos = resolveTopLevelPos(doc, firstDeleteBlock.pos)
          decorations.push(
            Decoration.widget(
              widgetPos,
              () => {
                const wrapper = document.createElement('div')
                wrapper.className = 'suggestion-change-group suggestion-delete-group'
                wrapper.appendChild(createActionBar(range.id, callbacks))
                return wrapper
              },
              { side: -1, key: `delete-actions-${range.id}` },
            ),
          )
        }
        for (const block of blocks) {
          decorations.push(
            Decoration.node(block.pos, block.end, {
              class: `suggestion-deleted-section${focusedSuffix}`,
            }),
          )
        }
        break
      }
    }
  }

  return DecorationSet.create(doc, decorations)
}

export const SuggestionsExtension = Extension.create<SuggestionsExtensionOptions>({
  name: 'documentAiSuggestions',

  addOptions() {
    return {
      onAccept: undefined,
      onReject: undefined,
    }
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options
    const callbacks: ActionCallbacks = {
      onAccept: extensionOptions.onAccept,
      onReject: extensionOptions.onReject,
    }

    return [
      new Plugin<SuggestionsPluginState>({
        key: suggestionsPluginKey,
        state: {
          init(): SuggestionsPluginState {
            return {
              ranges: [],
              focusedId: null,
              decorations: DecorationSet.empty,
            }
          },
          apply(tr, state): SuggestionsPluginState {
            const meta = tr.getMeta(suggestionsPluginKey) as
              | { ranges: SuggestionRange[]; focusedId: string | null }
              | undefined

            if (meta !== undefined) {
              const pendingRanges = meta.ranges.filter(
                (r) => r.decision === 'pending' || r.decision === 'loading',
              )
              let decorations: DecorationSet
              try {
                decorations = buildDecorations(tr.doc, pendingRanges, meta.focusedId, callbacks)
              } catch (err) {
                console.error('[SuggestionsPlugin] buildDecorations failed:', err)
                decorations = DecorationSet.empty
              }
              return {
                ranges: meta.ranges,
                focusedId: meta.focusedId,
                decorations,
              }
            }

            if (tr.docChanged) {
              return {
                ranges: state.ranges,
                focusedId: state.focusedId,
                decorations: state.decorations.map(tr.mapping, tr.doc),
              }
            }

            return state
          },
        },
        props: {
          decorations(state) {
            return suggestionsPluginKey.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})
