import type { HttpRequestConfig } from '@/types/request'
import { DEFAULT_REQUEST } from '@/types/request'
import { nanoid } from './uuid'

/**
 * 将 HTTP 请求配置转换为 cURL 命令字符串
 * @param config HTTP 请求配置对象
 * @returns cURL 命令字符串
 */
export function toCurl(config: HttpRequestConfig): string {
  let cmd = `curl -X ${config.method}`

  // 构建 URL 和查询参数
  if (config.url) {
    let url = config.url
    const enabledParams = config.params.filter((p) => p.enabled && p.key)
    if (enabledParams.length > 0) {
      const qs = enabledParams.map((p) => `${p.key}=${p.value}`).join('&')
      url += (url.includes('?') ? '&' : '?') + qs
    }
    cmd += ` '${url}'`
  }

  // 添加请求头
  for (const h of config.headers.filter((h) => h.enabled && h.key)) {
    cmd += ` \\n  -H '${h.key}: ${h.value}'`
  }

  // 添加认证信息(Bearer Token 或 Basic Auth)
  if (config.authType === 'bearer' && config.auth) {
    const auth = config.auth as { token: string }
    cmd += ` \\n  -H 'Authorization: Bearer ${auth.token}'`
  } else if (config.authType === 'basic' && config.auth) {
    const auth = config.auth as { username: string; password: string }
    cmd += ` \\n  -u '${auth.username}:${auth.password}'`
  }

  // 添加请求体(raw 或 x-www-form-urlencoded)
  if (config.bodyType === 'raw' && config.rawBody) {
    cmd += ` \\n  -d '${config.rawBody.replace(/'/g, "\\'")}'`
  } else if (config.bodyType === 'x-www-form-urlencoded') {
    const data = config.urlEncodedData.filter((d) => d.enabled && d.key)
    const body = data.map((d) => `${d.key}=${d.value}`).join('&')
    cmd += ` \\n  -d '${body}'`
  }

  return cmd
}

// ─── 预处理辅助函数 ──────────────────────────────────────────

/**
 * 规范化 Windows CMD 风格的 cURL 命令
 * 处理 Windows CMD 特有的转义字符(^)和命令分隔符(&)
 * 注意:转义字符的处理顺序非常重要,必须先处理最具体的模式
 * @param input 原始 cURL 命令字符串
 * @returns 规范化后的字符串
 */
