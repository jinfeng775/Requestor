import { net } from 'electron'
import { readFileSync } from 'fs'
import { basename } from 'path'
import { resolveVariables } from './variables/resolveVariables'
import type { VariableWarning } from './variables/types'
import type {
  HttpRequestConfig,
  HttpResponseData,
  KeyValue,
  FormDataEntry,
  NetworkCookie,
  NetworkDetails,
  NetworkHeaderEntry,
  NetworkQueryParam,
  NetworkTimingBreakdown
} from '../../src/renderer/src/types/request'

const MAX_BODY_PREVIEW_LENGTH = 16 * 1024
const TIMING_UNSUPPORTED_PHASES: NetworkTimingBreakdown['unsupportedPhases'] = ['dns', 'connect', 'ssl']

function interpolate(str: string, vars: Record<string, string>, warnings: VariableWarning[]): string {
  const result = resolveVariables(str, { variables: vars })
  warnings.push(...result.warnings)
  return result.value
}

function interpolateKv(
  list: KeyValue[],
  vars: Record<string, string>,
  warnings: VariableWarning[]
): KeyValue[] {
  return list.map((item) => ({
    ...item,
    key: interpolate(item.key, vars, warnings),
    value: interpolate(item.value, vars, warnings)
  }))
}

function toNetworkHeaderEntries(headers: Record<string, string>): NetworkHeaderEntry[] {
  return Object.entries(headers).map(([name, value]) => ({ name, value }))
}

function toNetworkQueryParams(params: KeyValue[]): NetworkQueryParam[] {
  return params
    .filter((param) => param.enabled && param.key)
    .map((param) => ({
      key: param.key,
      value: param.value,
      enabled: param.enabled
    }))
}

function computeHeaderSize(headers: Record<string, string>): number {
  return Object.entries(headers).reduce((total, [key, value]) => total + key.length + value.length + 4, 0)
}

function createBodyPreview(body: string | Buffer | null): string {
  if (body === null) return ''
  if (Buffer.isBuffer(body)) {
    return `[binary body omitted, ${body.length} bytes]`
  }
  if (body.length <= MAX_BODY_PREVIEW_LENGTH) {
    return body
  }
  return `${body.slice(0, MAX_BODY_PREVIEW_LENGTH)}\n… truncated (${body.length - MAX_BODY_PREVIEW_LENGTH} more chars)`
}

function computeBodySize(body: string | Buffer | null): number {
  if (body === null) return 0
  return Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body)
}

function getResponseHttpVersion(response: unknown): string | undefined {
  const candidate = response as { httpVersion?: string }
  if (!candidate.httpVersion) return undefined
  return `HTTP/${candidate.httpVersion}`
}

function getResponseRemoteAddress(response: unknown): { remoteAddress?: string; remotePort?: number } {
  const candidate = response as {
    socket?: {
      remoteAddress?: string
      remotePort?: number
    }
  }
  return {
    remoteAddress: candidate.socket?.remoteAddress,
    remotePort: candidate.socket?.remotePort
  }
}

/**
 * 构建 URL 查询字符串
 * 使用 encodeURIComponent 确保特殊字符正确编码
 * @param params 查询参数数组
 * @returns 查询字符串(带 ? 前缀),无参数时返回空字符串
 */
function buildQueryString(params: KeyValue[]): string {
  const enabled = params.filter((p) => p.enabled && p.key)
  if (enabled.length === 0) return ''
  const qs = enabled
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&')
  return `?${qs}`
}

/**
 * 构建请求头,处理认证信息
 * 支持三种认证方式:Bearer Token、Basic Auth、API Key
 * 认证信息优先级:Bearer > Basic > API Key(互斥)
 * @param config 请求配置
 * @param envVars 环境变量映射
 * @returns 请求头对象
 */
