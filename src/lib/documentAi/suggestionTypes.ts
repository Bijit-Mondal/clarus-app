export type DiffSegment = {
  text: string
  type: 'unchanged' | 'insert' | 'delete'
}

export type SuggestionRange = {
  id: string
  type: 'modify' | 'insert' | 'delete'
  from: number
  to: number
  segments: DiffSegment[]
  proposedText: string
  originalText: string
  decision: 'pending' | 'accepted' | 'rejected' | 'loading'
}

export type PositionMap = {
  lineToPos: Map<number, { from: number; to: number }>
  markdown: string
}