function normalizeWindowsCmd(input: string): string {
  let s = input

  // 移除尾部的 & (命令链分隔符),只解析第一个 curl 命令
  s = s.replace(/\s*&\s*$/g, '')

  // 移除尾部分号
  s = s.replace(/;\s*$/g, '')

  // 反转义 Windows CMD 的 ^ 转义 — 顺序很重要!
  // 1. 最具体的优先:^\^" (4字符: ^ backslash ^ ") 表示转义引号 → \"
  s = s.replace(/\^\x5c\^"/g, '\\"')
  // 2. ^^ 表示字面量 caret
  s = s.replace(/\^\^/g, '^')
  // 3. ^" 表示字面量引号(字符串分隔符)
  s = s.replace(/\^"/g, '"')
  // 4. 其他特殊字符
  s = s.replace(/\^&/g, '&')
  s = s.replace(/\^%/g, '%')
  s = s.replace(/\^</g, '<')
  s = s.replace(/\^>/g, '>')
  s = s.replace(/\^\|/g, '|')
  s = s.replace(/\^ /g, ' ')

  // 移除行 continuation: 行尾的 ^
  s = s.replace(/\^\s*\n/g, '\n')
  s = s.replace(/\^\s*$/gm, '')

  return s
}

/**
 * 合并多行 cURL 命令为单行
 * 处理 Unix 反斜杠续行符(\)和 Windows ^ 续行符
 * @param input 多行 cURL 命令字符串
 * @returns 合并后的单行字符串
 */
function joinMultiline(input: string): string {
  // Unix 行 continuation: 反斜杠后跟换行符
  let s = input.replace(/\\\n/g, ' ')
  // Windows 行 continuation: 行尾的 ^(上面已大部分处理)
  s = s.replace(/\^\s*$/gm, '')
  return s
}

// ─── Shell 感知的分词器 ────────────────────────────────────────

/**
 * Shell 感知的分词器,正确处理引号内的空格和转义字符
 * 支持单引号、双引号的嵌套和转义
 * @param input cURL 命令字符串
 * @returns 分词后的数组
 */
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inSingle = false // 是否在单引号内
  let inDouble = false // 是否在双引号内
  let escaped = false // 是否遇到转义字符
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    if (escaped) {
      // 在双引号内,反斜杠只转义 " 和 \
      if (inDouble) {
        if (ch === '"' || ch === '\\') {
          current += ch
        } else {
          current += '\\' + ch
        }
      } else {
        current += ch
      }
      escaped = false
      i++
      continue
    }

    if (ch === '\\' && !inSingle) {
      escaped = true
      i++
      continue
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
      i++
      continue
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      i++
      continue
    }

    // 未加引号的空白字符 = 分词边界
    if ((ch === ' ' || ch === '\t' || ch === '\n') && !inSingle && !inDouble) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
      i++
      continue
    }

    current += ch
    i++
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

// ─── 主解析器 ──────────────────────────────────────────────────────

/**
 * 解析 cURL 命令字符串为 HttpRequestConfig 对象
 * 支持多种 cURL 参数:-X(方法), -H(头), -d(数据), -u(用户认证), -F(表单)等
 * 处理多命令链式调用时取最后一个 curl 命令(Chrome 复制的 cURL 常包含跟踪像素)
 * @param input cURL 命令字符串
 * @returns 解析后的请求配置,失败返回 null
 */
export function fromCurl(input: string): HttpRequestConfig | null {
  if (!input || !input.trim()) return null

  let normalized = input.trim()

  // 检测 Windows CMD 风格(^ 转义或 ^" 引号)— 必须最先执行
  // 因为 & 命令分隔符在原始 Windows 输入中仍是 ^&
  if (normalized.includes('^"') || /\^[&<>%|\\]/.test(normalized)) {
    normalized = normalizeWindowsCmd(normalized)
  }

  // 合并多行
  normalized = joinMultiline(normalized)

  // 如果多个 curl 命令通过 & 或 ; 链式调用,取最后一个
  // (Chrome "Copy as cURL" 通常先包含跟踪像素,实际 API 在最后)
  const segments = normalized.split(/\s*[&;]\s*(?=curl\b)/)
  if (segments.length > 1) {
    normalized = segments[segments.length - 1].trim()
  } else {
    normalized = normalized
      .replace(/\s*&\s*$/g, '')
      .replace(/;\s*$/g, '')
      .trim()
  }

  // 必须以 curl 开头
  if (!/^curl\b/i.test(normalized)) return null

  // 分词
  const tokens = tokenize(normalized)
  if (tokens.length < 2) return null

  const config: HttpRequestConfig = { ...DEFAULT_REQUEST, id: nanoid() }

  let i = 1 // 跳过 'curl'
  while (i < tokens.length) {
    const token = tokens[i]

    // 解析 HTTP 方法
    if (token === '-X' || token === '--request') {
      i++
      if (i < tokens.length) {
        config.method = tokens[i].toUpperCase() as HttpRequestConfig['method']
      }
    } else if (token === '-H' || token === '--header') {
      // 解析请求头
      i++
      if (i < tokens.length) {
        const headerStr = tokens[i]
        const colonIdx = headerStr.indexOf(':')
        if (colonIdx > 0) {
          const key = headerStr.substring(0, colonIdx).trim()
          const value = headerStr.substring(colonIdx + 1).trim()
          // 检测 Authorization 头中的 Bearer Token
          if (key.toLowerCase() === 'authorization' && value.startsWith('Bearer ')) {
            config.authType = 'bearer'
            config.auth = { token: value.substring(7) }
          } else {
            config.headers = [...config.headers, { key, value, enabled: true }]
          }
        }
      }
    } else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary'
    ) {
      // 解析请求体数据
      i++
      if (i < tokens.length) {
        config.bodyType = 'raw'
        config.rawBody = tokens[i]
        // 尝试检测是否为 form-urlencoded 格式
        if (/^[\w%]+=[\w%]*(&[\w%]+=[\w%]*)*$/.test(tokens[i])) {
          config.bodyType = 'x-www-form-urlencoded'
          config.urlEncodedData = tokens[i].split('&').map((pair) => {
            const eqIdx = pair.indexOf('=')
            if (eqIdx > 0) {
              return {
                key: decodeURIComponent(pair.substring(0, eqIdx)),
                value: decodeURIComponent(pair.substring(eqIdx + 1)),
                enabled: true
              }
            }
            return { key: pair, value: '', enabled: true }
          })
          config.rawBody = ''
        } else {
          config.rawBodyFormat = 'json'
        }
      }
    } else if (token === '-u' || token === '--user') {
      // 解析 Basic Auth 认证
      i++
      if (i < tokens.length) {
        const [username, ...rest] = tokens[i].split(':')
        config.authType = 'basic'
        config.auth = { username, password: rest.join(':') }
      }
    } else if (token === '-F' || token === '--form') {
      // 解析 multipart/form-data 表单数据
      i++
      if (i < tokens.length) {
        config.bodyType = 'form-data'
        const pair = tokens[i]
        const eqIdx = pair.indexOf('=')
        if (eqIdx > 0) {
          const key = pair.substring(0, eqIdx)
          const value = pair.substring(eqIdx + 1)
          if (value.startsWith('@')) {
            // 文件上传(@ 开头表示文件路径)
            config.formData = [
              ...config.formData,
              { key, value: '', type: 'file', filePath: value.substring(1), enabled: true }
            ]
          } else {
            // 文本字段
            config.formData = [...config.formData, { key, value, type: 'text', enabled: true }]
          }
        }
      }
    } else if (token === '-b' || token === '--cookie') {
      i++
      // 暂时跳过 cookie
    } else if (token === '-o' || token === '--output') {
      i++
      // 跳过输出文件
    } else if (token === '-L' || token === '--location') {
      // 跟随重定向 — 无参数
    } else if (token === '-k' || token === '--insecure') {
      // 忽略 SSL 证书验证 — 无参数
    } else if (token === '-s' || token === '--silent') {
      // 静默模式 — 无参数
    } else if (token === '-v' || token === '--verbose') {
      // 详细模式 — 无参数
    } else if (token === '-i' || token === '--include') {
      // 包含响应头 — 无参数
    } else if (token === '-c' || token === '--compressed') {
      // 压缩 — 无参数
    } else if (!token.startsWith('-')) {
      // 可能是 URL
      if (!config.url) {
        let url = token
        // 从 URL 中分离查询字符串
        if (url.includes('?')) {
          const qIdx = url.indexOf('?')
          const qs = url.substring(qIdx + 1)
          url = url.substring(0, qIdx)
          config.params = qs.split('&').map((pair) => {
            const eqIdx = pair.indexOf('=')
            if (eqIdx > 0) {
              return {
                key: decodeURIComponent(pair.substring(0, eqIdx)),
                value: decodeURIComponent(pair.substring(eqIdx + 1)),
                enabled: true
              }
            }
            return { key: decodeURIComponent(pair), value: '', enabled: true }
          })
        }
        config.url = url
      }
    }

    i++
  }

  // 如果未找到 URL,尝试更努力地查找 — 有时 URL 是第一个非标志参数
  if (!config.url) {
    for (let j = 1; j < tokens.length; j++) {
      if (!tokens[j].startsWith('-') && /^https?:\/\//.test(tokens[j])) {
        config.url = tokens[j]
        break
      }
    }
  }

  return config.url ? config : null
}
