import i18n from '@/i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import { useResponseStore } from '@/stores/response'
import { useHistoryStore } from '@/stores/history'
import { useEnvironmentStore } from '@/stores/environment'
import { useCollectionStore } from '@/stores/collection'
import { useToast } from '@/composables/useToast'
import { nanoid } from '@/utils/uuid'
import type { HttpRequestConfig, HttpResponseData } from '@/types/request'
import type { ResponseExample } from '@/types/collection'

/**
 * 深度克隆请求配置以脱离 Vue 响应式系统
 * 避免异步请求期间状态被修改导致的数据不一致
 * @param config 请求配置
 * @returns 深拷贝后的请求配置
 */
function deepCloneRequest(config: HttpRequestConfig): HttpRequestConfig {
  return JSON.parse(JSON.stringify(config))
}

function isSuccessfulStatus(status: number): boolean {
  return status >= 200 && status < 400
}

/**
 * 提供发送 HTTP 请求的能力
 * @returns { send } 发送请求的方法
 */
export function useRequest() {
  const editor = useRequestEditorStore()
  const response = useResponseStore()
  const history = useHistoryStore()
  const envStore = useEnvironmentStore()
  const collections = useCollectionStore()
  const toast = useToast()
  const t = i18n.global.t

  /**
   * 发送 HTTP 请求的完整流程:
   * 1. 前置校验(URL 和 Electron API 可用性)
   * 2. 设置加载状态
   * 3. 深度克隆请求配置和环境变量(解耦响应式系统)
   * 4. 调用 Electron API 发送请求
   * 5. 处理成功/失败响应并更新历史和响应状态
   */
  async function send(): Promise<void> {
    if (!editor.hasUrl) return
    if (!window.api) {
      response.setError({
        message: 'Electron API not available. Please restart the app.',
        code: 'API_UNAVAILABLE'
      })
      toast.error(t('toast.requestError', { message: 'Electron API not available. Please restart the app.' }))
      return
    }

    response.setLoading()

    // 深度克隆以完全解耦 Vue 响应式 — 此后不再引用 editor 状态
    const plainRequest = deepCloneRequest(editor.activeRequest)
    const envVars = { ...envStore.activeVars }

    try {
      const result = await window.api.sendRequest(plainRequest, envVars)

      if (result.success && result.data) {
        const data = result.data as HttpResponseData
        response.setData(data)
        history.addEntry(plainRequest, data)

        // 如果请求来自集合项,更新集合中的请求配置并保存响应示例
        const colId = editor.sourceCollectionId
        const itmId = editor.sourceItemId
        if (colId && itmId) {
          // 更新集合中的请求配置(保存编辑后的请求)
          collections.updateRequestConfig(colId, itmId, plainRequest)

          // 保存响应示例
          const example: ResponseExample = {
            id: nanoid(),
            name: `${data.status} ${data.statusText}`,
            status: data.status,
            statusText: data.statusText,
            headers: data.headers,
            body: data.body,
            contentType: data.contentType,
            bodySize: data.bodySize,
            totalTime: data.totalTime,
            cookies: data.cookies,
            createdAt: Date.now()
          }
          collections.addResponseExample(colId, itmId, example)

          // 清除 isDirty 标记，因为已经保存到集合
          editor.isDirty = false
        }
        if (isSuccessfulStatus(data.status)) {
          toast.success(t('toast.requestSuccess', { status: data.status }))
        } else {
          toast.error(t('toast.requestErrorStatus', { status: data.status }))
        }
      } else if (result.error) {
        response.setError(result.error)
        history.addEntry(plainRequest, null, result.error.message)
        toast.error(t('toast.requestError', { message: result.error.message }))
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed'
      response.setError({ message })
      history.addEntry(plainRequest, null, message)
      toast.error(t('toast.requestError', { message }))
    }
  }

  return { send }
}
