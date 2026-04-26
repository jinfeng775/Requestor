import { net } from 'electron'
import { readFileSync } from 'fs'
import { basename } from 'path'
import { resolveVariables } from './variables/resolveVariables'
import type { VariableWarning } from './variables/types'
import type {
  HttpRequestConfig,
  HttpResponseData,
  KeyValue,
  FormDataEntry
} from '../../src/renderer/src/types/request'

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

  // Bearer Token 认证
  if (config.authType === 'bearer' && config.auth) {
    const auth = config.auth as { token: string }
    headers['Authorization'] = `Bearer ${interpolate(auth.token, envVars, warnings)}`
  } else if (config.authType === 'basic' && config.auth) {
    // Basic Auth 认证(Base64 编码用户名:密码)
    const auth = config.auth as { username: string; password: string }
    const u = interpolate(auth.username, envVars, warnings)
    const p = interpolate(auth.password, envVars, warnings)
    headers['Authorization'] = `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`
  } else if (config.authType === 'apikey' && config.auth) {
    // API Key 认证(可添加到 header 或 query)
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
  // 生成唯一的 boundary 字符串
  const boundary = `----FormBoundary${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  const parts: Buffer[] = []

  const enabled = entries.filter((e) => e.enabled && e.key)
  for (const entry of enabled) {
    const key = interpolate(entry.key, envVars, warnings)
    let part = `--${boundary}\r\n`

    if (entry.type === 'file' && entry.filePath) {
      // 文件上传:读取文件内容并设置 Content-Disposition
      try {
        const fileData = readFileSync(entry.filePath)
        const fileName = basename(entry.filePath)
        part += `Content-Disposition: form-data; name="${key}"; filename="${fileName}"\r\n`
        part += `Content-Type: application/octet-stream\r\n\r\n`
        parts.push(Buffer.from(part))
        parts.push(fileData)
        parts.push(Buffer.from('\r\n'))
      } catch {
        // 文件读取失败,跳过该字段
        part += `Content-Disposition: form-data; name="${key}"\r\n\r\n\r\n`
        parts.push(Buffer.from(part))
      }
    } else {
      // 文本字段
      const value = interpolate(entry.value, envVars, warnings)
      part += `Content-Disposition: form-data; name="${key}"\r\n\r\n`
      part += `${value}\r\n`
      parts.push(Buffer.from(part))
    }
  }

  // 添加结束 boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`))
  const body = Buffer.concat(parts) // 拼接所有部分

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

  // 原始请求体(JSON/XML/HTML/Text)
  if (config.bodyType === 'raw') {
    return { body: interpolate(config.rawBody, envVars, warnings), contentType: getContentType(config) }
  }

  // x-www-form-urlencoded 表单数据
  if (config.bodyType === 'x-www-form-urlencoded') {
    const data = interpolateKv(config.urlEncodedData, envVars, warnings).filter(
      (d) => d.enabled && d.key
    )
    const params = data
      .map((d) => `${encodeURIComponent(d.key)}=${encodeURIComponent(d.value)}`)
      .join('&')
    return { body: params, contentType: 'application/x-www-form-urlencoded' }
  }

  // multipart/form-data(支持文件上传)
  if (config.bodyType === 'form-data') {
    const result = buildMultipartFormData(config.formData, envVars, warnings)
    return { body: result.body, contentType: result.contentType }
  }

  // 二进制文件
  if (config.bodyType === 'binary' && config.binaryFilePath) {
    const result = buildBinaryBody(config.binaryFilePath)
    if (result) return { body: result.body, contentType: result.contentType }
  }

  return { body: null, contentType: null }
}

/**
 * 执行 HTTP 请求的核心函数
 * 完整的请求流程:
 * 1. URL 插值和 QueryString 构建
 * 2. API Key 认证的特殊处理(query/header)
 * 3. URL 验证和协议补全
 * 4. 请求头和请求体构建
 * 5. Electron net.request 的异步处理
 * 6. 响应数据的收集和处理(cookies, headers, body)
 * 7. 性能统计(totalTime, bodySize)
 *
 * @param config HTTP 请求配置
 * @param envVars 环境变量映射
 * @returns Promise<HttpResponseData>
 */
export async function executeRequest(
  config: HttpRequestConfig,
  envVars: Record<string, string> = {}
): Promise<HttpResponseData> {
  const variableWarnings: VariableWarning[] = []

  // 1. URL 插值和 QueryString 构建
  const interpolatedUrl = interpolate(config.url, envVars, variableWarnings).trim()
  const queryString = buildQueryString(interpolateKv(config.params, envVars, variableWarnings))
  let fullUrl = interpolatedUrl + queryString

  // 2. API Key 认证的特殊处理(如果设置为添加到 query)
  if (config.authType === 'apikey' && config.auth) {
    const auth = config.auth as { key: string; value: string; addTo: 'header' | 'query' }
    if (auth.addTo === 'query') {
      const sep = fullUrl.includes('?') ? '&' : '?'
      fullUrl += `${sep}${encodeURIComponent(interpolate(auth.key, envVars, variableWarnings))}=${encodeURIComponent(interpolate(auth.value, envVars, variableWarnings))}`
    }
  }

  // 3. URL 验证
  if (!fullUrl || !fullUrl.trim()) {
    throw { message: 'URL is empty', code: 'INVALID_URL' }
  }

  // 自动补全协议
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = 'http://' + fullUrl
  }

  // 验证 URL 是否可解析
  try {
    new URL(fullUrl)
  } catch {
    throw { message: `Invalid URL: ${fullUrl}`, code: 'INVALID_URL' }
  }

  // 4. 构建请求头和请求体
  const headers = buildHeaders(config, envVars, variableWarnings)
  const { body, contentType } = buildBody(config, envVars, variableWarnings)

  // 自动设置 Content-Type(如果未手动指定)
  if (contentType && !headers['Content-Type']) {
    headers['Content-Type'] = contentType
  }

  // GET 和 HEAD 请求不包含请求体
  const hasBody = !['GET', 'HEAD'].includes(config.method)

  // 5-7. 发送请求并处理响应
  return new Promise((resolve, reject) => {
    const startTime = Date.now() // 记录开始时间用于性能统计

    const request = net.request({
      method: config.method,
      url: fullUrl,
      redirect: 'follow' // 自动跟随重定向
    })

    // 设置请求头
    for (const [key, value] of Object.entries(headers)) {
      request.setHeader(key, value)
    }

    let responseHeaders: Record<string, string> = {}
    let statusCode = 0
    let statusText = ''

    // 监听响应
    request.on('response', (response) => {
      statusCode = response.statusCode
      statusText = response.statusMessage || ''

      // 收集响应头
      for (const [key, value] of Object.entries(response.headers)) {
        responseHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value)
      }

      // 收集响应体数据
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      // 响应结束
      response.on('end', () => {
        const totalTime = Date.now() - startTime // 计算总耗时
        const bodyBuffer = Buffer.concat(chunks)
        const bodyStr = bodyBuffer.toString('utf-8')

        // 解析 Cookies
        const cookies: Array<{ name: string; value: string; domain: string; path: string }> = []
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

        // 返回响应数据
        resolve({
          status: statusCode,
          statusText,
          headers: responseHeaders,
          body: bodyStr,
          bodySize: bodyBuffer.length,
          headerSize: JSON.stringify(responseHeaders).length,
          totalTime,
          contentType: responseHeaders['content-type'] || '',
          cookies,
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

    // 发送请求体
    if (hasBody && body) {
      if (Buffer.isBuffer(body)) {
        request.write(body)
      } else {
        request.write(body)
      }
    }

    request.end()
  })
}
