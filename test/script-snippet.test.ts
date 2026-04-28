import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { insertScriptSnippet } from '../src/renderer/src/utils/script-snippet.js'

describe('insertScriptSnippet', () => {
  it('inserts snippet at cursor when input is empty', () => {
    const result = insertScriptSnippet({
      currentValue: '',
      snippetCode: "pw.env.set('token', 'abc')",
      selectionStart: 0,
      selectionEnd: 0
    })

    assert.equal(result.nextValue, "pw.env.set('token', 'abc')")
    assert.equal(result.cursorPosition, "pw.env.set('token', 'abc')".length)
  })

  it('adds a leading newline when inserting mid-line', () => {
    const result = insertScriptSnippet({
      currentValue: 'const a = 1',
      snippetCode: "pw.env.set('token', 'abc')",
      selectionStart: 11,
      selectionEnd: 11
    })

    assert.equal(result.nextValue, "const a = 1\npw.env.set('token', 'abc')")
  })

  it('adds a trailing newline when text exists after insertion point', () => {
    const result = insertScriptSnippet({
      currentValue: 'const a = 1\nconst b = 2',
      snippetCode: "pw.env.set('token', 'abc')",
      selectionStart: 11,
      selectionEnd: 11
    })

    assert.equal(result.nextValue, "const a = 1\npw.env.set('token', 'abc')\nconst b = 2")
  })

  it('replaces selected text with snippet', () => {
    const result = insertScriptSnippet({
      currentValue: 'pw.env.set("old", "1")\nconst keep = true',
      snippetCode: "pw.env.set('new', '2')",
      selectionStart: 0,
      selectionEnd: 22
    })

    assert.equal(result.nextValue, "pw.env.set('new', '2')\nconst keep = true")
  })

  it('preserves CRLF line endings for inserted separators', () => {
    const result = insertScriptSnippet({
      currentValue: 'const a = 1\r\nconst b = 2',
      snippetCode: "pw.env.set('token', 'abc')",
      selectionStart: 11,
      selectionEnd: 11
    })

    assert.equal(result.nextValue, "const a = 1\r\npw.env.set('token', 'abc')\r\nconst b = 2")
  })
})
