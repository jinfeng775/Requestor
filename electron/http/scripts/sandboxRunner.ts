import { randomUUID } from 'node:crypto'
import type { Session } from 'electron'
import type { ScriptRunner, ScriptRunnerResult } from './types'

const SCRIPT_TIMEOUT_MS = 3000
const MAX_SCRIPT_LENGTH = 100_000
const MAX_RESULT_BYTES = 256_000
const MAX_CONTEXT_BYTES = 1_000_000
const MAX_SCRIPT_RESPONSE_BODY_LENGTH = 200_000

type ElectronSandboxApi = Pick<typeof import('electron'), 'BrowserWindow' | 'session'>

function createTimeoutResult(startedAt: number): ScriptRunnerResult {
  return {
    status: 'timeout',
    logs: [],
    durationMs: Date.now() - startedAt,
    error: { message: 'Script execution timed out' },
    mutations: { request: {}, environment: [] }
  }
}

function createErrorResult(startedAt: number, error: unknown): ScriptRunnerResult {
  return {
    status: 'failed',
    logs: [],
    durationMs: Date.now() - startedAt,
    error: {
      message: error instanceof Error ? error.message : 'Script execution failed',
      stack: error instanceof Error ? error.stack : undefined
    },
    mutations: { request: {}, environment: [] }
  }
}

function estimateJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

function validateRunnerResult(startedAt: number, result: ScriptRunnerResult): ScriptRunnerResult {
  if (estimateJsonBytes(result) <= MAX_RESULT_BYTES) return result

  return createErrorResult(startedAt, new Error('Script result exceeded size limit'))
}

function createBoundedContext(context: Parameters<ScriptRunner>[0]): Parameters<ScriptRunner>[0] {
  const nextContext = context.response
    ? {
        ...context,
        response: {
          ...context.response,
          body: context.response.body.slice(0, MAX_SCRIPT_RESPONSE_BODY_LENGTH)
        }
      }
    : context

  if (estimateJsonBytes(nextContext) > MAX_CONTEXT_BYTES) {
    throw new Error('Script context exceeded size limit')
  }

  return nextContext
}

