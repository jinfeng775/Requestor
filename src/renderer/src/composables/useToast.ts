import { ElMessage } from 'element-plus'

/**
 * 消息提示组合式函数
 * 封装 Element Plus 的 ElMessage,提供统一的提示样式和时长配置
 * @returns 三种类型的消息提示方法: success | error | info
 */
export function useToast() {
  /**
   * 成功提示(绿色,2秒后自动关闭)
   * @param message 提示消息内容
   */
  function success(message: string): void {
    ElMessage({ message, type: 'success', duration: 2000, showClose: true })
  }

  /**
   * 错误提示(红色,3秒后自动关闭)
   * @param message 提示消息内容
   */
  function error(message: string): void {
    ElMessage({ message, type: 'error', duration: 3000, showClose: true })
  }

  /**
   * 信息提示(蓝色,2秒后自动关闭,不显示关闭按钮)
   * @param message 提示消息内容
   */
  function info(message: string): void {
    ElMessage({ message, type: 'info', duration: 2000 })
  }

  return { success, error, info }
}
