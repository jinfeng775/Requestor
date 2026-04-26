/**
 * 文件系统存储工具
 * 封装 Electron IPC 调用，提供统一的数据加载和保存接口
 * 数据存储在 %APPDATA%/requestor/data/{key}.json
 */

/**
 * 从文件系统加载数据
 * @param key 数据键名（对应文件名）
 * @param fallback 默认值（文件不存在或解析失败时返回）
 * @returns 解析后的数据或默认值
 */
export async function loadData<T>(key: string, fallback: T): Promise<T> {
  if (!window.api) return fallback
  try {
    const result = await window.api.storageLoad(key)
    return result !== null && result !== undefined ? (result as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * 将数据保存到文件系统
 * 异步写入，不阻塞调用方
 * @param key 数据键名（对应文件名）
 * @param data 要保存的数据
 */
export async function saveData(key: string, data: unknown): Promise<void> {
  if (!window.api) return
  try {
    // 通过 JSON 序列化将 Vue 响应式 Proxy 转为纯对象
    // Electron IPC 使用 structuredClone，无法克隆 Proxy 对象
    await window.api.storageSave(key, JSON.parse(JSON.stringify(data)))
  } catch (err) {
    console.error(`[storage] Failed to save "${key}":`, err)
  }
}

/**
 * 从 localStorage 迁移数据到文件系统
 * 仅在文件系统中无数据且 localStorage 中有数据时执行
 * 迁移完成后清除 localStorage 中的旧数据
 * @param key 数据键名
 * @returns 是否执行了迁移
 */
export async function migrateFromLocalStorage(key: string, legacyKey = key): Promise<boolean> {
  if (!window.api) return false
  try {
    // 检查文件系统中是否已有数据
    const existing = await window.api.storageLoad(key)
    if (existing !== null && existing !== undefined) return false

    // 检查 localStorage 中是否有旧数据
    const raw = localStorage.getItem(legacyKey)
    if (!raw) return false

    const parsed = JSON.parse(raw)
    await window.api.storageSave(key, parsed)
    localStorage.removeItem(legacyKey)
    console.log(`[storage] Migrated "${legacyKey}" from localStorage to file system`)
    return true
  } catch {
    return false
  }
}
