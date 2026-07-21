import { Extension } from '@tiptap/core'

const alignments = ['left', 'center', 'right', 'justify'] as const
type TextAlignment = (typeof alignments)[number]

function isTextAlignment(value: string): value is TextAlignment {
  return alignments.includes(value as TextAlignment)
}

export const tiptapTextAlignExtension = Extension.create({
  name: 'textAlign',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const value = element.style.textAlign
              return isTextAlignment(value) ? value : null
            },
            renderHTML: (attributes: { textAlign?: TextAlignment | null }) =>
              attributes.textAlign ? { style: `text-align: ${attributes.textAlign}` } : {},
          },
        },
      },
    ]
  },
})
