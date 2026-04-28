/**
 * Postman Collection v2.1 JSON 导入工具
 * 将 Postman 兼容的 JSON 格式转换为内部 Collection 格式
 */

import type { Collection, CollectionItem, CollectionRequest } from '@/types/collection'
import type { HttpRequestConfig, KeyValue, HttpMethod, BodyType, AuthType, BearerAuth, BasicAuth, ApiKeyAuth, RawBodyFormat, FormDataEntry } from '@/types/request'

// ─── Postman v2.1 类型定义 ────────────────────────────────────

interface PostmanCollection {
  info: {
    _postman_id?: string
    name: string
    description?: string
    schema: string
  }
  item: PostmanItem[]
  variable?: PostmanVariable[]
}

interface PostmanItem {
  id?: string
  name: string
  description?: string
  item?: PostmanItem[] // 文件夹
  request?: PostmanRequest // 请求
  response?: PostmanResponse[] // 响应示例
  event?: PostmanEvent[]
}

interface PostmanRequest {
  method: string
  header?: PostmanKeyValue[]
  body: PostmanBody | null
  url: PostmanUrl
  description?: string
  auth?: PostmanAuth | null
}

interface PostmanUrl {
  raw: string
  protocol?: string
  host?: string[]
  path?: string[]
  query?: PostmanKeyValue[]
  port?: string
}

interface PostmanKeyValue {
  key: string
  value: string
  description?: string
  disabled?: boolean
  type?: string
}

interface PostmanBody {
  mode: string
  raw?: string
  options?: { raw: { language: string } }
  formdata?: PostmanFormDataEntry[]
  urlencoded?: PostmanKeyValue[]
}

interface PostmanScript {
  type: 'text/javascript'
  exec: string[]
}

interface PostmanEvent {
  listen: 'prerequest' | 'test'
  script: PostmanScript
}

interface PostmanFormDataEntry {
  key: string
  value?: string
  type: 'text' | 'file'
  src?: string
  disabled?: boolean
}

interface PostmanAuth {
  type: string
  bearer?: PostmanKeyValue[]
  basic?: PostmanKeyValue[]
  apikey?: PostmanKeyValue[]
}

interface PostmanResponse {
  name: string
  originalRequest: PostmanRequest
  status: string
  code: number
  _postman_previewlanguage: string
  header: PostmanKeyValue[]
  cookie: unknown[]
  body: string
}

interface PostmanVariable {
  key: string
  value: string
  type: string
}

// ─── 反向映射函数 ─────────────────────────────────────────────

/** Postman 方法 → 内部 HTTP 方法 (验证并转换) */
function unmapMethod(method: string): HttpMethod {
  const upper = method.toUpperCase()
  const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
  if (validMethods.includes(upper as HttpMethod)) {
    return upper as HttpMethod
  }
  return 'GET'
}

/** 将 Postman header/query 数组转换为 KeyValue[] */
function unmapKeyValueArray(items: PostmanKeyValue[] | undefined): KeyValue[] {
  return (items || []).map((item) => ({
    key: item.key,
    value: item.value,
    description: item.description,
    enabled: item.disabled !== true
  }))
}

