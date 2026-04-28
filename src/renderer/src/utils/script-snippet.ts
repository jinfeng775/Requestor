export interface ScriptInsertionInput {
  currentValue: string
  snippetCode: string
  selectionStart: number
  selectionEnd: number
}

export interface ScriptInsertionResult {
  nextValue: string
  cursorPosition: number
}

function endsWithLineBreak(value: string): boolean {
  return /(?:\r\n|\n)$/.test(value)
}

function startsWithLineBreak(value: string): boolean {
  return /^(?:\r\n|\n)/.test(value)
}

function resolveLineBreak(currentValue: string): '\n' | '\r\n' {
  return currentValue.includes('\r\n') ? '\r\n' : '\n'
}

export function insertScriptSnippet(input: ScriptInsertionInput): ScriptInsertionResult {
  const { currentValue, snippetCode, selectionStart, selectionEnd } = input
  const start = Math.max(0, Math.min(selectionStart, currentValue.length))
  const end = Math.max(start, Math.min(selectionEnd, currentValue.length))

  const before = currentValue.slice(0, start)
  const after = currentValue.slice(end)
  const lineBreak = resolveLineBreak(currentValue)
  const prefix = before.length > 0 && !endsWithLineBreak(before) ? lineBreak : ''
  const suffix = after.length > 0 && !startsWithLineBreak(after) && !endsWithLineBreak(snippetCode) ? lineBreak : ''
  const insertion = `${prefix}${snippetCode}${suffix}`
  const nextValue = `${before}${insertion}${after}`

  return {
    nextValue,
    cursorPosition: before.length + insertion.length
  }
}