function buildHeaders(
  config: HttpRequestConfig,
  envVars: Record<string, string>,
  warnings: VariableWarning[]
): Record<string, string> {
  const headers: Record<string, string> = {}
  const enabled = interpolateKv(config.headers, envVars, warnings).filter((h) => h.enabled && h.key)
  for (const h of enabled) {
    headers[h.key] = h.value
  }

  if (config.authType === 'bearer' && config.auth) {
    const auth = config.auth as { token: string }
    headers['Authorization'] = `Bearer ${interpolate(auth.token, envVars, warnings)}`
  } else if (config.authType === 'basic' && config.auth) {
    const auth = config.auth as { username: string; password: string }
    const u = interpolate(auth.username, envVars, warnings)
    const p = interpolate(auth.password, envVars, warnings)
    headers['Authorization'] = `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`
  } else if (config.authType === 'apikey' && config.auth) {
    const auth = config.auth as { key: string; value: string; addTo: 'header' | 'query' }
    if (auth.addTo === 'header') {
      headers[interpolate(auth.key, envVars, warnings)] = interpolate(
        auth.value,
        envVars,
        warnings
      )
    }
  }

  return headers
}

interface MultipartResult {
  body: Buffer
  contentType: string
}

/**
 * 构建 multipart/form-data 请求体
 * 支持文件上传和文本字段
 * @param entries 表单数据项数组
 * @param envVars 环境变量映射
 * @returns 包含 body(Buffer) 和 contentType 的对象
 */
function buildMultipartFormData(
  entries: FormDataEntry[],
  envVars: Record<string, string>,
  warnings: VariableWarning[]
): MultipartResult {
  const boundary = `----FormBoundary${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  const parts: Buffer[] = []

  const enabled = entries.filter((e) => e.enabled && e.key)
  for (const entry of enabled) {
    const key = interpolate(entry.key, envVars, warnings)
    let part = `--${boundary}\r\n`

    if (entry.type === 'file' && entry.filePath) {
      try {
        const fileData = readFileSync(entry.filePath)
        const fileName = basename(entry.filePath)
        part += `Content-Disposition: form-data; name="${key}"; filename="${fileName}"\r\n`
        part += `Content-Type: application/octet-stream\r\n\r\n`
        parts.push(Buffer.from(part))
        parts.push(fileData)
        parts.push(Buffer.from('\r\n'))
      } catch {
        part += `Content-Disposition: form-data; name="${key}"\r\n\r\n\r\n`
        parts.push(Buffer.from(part))
      }
    } else {
      const value = interpolate(entry.value, envVars, warnings)
      part += `Content-Disposition: form-data; name="${key}"\r\n\r\n`
      part += `${value}\r\n`
      parts.push(Buffer.from(part))
    }
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`))
  const body = Buffer.concat(parts)

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`
  }
}

/**
 * 读取二进制文件作为请求体
 * @param filePath 文件路径
 * @returns 包含 body 和 contentType 的对象,失败返回 null
 */
function buildBinaryBody(filePath: string): { body: Buffer; contentType: string } | null {
  try {
    const body = readFileSync(filePath)
    return { body, contentType: 'application/octet-stream' }
  } catch {
    return null
  }
}

/**
 * 根据 bodyType 推断 Content-Type
 * @param config 请求配置
 * @returns Content-Type 字符串或 null
 */
function getContentType(config: HttpRequestConfig): string | null {
  if (config.bodyType === 'raw') {
    const map: Record<string, string> = {
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      text: 'text/plain'
    }
    return map[config.rawBodyFormat] || 'text/plain'
  }
  if (config.bodyType === 'x-www-form-urlencoded') {
    return 'application/x-www-form-urlencoded'
  }
  return null
}

/**
 * 根据请求配置构建请求体
 * 支持五种类型:none, raw, x-www-form-urlencoded, form-data, binary
 * @param config 请求配置
 * @param envVars 环境变量映射
 * @returns 包含 body 和 contentType 的对象
 */
function buildBody(
  config: HttpRequestConfig,
  envVars: Record<string, string>,
  warnings: VariableWarning[]
): { body: string | Buffer | null; contentType: string | null } {
  if (config.bodyType === 'none') return { body: null, contentType: null }

  if (config.bodyType === 'raw') {
    return { body: interpolate(config.rawBody, envVars, warnings), contentType: getContentType(config) }
  }

  if (config.bodyType === 'x-www-form-urlencoded') {
    const data = interpolateKv(config.urlEncodedData, envVars, warnings).filter(
      (d) => d.enabled && d.key
    )
    const params = data
      .map((d) => `${encodeURIComponent(d.key)}=${encodeURIComponent(d.value)}`)
      .join('&')
    return { body: params, contentType: 'application/x-www-form-urlencoded' }
  }

  if (config.bodyType === 'form-data') {
    const result = buildMultipartFormData(config.formData, envVars, warnings)
    return { body: result.body, contentType: result.contentType }
  }

  if (config.bodyType === 'binary' && config.binaryFilePath) {
    const result = buildBinaryBody(config.binaryFilePath)
    if (result) return { body: result.body, contentType: result.contentType }
  }

  return { body: null, contentType: null }
}

function buildMergedUrl(
  rawUrl: string,
  params: KeyValue[]
): string {
  if (!rawUrl || !rawUrl.trim()) return rawUrl

  const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`
  const url = new URL(normalizedUrl)

  for (const param of params) {
    if (!param.enabled || !param.key) continue
    url.searchParams.append(param.key, param.value)
  }

  return url.toString()
}