/** 将 Postman body 对象转换为内部 body 配置 */
function unmapBody(body: PostmanBody | null | undefined): {
  bodyType: BodyType
  rawBody: string
  rawBodyFormat: RawBodyFormat
  formData: FormDataEntry[]
  urlEncodedData: KeyValue[]
  binaryFilePath: string
} {
  const validFormats: RawBodyFormat[] = ['json', 'text', 'xml', 'html']

  if (!body) {
    return { bodyType: 'none', rawBody: '', rawBodyFormat: 'json', formData: [], urlEncodedData: [], binaryFilePath: '' }
  }

  if (body.mode === 'raw') {
    const format = body.options?.raw?.language || 'json'
    const safeFormat: RawBodyFormat = validFormats.includes(format as RawBodyFormat) ? (format as RawBodyFormat) : 'json'
    return {
      bodyType: 'raw',
      rawBody: body.raw || '',
      rawBodyFormat: safeFormat,
      formData: [],
      urlEncodedData: [],
      binaryFilePath: ''
    }
  }

  if (body.mode === 'formdata' && body.formdata) {
    return {
      bodyType: 'form-data',
      formData: body.formdata.map((entry) => ({
        key: entry.key,
        value: entry.type === 'text' ? (entry.value || '') : '',
        type: entry.type,
        filePath: entry.type === 'file' ? (entry.src || '') : undefined,
        enabled: entry.disabled !== true,
        description: ''
      })),
      rawBody: '',
      rawBodyFormat: 'json',
      urlEncodedData: [],
      binaryFilePath: ''
    }
  }

  if (body.mode === 'urlencoded' && body.urlencoded) {
    return {
      bodyType: 'x-www-form-urlencoded',
      urlEncodedData: unmapKeyValueArray(body.urlencoded),
      rawBody: '',
      rawBodyFormat: 'json',
      formData: [],
      binaryFilePath: ''
    }
  }

  if (body.mode === 'file') {
    return {
      bodyType: 'binary',
      binaryFilePath: '',
      rawBody: '',
      rawBodyFormat: 'json',
      formData: [],
      urlEncodedData: []
    }
  }

  return { bodyType: 'none', rawBody: '', rawBodyFormat: 'json', formData: [], urlEncodedData: [], binaryFilePath: '' }
}

/** 将 Postman auth 对象转换为内部 auth 配置 */
function unmapAuth(auth: PostmanAuth | null | undefined): {
  authType: AuthType
  auth: BearerAuth | BasicAuth | ApiKeyAuth | null
} {
  if (!auth) {
    return { authType: 'none', auth: null }
  }

  const authType = (auth.type || 'none') as AuthType

  if (authType === 'bearer' && auth.bearer) {
    const tokenEntry = auth.bearer.find((e) => e.key === 'token')
    return {
      authType: 'bearer',
      auth: { token: tokenEntry?.value || '' }
    }
  }

  if (authType === 'basic' && auth.basic) {
    const usernameEntry = auth.basic.find((e) => e.key === 'username')
    const passwordEntry = auth.basic.find((e) => e.key === 'password')
    return {
      authType: 'basic',
      auth: {
        username: usernameEntry?.value || '',
        password: passwordEntry?.value || ''
      }
    }
  }

  if (authType === 'apikey' && auth.apikey) {
    const keyEntry = auth.apikey.find((e) => e.key === 'key')
    const valueEntry = auth.apikey.find((e) => e.key === 'value')
    const inEntry = auth.apikey.find((e) => e.key === 'in')
    return {
      authType: 'apikey',
      auth: {
        key: keyEntry?.value || '',
        value: valueEntry?.value || '',
        addTo: inEntry?.value === 'query' ? 'query' : 'header'
      }
    }
  }

  return { authType: 'none', auth: null }
}

/** 将 Postman request 对象转换为内部 HttpRequestConfig */
function unmapRequest(request: PostmanRequest): HttpRequestConfig {
  const bodyConfig = unmapBody(request.body)
  const authConfig = unmapAuth(request.auth)

  return {
    id: crypto.randomUUID(),
    name: 'Imported Request',
    method: unmapMethod(request.method),
    url: request.url.raw,
    params: unmapKeyValueArray(request.url.query),
    headers: unmapKeyValueArray(request.header),
    ...bodyConfig,
    description: request.description || '',
    ...authConfig,
    scripts: {
      preRequest: '',
      postRequest: '',
      trusted: false
    }
  }
}

/** 将 Postman events 转换为内部 scripts */
function unmapRequestScripts(events: PostmanEvent[] | undefined): { preRequest: string; postRequest: string; trusted: boolean } {
  let preRequest = ''
  let postRequest = ''

  if (events) {
    for (const event of events) {
      if (event.listen === 'prerequest' && event.script.exec) {
        preRequest = event.script.exec.join('\n')
      } else if (event.listen === 'test' && event.script.exec) {
        postRequest = event.script.exec.join('\n')
      }
    }
  }

  return { preRequest, postRequest, trusted: false }
}

