import { describe, expect, it } from 'vitest'
import { isTiptapDocument, parseTiptapContent, serializeTiptapContent } from './tiptapContent'

const document = {
  type: 'doc' as const,
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Policy content' }],
    },
  ],
}

describe('TipTap content serialization', () => {
  it('parses serialized TipTap JSON', () => {
    expect(parseTiptapContent(JSON.stringify(document))).toEqual(document)
  })

  it('accepts an already parsed TipTap document', () => {
    expect(parseTiptapContent(document)).toBe(document)
  })

  it('accepts an empty TipTap document without a content field', () => {
    expect(parseTiptapContent('{"type":"doc"}')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })

  it('handles content serialized twice by a transport', () => {
    expect(parseTiptapContent(JSON.stringify(JSON.stringify(document)))).toEqual(document)
  })

  it('preserves legacy HTML content', () => {
    const html = '<h1>Legacy policy</h1><p>Existing content</p>'

    expect(parseTiptapContent(html)).toBe(html)
  })

  it('does not treat arbitrary JSON as a TipTap document', () => {
    const json = '{"title":"Not TipTap"}'

    expect(parseTiptapContent(json)).toBe(json)
  })

  it('serializes a valid TipTap document', () => {
    const serialized = serializeTiptapContent(document)

    expect(isTiptapDocument(document)).toBe(true)
    expect(JSON.parse(serialized)).toEqual(document)
  })
})
