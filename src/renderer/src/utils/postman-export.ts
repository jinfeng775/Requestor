/**
 * Postman Collection v2.1 JSON 导出工具
 * 将内部 Collection 格式转换为 Postman 兼容的 JSON 格式
 * 可直接导入 Postman 使用
 */

import type { Collection, CollectionItem, CollectionFolder, CollectionRequest } from '@/types/collection'
import type { HttpRequestConfig, KeyValue, AuthType } from '@/types/request'

// ─── Postman v2.1 类型定义 ────────────────────────────────────

interface PostmanCollection {
  info: {
    _postman_id: string
    name: string
    description: string
    schema: string
  }
  item: PostmanItem[]
  variable: PostmanVariable[]
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
  header: PostmanKeyValue[]
  body: PostmanBody | null
  url: PostmanUrl
  description: string
  auth?: PostmanAuth | null
}

interface PostmanUrl {
  raw: string
  protocol: string
  host: string[]
  path: string[]
  query: PostmanKeyValue[]
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

// ─── URL 解析 ──────────────────────────────────────────────────

/**
 * 将完整 URL 字符串解析为 Postman URL 对象
 * @param urlString 完整 URL
 * @returns Postman URL 对象
 */
function decomposeUrl(urlString: string): PostmanUrl {
  try {
    const url = new URL(urlString)
    const host = url.hostname.split('.')
    const path = url.pathname.split('/').filter(Boolean)
    const query: PostmanKeyValue[] = []
    url.searchParams.forEach((value, key) => {
      query.push({ key, value, disabled: false })
    })
    const result: PostmanUrl = {
      raw: urlString,
      protocol: url.protocol.replace(':', ''),
      host,
      path,
      query
    }
    if (url.port) result.port = url.port
    return result
  } catch {
    // URL 解析失败时,尽力而为
    return {
      raw: urlString,
      protocol: '',
      host: [],
      path: urlString.split('?')[0].split('/').filter(Boolean),
      query: []
    }
  }
}

// ─── 映射函数 ──────────────────────────────────────────────────

/** 内部 HTTP 方法 → Postman 方法 (直接透传) */
function mapMethod(method: string): string {
  return method
}

/** 将 KeyValue[] 转换为 Postman header/query 数组 */
function mapKeyValueArray(items: KeyValue[]): PostmanKeyValue[] {
  return items
    .filter((item) => item.enabled)
    .map((item) => ({
      key: item.key,
      value: item.value,
      description: item.description,
      disabled: !item.enabled
    }))
}

/** 将内部 body 配置转换为 Postman body 对象 */
function mapBody(config: HttpRequestConfig): PostmanBody | null {
  if (config.bodyType === 'none') return null

  if (config.bodyType === 'raw') {
    const body: PostmanBody = {
      mode: 'raw',
      raw: config.rawBody,
      options: { raw: { language: config.rawBodyFormat } }
    }
    return body
  }

  if (config.bodyType === 'form-data') {
    return {
      mode: 'formdata',
      formdata: config.formData.map((entry) => ({
        key: entry.key,
        value: entry.type === 'text' ? entry.value : undefined,
        type: entry.type,
        src: entry.type === 'file' ? entry.filePath : undefined
      }))
    }
  }

  if (config.bodyType === 'x-www-form-urlencoded') {
    return {
      mode: 'urlencoded',
      urlencoded: config.urlEncodedData
        .filter((item) => item.enabled)
        .map((item) => ({ key: item.key, value: item.value }))
    }
  }

  if (config.bodyType === 'binary') {
    return {
      mode: 'file',
      file: { src: config.binaryFilePath }
    } as unknown as PostmanBody
  }

  return null
}

/** 将内部 auth 配置转换为 Postman auth 对象 */
function mapAuth(authType: AuthType, auth: HttpRequestConfig['auth']): PostmanAuth | null {
  if (authType === 'none' || !auth) return null

  if (authType === 'bearer') {
    return {
      type: 'bearer',
      bearer: [{ key: 'token', value: (auth as { token: string }).token, type: 'string' }]
    }
  }

  if (authType === 'basic') {
    const basic = auth as { username: string; password: string }
    return {
      type: 'basic',
      basic: [
        { key: 'username', value: basic.username, type: 'string' },
        { key: 'password', value: basic.password, type: 'string' }
      ]
    }
  }

  if (authType === 'apikey') {
    const apikey = auth as { key: string; value: string; addTo: string }
    return {
      type: 'apikey',
      apikey: [
        { key: 'key', value: apikey.key, type: 'string' },
        { key: 'value', value: apikey.value, type: 'string' },
        { key: 'in', value: apikey.addTo === 'query' ? 'query' : 'header', type: 'string' }
      ]
    }
  }

  return null
}

/** 将内部请求转换为 Postman request 对象 */
function mapRequest(config: HttpRequestConfig): PostmanRequest {
  const result: PostmanRequest = {
    method: mapMethod(config.method),
    header: mapKeyValueArray(config.headers),
    body: mapBody(config),
    url: decomposeUrl(config.url),
    description: config.description || ''
  }
  const authResult = mapAuth(config.authType, config.auth)
  if (authResult) result.auth = authResult
  return result
}

function mapRequestScripts(config: HttpRequestConfig): PostmanEvent[] {
  const events: PostmanEvent[] = []
  if (config.scripts.preRequest.trim()) {
    events.push({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: config.scripts.preRequest.split('\n')
      }
    })
  }
  if (config.scripts.postRequest.trim()) {
    events.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: config.scripts.postRequest.split('\n')
      }
    })
  }
  return events
}

/** 将响应示例转换为 Postman response 对象 */
function mapResponseExamples(item: CollectionRequest): PostmanResponse[] {
  if (!item.responseExamples || item.responseExamples.length === 0) return []
  return item.responseExamples.map((example) => {
    const previewLanguage = example.contentType.includes('json')
      ? 'json'
      : example.contentType.includes('xml')
        ? 'xml'
        : example.contentType.includes('html')
          ? 'html'
          : 'text'

    return {
      name: example.name,
      originalRequest: mapRequest(item.request),
      status: example.statusText,
      code: example.status,
      _postman_previewlanguage: previewLanguage,
      header: Object.entries(example.headers).map(([key, value]) => ({ key, value })),
      cookie: example.cookies || [],
      body: example.body
    }
  })
}

/** 将内部集合项递归转换为 Postman item */
function mapItem(item: CollectionItem): PostmanItem {
  if (item.type === 'folder') {
    return mapFolder(item)
  }
  return mapRequestItem(item)
}

/** 将内部文件夹转换为 Postman item (文件夹) */
function mapFolder(folder: CollectionFolder): PostmanItem {
  return {
    name: folder.name,
    item: folder.items.map(mapItem)
  }
}

/** 将内部请求项转换为 Postman item (请求) */
function mapRequestItem(item: CollectionRequest): PostmanItem {
  const event = mapRequestScripts(item.request)
  return {
    name: item.name,
    id: item.id,
    request: mapRequest(item.request),
    response: mapResponseExamples(item),
    ...(event.length ? { event } : {})
  }
}

// ─── 主转换函数 ────────────────────────────────────────────────

/**
 * 将内部 Collection 转换为 Postman Collection v2.1 JSON
 * @param collection 内部集合对象
 * @returns Postman Collection v2.1 对象
 */
export function collectionToPostmanV21(collection: Collection): PostmanCollection {
  return {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: collection.items.map(mapItem),
    variable: []
  }
}
