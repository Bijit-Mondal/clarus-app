import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'

let editor: Editor | null = null

afterEach(() => {
  editor?.destroy()
  editor = null
})

function getTableColumnCount() {
  const table = editor?.state.doc.firstChild
  return table?.type.name === 'table' ? table.firstChild?.childCount : undefined
}

describe('Tiptap table commands', () => {
  it('inserts a 2 by 2 table and changes the selected column', () => {
    editor = new Editor({
      extensions: [StarterKit, TableKit],
    })

    expect(
      editor.chain().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run(),
    ).toBe(true)
    expect(getTableColumnCount()).toBe(2)

    expect(editor.chain().addColumnAfter().run()).toBe(true)
    expect(getTableColumnCount()).toBe(3)

    expect(editor.chain().deleteColumn().run()).toBe(true)
    expect(getTableColumnCount()).toBe(2)
  })
})