export async function executeRequest(
  config: HttpRequestConfig,
  envVars: Record<string, string> = {}
): Promise<HttpResponseData> {
  const variableWarnings: VariableWarning[] = []

  const interpolatedUrl = interpolate(config.url, envVars, variableWarnings).trim()
  const interpolatedParams = interpolateKv(config.params, envVars, variableWarnings)
  let fullUrl = buildMergedUrl(interpolatedUrl, interpolatedParams)

  if (config.authType === 'apikey' && config.auth) {
    const auth = config.auth as { key: string; value: string; addTo: 'header' | 'query' }
    if (auth.addTo === 'query') {
      const sep = fullUrl.includes('?') ? '&' : '?'
      fullUrl += `${sep}${encodeURIComponent(interpolate(auth.key, envVars, variableWarnings))}=${encodeURIComponent(interpolate(auth.value, envVars, variableWarnings))}`
    }
  }

  if (!fullUrl || !fullUrl.trim()) {
    throw { message: 'URL is empty', code: 'INVALID_URL' }
  }

  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = 'http://' + fullUrl
  }

  try {
    new URL(fullUrl)
  } catch {
    throw { message: `Invalid URL: ${fullUrl}`, code: 'INVALID_URL' }
  }

  const headers = buildHeaders(config, envVars, variableWarnings)
  const { body, contentType } = buildBody(config, envVars, variableWarnings)

  if (contentType && !headers['Content-Type']) {
    headers['Content-Type'] = contentType
  }

  const hasBody = !['GET', 'HEAD'].includes(config.method)
  const requestBodySize = hasBody ? computeBodySize(body) : 0
  const requestHeaderSize = computeHeaderSize(headers)
  const requestBodyPreview = hasBody ? createBodyPreview(body) : ''
  const requestQueryString = toNetworkQueryParams(interpolatedParams)

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    let firstByteAt: number | null = null
    let responseHeaders: Record<string, string> = {}
    let statusCode = 0
    let statusText = ''
    let protocol: string | undefined
    let remoteAddress: string | undefined
    let remotePort: number | undefined
    const redirects: NetworkDetails['redirects'] = []

    const request = net.request({
      method: config.method,
      url: fullUrl,
      redirect: 'follow'
    })

    for (const [key, value] of Object.entries(headers)) {
      request.setHeader(key, value)
    }

    ;(request as unknown as {
      on(event: 'redirect', listener: (statusCode: number, method: string, redirectUrl: string, responseHeaders: Record<string, string | string[]>) => void): void
    }).on?.('redirect', (redirectStatusCode, redirectMethod, redirectUrl, redirectHeaders) => {
      redirects.push({
        status: redirectStatusCode,
        statusText: '',
        method: (redirectMethod.toUpperCase() || config.method) as HttpRequestConfig['method'],
        url: redirectUrl,
        location: Array.isArray(redirectHeaders.location)
          ? redirectHeaders.location[0]
          : redirectHeaders.location
      })
    })

    request.on('response', (response) => {
      statusCode = response.statusCode
      statusText = response.statusMessage || ''
      protocol = getResponseHttpVersion(response)
      const remote = getResponseRemoteAddress(response)
      remoteAddress = remote.remoteAddress
      remotePort = remote.remotePort

      for (const [key, value] of Object.entries(response.headers)) {
        responseHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value)
      }

      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => {
        if (firstByteAt === null) {
          firstByteAt = Date.now()
        }
        chunks.push(chunk)
      })

      response.on('end', () => {
        const endedAt = Date.now()
        const totalTime = endedAt - startTime
        const bodyBuffer = Buffer.concat(chunks)
        const bodyStr = bodyBuffer.toString('utf-8')
        const responseHeaderSize = computeHeaderSize(responseHeaders)
        const responseContentType = responseHeaders['content-type'] || ''

        const cookies: NetworkCookie[] = []
        const setCookie = response.headers['set-cookie']
        if (setCookie) {
          const cookieList = Array.isArray(setCookie) ? setCookie : [setCookie]
          for (const c of cookieList) {
            const parts = c.split(';')[0]
            const eqIdx = parts.indexOf('=')
            if (eqIdx > 0) {
              cookies.push({
                name: parts.substring(0, eqIdx).trim(),
                value: parts.substring(eqIdx + 1).trim(),
                domain: new URL(fullUrl).hostname,
                path: '/'
              })
            }
          }
        }

        const waitingTtfbMs = firstByteAt === null ? totalTime : firstByteAt - startTime
        const downloadMs = firstByteAt === null ? 0 : endedAt - firstByteAt

        const networkDetails: NetworkDetails = {
          overview: {
            method: config.method,
            finalUrl: fullUrl,
            status: statusCode,
            statusText,
            totalTime,
            requestBodySize,
            responseBodySize: bodyBuffer.length,
            transferredSize: responseHeaderSize + bodyBuffer.length,
            protocol
          },
          request: {
            method: config.method,
            originalUrl: config.url,
            finalUrl: fullUrl,
            queryString: requestQueryString,
            headers: toNetworkHeaderEntries(headers),
            headerSize: requestHeaderSize,
            bodyPreview: requestBodyPreview,
            bodySize: requestBodySize,
            bodyType: config.bodyType,
            contentType: headers['Content-Type'] || ''
          },
          response: {
            url: fullUrl,
            status: statusCode,
            statusText,
            headers: toNetworkHeaderEntries(responseHeaders),
            rawHeaders: responseHeaders,
            headerSize: responseHeaderSize,
            bodySize: bodyBuffer.length,
            contentType: responseContentType,
            cookies,
            remoteAddress,
            remotePort,
            protocol
          },
          timing: {
            totalMs: totalTime,
            waitingTtfbMs,
            downloadMs,
            accuracy: 'measured',
            unsupportedPhases: TIMING_UNSUPPORTED_PHASES
          },
          redirects
        }

        resolve({
          status: statusCode,
          statusText,
          headers: responseHeaders,
          body: bodyStr,
          bodySize: bodyBuffer.length,
          headerSize: responseHeaderSize,
          totalTime,
          contentType: responseContentType,
          cookies,
          networkDetails,
          variableWarnings
        })
      })

      response.on('error', (err) => {
        reject({ message: err.message, code: 'RESPONSE_ERROR' })
      })
    })

    request.on('error', (err) => {
      reject({ message: err.message, code: 'REQUEST_ERROR' })
    })

    if (hasBody && body) {
      request.write(body)
    }

    request.end()
  })
}
