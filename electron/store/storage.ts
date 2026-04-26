import { app } from 'electron'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs'

/**
 * 获取用户数据目录路径
 * 不同平台的路径:
 * - Windows: %APPDATA%/requestor/data
 * - macOS: ~/Library/Application Support/requestor/data
 * - Linux: ~/.config/requestor/data
 * @returns 数据存储目录路径
 */
function getStoreDir(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true }) // 递归创建目录
  }
  return dir
}

/**
 * 根据 key 生成 JSON 文件路径
 * @param key 数据键名
 * @returns 完整的文件路径
 */
function getFilePath(key: string): string {
  return join(getStoreDir(), `${key}.json`)
}

function getLegacyFilePath(key: string): string | null {
  if (!key.startsWith('requestor-')) return null
  const legacyUserData = join(dirname(app.getPath('userData')), 'mypostman')
  const legacyKey = key.replace('requestor-', 'mypostman-')
  return join(legacyUserData, 'data', `${legacyKey}.json`)
}

function readJsonFile<T>(filePath: string): T {
  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

/**
 * 从 JSON 文件读取数据
 * @param key 数据键名
 * @param fallback 默认值(文件不存在或解析失败时返回)
 * @returns 解析后的数据或默认值
 * 错误处理策略:静默失败返回 fallback,不抛出异常
 */
export function readData<T>(key: string, fallback: T): T {
  try {
    const filePath = getFilePath(key)
    if (existsSync(filePath)) return readJsonFile<T>(filePath)

    const legacyFilePath = getLegacyFilePath(key)
    if (!legacyFilePath || !existsSync(legacyFilePath)) return fallback

    const legacyData = readJsonFile<T>(legacyFilePath)
    writeData(key, legacyData)
    return legacyData
  } catch {
    return fallback
  }
}


/**
 * 将数据写入 JSON 文件
 * @param key 数据键名
 * @param data 要保存的数据
 * 使用 JSON.stringify 的缩进参数(2空格)格式化输出,便于人工阅读
 * 错误处理:记录日志但不抛出异常,避免影响主流程
 */
export function writeData<T>(key: string, data: T): void {
  try {
    const filePath = getFilePath(key)
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error(`Failed to write ${key}:`, err)
  }
}

/**
 * 获取指定 key 的文件大小(字节)
 * @param key 数据键名
 * @returns 文件大小(字节),文件不存在返回 0
 */
export function getFileSize(key: string): number {
  try {
    const filePath = getFilePath(key)
    if (!existsSync(filePath)) return 0
    const stats = statSync(filePath)
    return stats.size
  } catch {
    return 0
  }
}
