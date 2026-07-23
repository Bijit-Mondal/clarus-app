import { describe, expect, it } from 'vitest'
import { markdownToTipTapJSON, sanitizeMarkdown } from '@/lib/documentAi/policyMarkdown'
import { computeSuggestionRanges } from '@/lib/documentAi/computeSuggestionRanges'
import type { PositionMap } from '@/lib/documentAi/suggestionTypes'

describe('policyMarkdown', () => {
  it('parses headings and lists', () => {
    const nodes = markdownToTipTapJSON('## Purpose\n\n- Use VPN\n- Enforce MFA')
    expect(nodes[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } })
    expect(nodes[1]?.type).toBe('bulletList')
  })

  it('strips control characters', () => {
    expect(sanitizeMarkdown('Hello\u000Bworld')).toBe('Helloworld')
  })
})

describe('computeSuggestionRanges', () => {
  it('returns a full insert for empty current content', () => {
    const map: PositionMap = { markdown: '', lineToPos: new Map() }
    const ranges = computeSuggestionRanges(map, '## Purpose\n\nSecure remote access.')
    expect(ranges).toHaveLength(1)
    expect(ranges[0]?.type).toBe('insert')
    expect(ranges[0]?.proposedText).toContain('Purpose')
  })

  it('returns empty when content is unchanged', () => {
    const map: PositionMap = {
      markdown: '## Purpose\n\nSecure remote access.',
      lineToPos: new Map([[1, { from: 0, to: 10 }]]),
    }
    expect(computeSuggestionRanges(map, '## Purpose\n\nSecure remote access.')).toEqual([])
  })
})
