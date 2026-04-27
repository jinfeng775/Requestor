import { DEFAULT_REQUEST } from '../types/request'
import type { HttpRequestConfig, RequestScripts } from '../types/request'

interface NormalizeOptions {
  trustScripts?: boolean
}

type LegacyRequestConfig = Partial<Omit<HttpRequestConfig, 'scripts'>> & {
  scripts?: Partial<RequestScripts>
}

function hasScriptContent(scripts: Partial<RequestScripts> | undefined): boolean {
  return Boolean(scripts?.preRequest?.trim() || scripts?.postRequest?.trim())
}

export function normalizeRequestConfig(
  request: LegacyRequestConfig,
  options: NormalizeOptions = {}
): HttpRequestConfig {
  const scripts = request.scripts ?? {}
  const trusted = options.trustScripts ?? scripts.trusted ?? !hasScriptContent(scripts)

  return {
    ...DEFAULT_REQUEST,
    ...request,
    params: request.params ? [...request.params] : [],
    headers: request.headers ? [...request.headers] : [],
    formData: request.formData ? [...request.formData] : [],
    urlEncodedData: request.urlEncodedData ? [...request.urlEncodedData] : [],
    scripts: {
      preRequest: scripts.preRequest ?? '',
      postRequest: scripts.postRequest ?? '',
      trusted
    }
  }
}
