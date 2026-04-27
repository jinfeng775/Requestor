import { createHash } from 'node:crypto'
import { executeRequest } from './engine'
import { applyScriptMutations } from './scripts/applyMutations'
import { runScript } from './scripts/sandboxRunner'
import {
  createSkippedScriptResult,
  type ScriptPipelineDependencies,
  type ScriptPipelineResult,
  type ScriptRunnerResult
} from './scripts/types'
import type {
  HttpRequestConfig,
  HttpResponseData,
  ScriptExecutionReport,
  ScriptExecutionResult,
  ScriptEnvironmentMutation,
  ScriptRequestMutationSummary
} from '../../src/renderer/src/types/request'

function hasScriptContent(config: HttpRequestConfig): boolean {
  return Boolean(config.scripts.preRequest.trim() || config.scripts.postRequest.trim())
}

function createScriptHash(config: HttpRequestConfig): string {
  return createHash('sha256')
    .update(config.scripts.preRequest)
    .update('\0')
    .update(config.scripts.postRequest)
    .digest('hex')
}

function getRequestOrigin(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return 'invalid-url'
  }
}

function createTrustScope(config: HttpRequestConfig): string {
  return createHash('sha256')
    .update(config.id)
    .update('\0')
    .update(getRequestOrigin(config.url))
    .digest('hex')
}

function summarizeRequestMutations(result: ScriptRunnerResult): ScriptRequestMutationSummary[] {
  const mutations = result.mutations.request
  const summaries: ScriptRequestMutationSummary[] = []

  if (mutations.method !== undefined) summaries.push({ field: 'method' })
  if (mutations.url !== undefined) summaries.push({ field: 'url' })
  if (mutations.rawBody !== undefined) summaries.push({ field: 'rawBody' })

  return [
    ...summaries,
    ...(mutations.headers ?? []).map((mutation) => ({
      field: 'headers' as const,
      action: mutation.action,
      key: mutation.key
    })),
    ...(mutations.params ?? []).map((mutation) => ({
      field: 'params' as const,
      action: mutation.action,
      key: mutation.key
    }))
  ]
}

function hasOriginChanged(originalUrl: string, nextUrl: string): boolean {
  return getRequestOrigin(originalUrl) !== getRequestOrigin(nextUrl)
}

function toExecutionResult(result: ScriptRunnerResult): ScriptExecutionResult {
  return {
    status: result.status,
    logs: result.logs,
    durationMs: result.durationMs,
    error: result.error
  }
}

function createInitialReport(): ScriptExecutionReport {
  return {
    preRequest: createSkippedScriptResult(),
    postRequest: createSkippedScriptResult(),
    environmentMutations: [],
    requestMutations: []
  }
}

function appendMutations(
  existing: ScriptEnvironmentMutation[],
  mutations: ScriptEnvironmentMutation[]
): ScriptEnvironmentMutation[] {
  return [...existing, ...mutations]
}

export async function executeRequestWithScripts(
  config: HttpRequestConfig,
  envVars: Record<string, string> = {},
  dependencies: ScriptPipelineDependencies = {}
): Promise<ScriptPipelineResult> {
  const runner = dependencies.runner ?? runScript
  const executeHttpRequest = dependencies.executeHttpRequest ?? executeRequest
  let currentRequest = config
  let currentEnvVars = { ...envVars }
  const scriptReport = createInitialReport()

  if (hasScriptContent(config)) {
    const isTrusted = await dependencies.trustScripts?.(config, createScriptHash(config), createTrustScope(config))
    if (!isTrusted) {
      scriptReport.requiresTrust = true
      return {
        success: false,
        error: {
          message: 'Request scripts require confirmation before execution.',
          code: 'SCRIPT_TRUST_REQUIRED',
          scriptReport
        },
        scriptReport
      }
    }
  }

  if (config.scripts.preRequest.trim()) {
    const preResult = await runner({
      phase: 'pre-request',
      script: config.scripts.preRequest,
      request: currentRequest,
      envVars: currentEnvVars
    })
    scriptReport.preRequest = toExecutionResult(preResult)

    if (preResult.status !== 'passed') {
      return {
        success: false,
        error: {
          message: preResult.error?.message ?? 'Pre-request script failed.',
          code: preResult.status === 'timeout' ? 'PRE_REQUEST_SCRIPT_TIMEOUT' : 'PRE_REQUEST_SCRIPT_ERROR',
          scriptReport
        },
        scriptReport
      }
    }

    const applied = applyScriptMutations(currentRequest, currentEnvVars, preResult.mutations)
    currentRequest = applied.request
    currentEnvVars = applied.envVars
    scriptReport.requestMutations = [
      ...scriptReport.requestMutations,
      ...summarizeRequestMutations(preResult)
    ]
    scriptReport.environmentMutations = appendMutations(
      scriptReport.environmentMutations,
      preResult.mutations.environment
    )

    scriptReport.effectiveRequest = {
      method: currentRequest.method,
      url: currentRequest.url
    }

    if (hasOriginChanged(config.url, currentRequest.url)) {
      return {
        success: false,
        error: {
          message: 'Pre-request script changed the request origin. This requires a separate trusted request.',
          code: 'PRE_REQUEST_SCRIPT_ORIGIN_CHANGED',
          scriptReport
        },
        scriptReport
      }
    }
  }

  let response: HttpResponseData
  try {
    response = await executeHttpRequest(currentRequest, currentEnvVars)
  } catch (error: unknown) {
    const requestError = error as { message?: string; code?: string }
    return {
      success: false,
      error: {
        message: requestError.message ?? 'Request failed',
        code: requestError.code ?? 'REQUEST_FAILED',
        scriptReport
      },
      scriptReport
    }
  }

  if (config.scripts.postRequest.trim()) {
    const postResult = await runner({
      phase: 'post-request',
      script: config.scripts.postRequest,
      request: currentRequest,
      envVars: currentEnvVars,
      response
    })
    scriptReport.postRequest = toExecutionResult(postResult)

    if (postResult.status === 'passed') {
      scriptReport.environmentMutations = appendMutations(
        scriptReport.environmentMutations,
        postResult.mutations.environment
      )
    }
  }

  const data: HttpResponseData = {
    ...response,
    scriptReport: {
      ...scriptReport,
      effectiveRequest: scriptReport.effectiveRequest ?? {
        method: currentRequest.method,
        url: currentRequest.url
      }
    }
  }

  return {
    success: true,
    data,
    scriptReport
  }
}
