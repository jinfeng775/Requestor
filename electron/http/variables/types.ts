import type { VariableWarning } from '../../../src/renderer/src/types/request'

export type { VariableWarning }

export interface ResolveVariablesOptions {
  variables: Record<string, string>
  now?: Date
  maxDepth?: number
}

export interface ResolveVariablesResult {
  value: string
  warnings: VariableWarning[]
}
