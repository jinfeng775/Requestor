import type { HttpRequestConfig, HttpResponseData, NetworkDetails } from './request'

/** 响应示例 - 保存的请求/响应对 */
export interface ResponseExample {
  id: string
  name: string // 如 "200 OK", "404 Not Found"
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  contentType: string
  bodySize: number
  headerSize?: number
  totalTime: number
  cookies: HttpResponseData['cookies']
  networkDetails?: NetworkDetails
  createdAt: number
}

/** 集合接口 - 用于组织和管理多个请求 */
export interface Collection {
  id: string // 集合唯一标识
  name: string // 集合名称
  description: string // 集合描述
  items: CollectionItem[] // 集合项(文件夹或请求)
  createdAt: number // 创建时间戳
  updatedAt: number // 更新时间戳
}

/** 集合项类型 - 可以是文件夹或请求 */
export type CollectionItem = CollectionFolder | CollectionRequest

/** 集合文件夹 - 支持嵌套结构 */
export interface CollectionFolder {
  id: string
  type: 'folder'
  name: string
  items: CollectionItem[] // 子项(支持递归嵌套)
}

/** 集合中的请求项 */
export interface CollectionRequest {
  id: string
  type: 'request'
  name: string
  request: HttpRequestConfig // 请求配置
  responseExamples?: ResponseExample[] // 保存的响应示例
}
