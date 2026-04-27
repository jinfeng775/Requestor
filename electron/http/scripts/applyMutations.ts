import type { HttpRequestConfig, KeyValue } from '../../../src/renderer/src/types/request'
import type { ScriptKeyValueMutation, ScriptMutationResult } from './types'

interface AppliedMutations {
  request: HttpRequestConfig
  envVars: Record<string, string>
}

function applyKeyValueMutations(
  list: KeyValue[],
  mutations: ScriptKeyValueMutation[] | undefined
): KeyValue[] {
  if (!mutations?.length) return list.map((item) => ({ ...item }))

  return mutations.reduce<KeyValue[]>((items, mutation) => {
    const existingIndex = items.findIndex(
      (item) => item.key.toLowerCase() === mutation.key.toLowerCase()
    )

    if (mutation.action === 'unset') {
      if (existingIndex === -1) return items
      return items.map((item, index) =>
        index === existingIndex ? { ...item, enabled: false } : item
      )
    }

    const nextItem: KeyValue = {
      key: mutation.key,
      value: mutation.value ?? '',
      enabled: true
    }

    if (existingIndex === -1) return [...items, nextItem]
    return items.map((item, index) => (index === existingIndex ? { ...item, ...nextItem } : item))
  }, list.map((item) => ({ ...item })))
}

export function applyScriptMutations(
  request: HttpRequestConfig,
  envVars: Record<string, string>,
  mutations: ScriptMutationResult
): AppliedMutations {
  const nextRequest: HttpRequestConfig = {
    ...request,
    method: mutations.request.method ?? request.method,
    url: mutations.request.url ?? request.url,
    rawBody: mutations.request.rawBody ?? request.rawBody,
    headers: applyKeyValueMutations(request.headers, mutations.request.headers),
    params: applyKeyValueMutations(request.params, mutations.request.params)
  }

  const nextEnvVars = mutations.environment.reduce<Record<string, string>>(
    (vars, mutation) => {
      if (mutation.action === 'disable') {
        const { [mutation.key]: _disabled, ...remaining } = vars
        return remaining
      }

      return {
        ...vars,
        [mutation.key]: mutation.value ?? ''
      }
    },
    { ...envVars }
  )

  return {
    request: nextRequest,
    envVars: nextEnvVars
  }
}