function createSandboxHtml(): string {
  const runnerSource = `
    window.__runRequestorScript = async function(context) {
      const startedAt = Date.now();
      const state = { request: {}, environment: [], logs: [] };
      const MAX_LOGS = 100;
      const MAX_LOG_MESSAGE_LENGTH = 2000;
      const MAX_MUTATIONS = 200;
      const MAX_MUTATION_KEY_LENGTH = 256;
      const MAX_MUTATION_VALUE_LENGTH = 10000;

      function clampKey(value) {
        return String(value).slice(0, MAX_MUTATION_KEY_LENGTH);
      }

      function clampValue(value) {
        return String(value).slice(0, MAX_MUTATION_VALUE_LENGTH);
      }

      function appendMutation(collection, mutation) {
        const current = state.request[collection] || [];
        if (current.length >= MAX_MUTATIONS) throw new Error('Script mutation limit exceeded');
        state.request[collection] = [...current, mutation];
      }

      function appendEnvironmentMutation(mutation) {
        if (state.environment.length >= MAX_MUTATIONS) throw new Error('Script mutation limit exceeded');
        state.environment = [...state.environment, mutation];
      }

      function serializeLogValue(value) {
        if (typeof value === 'string') return value;
        if (value instanceof Error) return value.message;
        try { return JSON.stringify(value); } catch { return String(value); }
      }

      function appendLog(level, values) {
        if (state.logs.length >= MAX_LOGS) return;
        const message = values.map(serializeLogValue).join(' ').slice(0, MAX_LOG_MESSAGE_LENGTH);
        state.logs.push({ level, message, timestamp: Date.now() });
      }

      function createKeyValueApi(list, collection) {
        return {
          get(name) {
            const item = list.find((entry) => entry.enabled && entry.key.toLowerCase() === String(name).toLowerCase());
            return item && item.value;
          },
          set(name, value) {
            appendMutation(collection, { action: 'set', key: clampKey(name), value: clampValue(value) });
          },
          unset(name) {
            appendMutation(collection, { action: 'unset', key: clampKey(name) });
          }
        };
      }

      function createEnvironmentApi(envVars) {
        return {
          get(name) {
            const key = String(name);
            const mutation = [...state.environment].reverse().find((item) => item.key === key);
            if (mutation && mutation.action === 'disable') return undefined;
            if (mutation && mutation.action === 'set') return mutation.value || '';
            return envVars[key];
          },
          set(name, value) {
            appendEnvironmentMutation({ action: 'set', key: clampKey(name), value: clampValue(value) });
          },
          unset(name) {
            appendEnvironmentMutation({ action: 'disable', key: clampKey(name) });
          }
        };
      }

      function createResponseApi(response) {
        return {
          status: response ? response.status : 0,
          statusText: response ? response.statusText : '',
          headers: {
            get(name) {
              const entries = Object.entries((response && response.headers) || {});
              const entry = entries.find(([key]) => key.toLowerCase() === String(name).toLowerCase());
              return entry && entry[1];
            }
          },
          body: {
            text() { return (response && response.body) || ''; },
            json() { return JSON.parse((response && response.body) || ''); }
          },
          cookies: (response && response.cookies) || []
        };
      }

      function createScriptApi() {
        const envApi = createEnvironmentApi(context.envVars || {});
        return {
          request: {
            getMethod() { return context.request.method; },
            setMethod(method) { state.request.method = String(method); },
            getUrl() { return context.request.url; },
            setUrl(url) { state.request.url = clampValue(url); },
            headers: createKeyValueApi(context.request.headers || [], 'headers'),
            params: createKeyValueApi(context.request.params || [], 'params'),
            body: {
              getRaw() { return context.request.rawBody || ''; },
              setRaw(value) { state.request.rawBody = clampValue(value); }
            }
          },
          response: createResponseApi(context.response),
          env: envApi,
          variables: envApi,
          console: {
            log: (...values) => appendLog('log', values),
            info: (...values) => appendLog('info', values),
            warn: (...values) => appendLog('warn', values),
            error: (...values) => appendLog('error', values)
          }
        };
      }

      const pw = createScriptApi();
      try {
        const execute = new Function('pw', 'requestor', 'require', 'process', 'window', 'document', 'global', 'globalThis', 'fetch', '"use strict"; return (async () => { ' + context.script + '\\n })();');
        await execute(pw, pw, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
        return {
          status: 'passed',
          logs: state.logs,
          durationMs: Date.now() - startedAt,
          mutations: { request: state.request, environment: state.environment }
        };
      } catch (error) {
        return {
          status: 'failed',
          logs: state.logs,
          durationMs: Date.now() - startedAt,
          error: { message: error && error.message ? error.message : 'Script execution failed', stack: error && error.stack },
          mutations: { request: {}, environment: [] }
        };
      }
    };
  `

  return `<!doctype html><html><body><script>${runnerSource}</script></body></html>`
}

function configureSandboxSession(sandboxSession: Session): void {
  sandboxSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  sandboxSession.setPermissionCheckHandler(() => false)
  sandboxSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: details.url !== 'about:blank' && !details.url.startsWith('data:text/html') })
  })
}

async function loadElectron(): Promise<ElectronSandboxApi> {
  return import('electron') as Promise<ElectronSandboxApi>
}

export const runScript: ScriptRunner = async (context): Promise<ScriptRunnerResult> => {
  const startedAt = Date.now()
  if (context.script.length > MAX_SCRIPT_LENGTH) {
    return createErrorResult(startedAt, new Error('Script exceeded size limit'))
  }

  const boundedContext = createBoundedContext(context)

  const { BrowserWindow, session } = await loadElectron()
  const partition = `requestor-script-sandbox-${randomUUID()}`
  const sandboxSession = session.fromPartition(partition)
  configureSandboxSession(sandboxSession)

  const sandboxWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      partition
    }
  })

  sandboxWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  sandboxWindow.webContents.on('will-navigate', (event) => event.preventDefault())

  try {
    await sandboxWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createSandboxHtml())}`)
    const script = `window.__runRequestorScript(${JSON.stringify(boundedContext)})`
    const resultPromise = sandboxWindow.webContents.executeJavaScript(script, true) as Promise<ScriptRunnerResult>
    const timeoutPromise = new Promise<ScriptRunnerResult>((resolve) => {
      setTimeout(() => resolve(createTimeoutResult(startedAt)), SCRIPT_TIMEOUT_MS)
    })
    const result = await Promise.race([resultPromise, timeoutPromise])
    return validateRunnerResult(startedAt, result)
  } catch (error: unknown) {
    return createErrorResult(startedAt, error)
  } finally {
    if (!sandboxWindow.isDestroyed()) sandboxWindow.destroy()
  }
}
