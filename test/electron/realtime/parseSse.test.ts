import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseSseChunk } from '../../../electron/realtime/parseSse.js'

describe('parseSseChunk', () => {
  it('parses a simple default message event', () => {
    const result = parseSseChunk('data: hello\n\n')

    assert.deepEqual(result.events, [
      {
        event: 'message',
        data: 'hello'
      }
    ])
    assert.equal(result.remaining, '')
  })

  it('parses named events with multiline data', () => {
    const result = parseSseChunk('event: update\ndata: a\ndata: b\n\n')

    assert.deepEqual(result.events, [
      {
        event: 'update',
        data: 'a\nb'
      }
    ])
    assert.equal(result.remaining, '')
  })

  it('keeps incomplete trailing chunks for the next read', () => {
    const result = parseSseChunk('data: hello')

    assert.deepEqual(result.events, [])
    assert.equal(result.remaining, 'data: hello')
  })
})
