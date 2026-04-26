export type VariableWarningType = 'undefined' | 'circular' | 'max-depth' | 'dynamic-unknown'

export interface VariableWarning {
  type: VariableWarningType
  variableName: string
  message: string
}

/** HTTP 请求方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

/** 请求体类型 */
export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary'

/** 原始请求体格式 */
export type RawBodyFormat = 'json' | 'text' | 'xml' | 'html'

/** 认证类型 */
export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey'

/** 键值对数据结构,用于 Headers、Params 等 */
export interface KeyValue {
  key: string
  value: string
  enabled: boolean
  description?: string
}

/** 表单数据项,支持文本和文件两种类型 */
export interface FormDataEntry extends KeyValue {
  type: 'text' | 'file'
  filePath?: string
}

/** Bearer Token 认证 */
export interface BearerAuth {
  token: string
}

/** Basic Auth 认证 */
export interface BasicAuth {
  username: string
  password: string
}

/** API Key 认证 */
export interface ApiKeyAuth {
  key: string
  value: string
  addTo: 'header' | 'query' // 添加到请求头还是查询参数
}

/** HTTP 请求配置接口 */
export interface HttpRequestConfig {
  id: string // 请求唯一标识
  name: string // 请求名称
  description: string // 请求描述/备注
  method: HttpMethod // HTTP 方法
  url: string // 请求 URL
  params: KeyValue[] // 查询参数
  headers: KeyValue[] // 请求头
  bodyType: BodyType // 请求体类型
  rawBody: string // 原始请求体内容
  rawBodyFormat: RawBodyFormat // 原始请求体格式
  formData: FormDataEntry[] // 表单数据
  urlEncodedData: KeyValue[] // x-www-form-urlencoded 数据
  binaryFilePath: string // 二进制文件路径
  authType: AuthType // 认证类型
  auth: BearerAuth | BasicAuth | ApiKeyAuth | null // 认证信息
}

/** HTTP 响应数据接口 */
export interface HttpResponseData {
  status: number // HTTP 状态码
  statusText: string // 状态文本
  headers: Record<string, string> // 响应头
  body: string // 响应体
  bodySize: number // 响应体大小(字节)
  headerSize: number // 响应头大小(字节)
  totalTime: number // 总耗时(毫秒)
  contentType: string // Content-Type
  cookies: Array<{ name: string; value: string; domain: string; path: string }> // Cookies
  variableWarnings?: VariableWarning[] // 变量解析警告
}

/** 请求错误信息 */
export interface RequestError {
  message: string
  code?: string
}

/** 默认请求配置 */
export const DEFAULT_REQUEST: HttpRequestConfig = {
  id: '',
  name: 'Untitled Request',
  description: '',
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  bodyType: 'none',
  rawBody: '',
  rawBodyFormat: 'json',
  formData: [],
  urlEncodedData: [],
  binaryFilePath: '',
  authType: 'none',
  auth: null
}
