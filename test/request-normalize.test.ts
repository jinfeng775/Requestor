import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_REQUEST } from '../src/renderer/src/types/request.js'
import { normalizeRequestConfig } from '../src/renderer/src/utils/request-normalize.js'

describe('normalizeRequestConfig', () => {
  it('adds default request scripts to legacy requests without mutating the input', () => {
    const legacyRequest = {
      ...DEFAULT_REQUEST,
      id: 'request-1'
    }
    delete (legacyRequest as Partial<typeof DEFAULT_REQUEST>).scripts

    const normalized = normalizeRequestConfig(legacyRequest)

    assert.deepEqual(normalized.scripts, {
      preRequest: '',
      postRequest: '',
      trusted: true
    })
    assert.equal('scripts' in legacyRequest, false)
  })

  it('preserves existing scripts and marks missing trust as untrusted', () => {
    const normalized = normalizeRequestConfig({
      ...DEFAULT_REQUEST,
      scripts: {
        preRequest: 'pw.env.set("token", "abc")'
      }
    })

    assert.deepEqual(normalized.scripts, {
      preRequest: 'pw.env.set("token", "abc")',
      postRequest: '',
      trusted: false
    })
  })

  it('marks imported scripts as untrusted when requested', () => {
    const normalized = normalizeRequestConfig(
      {
        ...DEFAULT_REQUEST,
        scripts: {
          preRequest: 'pw.console.log("loaded")',
          postRequest: '',
          trusted: true
        }
      },
      { trustScripts: false }
    )

    assert.equal(normalized.scripts.trusted, false)
  })
})