/** 将 Postman response 数组转换为内部响应示例数组 */
function unmapResponseExamples(responses: PostmanResponse[] | undefined): Array<{
  id: string
  name: string
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  bodySize: number
  totalTime: number
  contentType: string
  cookies: Array<{ name: string; value: string; domain: string; path: string }>
  createdAt: number
}> {
  if (!responses || responses.length === 0) {
    return []
  }

  return responses.map((resp) => ({
    id: crypto.randomUUID(),
    name: resp.name,
    status: resp.code,
    statusText: resp.status,
    headers: Object.fromEntries(resp.header.map((h) => [h.key, h.value])),
    body: resp.body,
    bodySize: resp.body.length,
    totalTime: 0,
    contentType: resp._postman_previewlanguage || 'text',
    cookies: [],
    createdAt: Date.now()
  }))
}

/** 将 Postman item 递归转换为内部 CollectionItem */
function unmapItem(item: PostmanItem): CollectionItem {
  if (item.request) {
    return unmapRequestItem(item)
  }
  return unmapFolder(item)
}

/** 将 Postman 文件夹转换为内部文件夹 */
function unmapFolder(folder: PostmanItem): CollectionItem {
  return {
    type: 'folder',
    id: folder.id || crypto.randomUUID(),
    name: folder.name,
    items: folder.item ? folder.item.map(unmapItem) : []
  }
}

/** 将 Postman 请求项转换为内部请求项 */
function unmapRequestItem(item: PostmanItem): CollectionRequest {
  const request = unmapRequest(item.request!)
  const scripts = unmapRequestScripts(item.event)
  const responseExamples = unmapResponseExamples(item.response)

  return {
    type: 'request',
    id: item.id || crypto.randomUUID(),
    name: item.name,
    request: {
      ...request,
      scripts
    },
    responseExamples
  }
}

// ─── 主转换函数 ───────────────────────────────────────────────

/**
 * 将 Postman Collection v2.1 JSON 转换为内部 Collection
 * @param postmanData Postman Collection v2.1 对象
 * @returns 内部 Collection 对象
 */
export function postmanV21ToCollection(postmanData: PostmanCollection): Collection {
  const now = Date.now()
  return {
    id: postmanData.info._postman_id || crypto.randomUUID(),
    name: postmanData.info.name,
    description: postmanData.info.description || '',
    items: postmanData.item.map(unmapItem),
    createdAt: now,
    updatedAt: now
  }
}

/**
 * 将 Postman Collection 数据转换为内部 Collection 数组
 * 支持单个 Collection 对象或 Collection 数组
 * @param data 待转换的数据
 * @returns 转换后的 Collection 数组,若格式无效则返回 null
 */
export function parsePostmanCollections(data: unknown): Collection[] | null {
  if (isValidPostmanCollection(data)) {
    return [postmanV21ToCollection(data)]
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null
  }

  if (!data.every((item) => isValidPostmanCollection(item))) {
    return null
  }

  return data.map((item) => postmanV21ToCollection(item))
}

/**
 * 验证 Postman Collection 数据格式
 * @param data 待验证的数据
 * @returns 是否为有效的 Postman Collection v2.1 格式
 */
export function isValidPostmanCollection(data: unknown): data is PostmanCollection {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const collection = data as Record<string, unknown>
  const info = collection.info

  if (!info || typeof info !== 'object') {
    return false
  }

  const infoRecord = info as Record<string, unknown>
  const isValidSchema = infoRecord.schema === 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  const hasName = typeof infoRecord.name === 'string' && infoRecord.name.trim() !== ''
  const items = collection.item as unknown
  const hasItems = items !== undefined && Array.isArray(items) && items.length > 0

  return isValidSchema && hasName && hasItems
}
