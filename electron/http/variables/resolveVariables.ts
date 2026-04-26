import { resolveDynamicVariable } from './dynamicVariables'
import type { ResolveVariablesOptions, ResolveVariablesResult, VariableWarning } from './types'

const VARIABLE_PATTERN = /(?<!\\)\{\{\s*([^{}\s]+)\s*\}\}/g
const ESCAPED_OPEN_VARIABLE = /\\\{\{/g
const DEFAULT_MAX_DEPTH = 5

interface ResolveContext {
  variables: Record<string, string>
  now: Date
  maxDepth: number
  warnings: VariableWarning[]
}

function warning(type: VariableWarning['type'], variableName: string, message: string): VariableWarning {
  return { type, variableName, message }
}

function restoreEscapedVariables(value: string): string {
  return value.replace(ESCAPED_OPEN_VARIABLE, '{{')
}

function resolveValue(value: string, context: ResolveContext, stack: string[], depth: number): string {
  if (depth > context.maxDepth) {
    context.warnings = [
      ...context.warnings,
      warning('max-depth', stack[stack.length - 1] || '', 'Maximum variable resolution depth exceeded')
    ]
    return value
  }

  return value.replace(VARIABLE_PATTERN, (match, rawName: string) => {
    const variableName = rawName.trim()

    if (variableName.startsWith('$')) {
      const dynamicValue = resolveDynamicVariable(variableName, context.now)
      if (dynamicValue !== null) return dynamicValue

      context.warnings = [
        ...context.warnings,
        warning('dynamic-unknown', variableName, `Unknown dynamic variable: ${variableName}`)
      ]
      return match
    }

    if (!(variableName in context.variables)) {
      context.warnings = [
        ...context.warnings,
        warning('undefined', variableName, `Undefined variable: ${variableName}`)
      ]
      return match
    }

    if (stack.includes(variableName)) {
      context.warnings = [
        ...context.warnings,
        warning('circular', variableName, `Circular variable reference: ${[...stack, variableName].join(' -> ')}`)
      ]
      return match
    }

    return resolveValue(context.variables[variableName], context, [...stack, variableName], depth + 1)
  })
}

export function resolveVariables(input: string, options: ResolveVariablesOptions): ResolveVariablesResult {
  const context: ResolveContext = {
    variables: options.variables,
    now: options.now ?? new Date(),
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    warnings: []
  }
  const value = restoreEscapedVariables(resolveValue(input, context, [], 0))

  return {
    value,
    warnings: context.warnings
  }
}
