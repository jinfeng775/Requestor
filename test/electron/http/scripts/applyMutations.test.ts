import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_REQUEST } from '../../../../src/renderer/src/types/request.js'
import { applyScriptMutations } from '../../../../electron/http/scripts/applyMutations.js'
import type { ScriptMutationResult } from '../../../../electron/http/scripts/types.js'

const baseMutationResult: ScriptMutationResult = {
  request: {
    headers: [],
    params: []
  },
  environment: []
}

describe('applyScriptMutations', () => {
  it('applies request and environment mutations immutably', () => {
    const request = {
      ...DEFAULT_REQUEST,
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      params: [{ key: 'page', value: '1', enabled: true }]
    }
    const envVars = { token: 'old' }

    const result = applyScriptMutations(request, envVars, {
      request: {
        method: 'POST',
        url: 'https://api.example.com/users',
        rawBody: '{"ok":true}',
        headers: [
          { action: 'set', key: 'Authorization', value: 'Bearer abc' },
          { action: 'unset', key: 'Accept' }
        ],
        params: [{ action: 'set', key: 'page', value: '2' }]
      },
      environment: [{ action: 'set', key: 'token', value: 'abc' }]
    })

    assert.equal(result.request.method, 'POST')
    assert.equal(result.request.url, 'https://api.example.com/users')
    assert.equal(result.request.rawBody, '{"ok":true}')
    assert.deepEqual(result.request.headers, [
      { key: 'Accept', value: 'application/json', enabled: false },
      { key: 'Authorization', value: 'Bearer abc', enabled: true }
    ])
    assert.deepEqual(result.request.params, [{ key: 'page', value: '2', enabled: true }])
    assert.deepEqual(result.envVars, { token: 'abc' })
    assert.equal(request.method, 'GET')
    assert.deepEqual(envVars, { token: 'old' })
  })

  it('removes disabled variables from the request-time environment map', () => {
    const result = applyScriptMutations(DEFAULT_REQUEST, { token: 'abc', host: 'example.com' }, {
      ...baseMutationResult,
      environment: [{ action: 'disable', key: 'token' }]
    })

    assert.deepEqual(result.envVars, { host: 'example.com' })
  })
})
