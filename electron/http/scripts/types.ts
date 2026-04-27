import type {
  HttpMethod,
  HttpRequestConfig,
  HttpResponseData,
  KeyValue,
  ScriptEnvironmentMutation,
  ScriptExecutionError,
  ScriptExecutionResult,
  ScriptLogEntry,
  ScriptPhase
} from '../../../src/renderer/src/types/request'

export type ScriptKeyValueMutationAction = 'set' | 'unset'

export interface ScriptKeyValueMutation {
  action: ScriptKeyValueMutationAction
  key: string
  value?: string
}

export interface ScriptRequestMutations {
  method?: HttpMethod
  url?: string
  rawBody?: string
  headers?: ScriptKeyValueMutation[]
  params?: ScriptKeyValueMutation[]
}

export interface ScriptMutationResult {
  request: ScriptRequestMutations
  environment: ScriptEnvironmentMutation[]
}

export interface ScriptRunContext {
  phase: ScriptPhase
  script: string
  request: HttpRequestConfig
  envVars: Record<string, string>
  response?: HttpResponseData
}

export interface ScriptRunnerResult extends ScriptExecutionResult {
  mutations: ScriptMutationResult
}

export type ScriptRunner = (context: ScriptRunContext) => Promise<ScriptRunnerResult>

export type ScriptTrustVerifier = (
  request: HttpRequestConfig,
  scriptHash: string,
  trustScope: string
) => Promise<boolean>


export interface ScriptPipelineDependencies {
  runner?: ScriptRunner
  trustScripts?: ScriptTrustVerifier
  executeHttpRequest?: (
    request: HttpRequestConfig,
    envVars: Record<string, string>
  ) => Promise<HttpResponseData>
}

export interface ScriptPipelineSuccess {
  success: true
  data: HttpResponseData
  scriptReport: NonNullable<HttpResponseData['scriptReport']>
}

export interface ScriptPipelineFailure {
  success: false
  error: {
    message: string
    code: string
    scriptReport?: NonNullable<HttpResponseData['scriptReport']>
  }
  scriptReport: NonNullable<HttpResponseData['scriptReport']>
}

export type ScriptPipelineResult = ScriptPipelineSuccess | ScriptPipelineFailure

export function createSkippedScriptResult(): ScriptExecutionResult {
  return {
    status: 'skipped',
    logs: [],
    durationMs: 0
  }
}

export function createFailedScriptResult(error: ScriptExecutionError): ScriptExecutionResult {
  return {
    status: 'failed',
    logs: [],
    durationMs: 0,
    error
  }
}
