import type { HttpRequestConfig, HttpResponseData } from './request'

/** 历史记录条目 */
export interface HistoryEntry {
  id: string // 记录唯一标识
  request: HttpRequestConfig // 请求配置(完整)
  response: Pick<HttpResponseData, 'status' | 'statusText' | 'totalTime' | 'bodySize'> | null // 响应摘要(关键字段)
  responseBody?: string // 响应体内容
  responseHeaders?: Record<string, string> // 响应头
  responseCookies?: HttpResponseData['cookies'] // 响应 Cookies
  responseContentType?: string // Content-Type(用于显示提示)
  error?: string // 错误信息(如果有)
  timestamp: number // 时间戳
}
