import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HttpResponseData, RequestError } from '@/types/request'

/**
 * HTTP 响应状态管理
 * 管理当前请求的响应数据、错误信息和加载状态
 */
export const useResponseStore = defineStore('response', () => {
  /** 响应数据(成功时) */
  const data = ref<HttpResponseData | null>(null)
  /** 错误信息(失败时) */
  const error = ref<RequestError | null>(null)
  /** 是否正在加载中 */
  const loading = ref(false)

  /** 是否有响应数据或错误(用于判断是否显示响应面板) */
  const hasResponse = computed(() => data.value !== null || error.value !== null)
  /** 响应内容是否为 JSON 格式 */
  const isJson = computed(() => {
    if (!data.value) return false
    const ct = data.value.contentType.toLowerCase()
    return ct.includes('json') || ct.includes('application/json')
  })

  /**
   * 设置响应数据(请求成功时调用)
   * @param response HTTP 响应数据对象
   */
  function setData(response: HttpResponseData): void {
    data.value = response
    error.value = null
    loading.value = false
  }

  /**
   * 设置错误信息(请求失败时调用)
   * @param err 请求错误对象
   */
  function setError(err: RequestError): void {
    error.value = err
    data.value = null
    loading.value = false
  }

  /**
   * 设置加载状态(发送请求前调用)
   */
  function setLoading(): void {
    loading.value = true
    error.value = null
  }

  /**
   * 清除所有响应数据和状态
   */
  function clear(): void {
    data.value = null
    error.value = null
    loading.value = false
  }

  return {
    data,
    error,
    loading,
    hasResponse,
    isJson,
    setData,
    setError,
    setLoading,
    clear
  }
})
