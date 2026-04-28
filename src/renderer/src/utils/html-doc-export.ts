/**
 * HTML 接口文档导出工具
 * 将集合数据生成独立的 HTML 接口文档页面
 * 无外部依赖，可直接浏览器打开或分享
 */

import type { Collection, CollectionItem, CollectionFolder, CollectionRequest } from '@/types/collection'

/** HTTP 方法对应的颜色 */
const METHOD_COLORS: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  DELETE: '#f93e3e',
  PATCH: '#50e3c2',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7'
}

/** 转义 HTML 特殊字符 */
function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** 格式化 JSON 字符串(带缩进) */
function formatJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

/** 生成方法徽章 HTML */
function methodBadge(method: string): string {
  const color = METHOD_COLORS[method] || '#888'
  return `<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:700;font-family:monospace;color:#fff;background:${color};margin-right:8px;">${method}</span>`
}

/** 生成状态码徽章 HTML */
function statusBadge(status: number): string {
  let color = '#888'
  if (status >= 200 && status < 300) color = '#49cc90'
  else if (status >= 300 && status < 400) color = '#fca130'
  else if (status >= 400 && status < 500) color = '#f93e3e'
  else if (status >= 500) color = '#f93e3e'
  return `<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:700;font-family:monospace;color:#fff;background:${color};">${status}</span>`
}

/** 生成键值对表格 HTML */
function keyValueTable(title: string, items: Array<{ key: string; value: string; description?: string; enabled?: boolean }>, lang: 'zh-CN' | 'en-US'): string {
  const filtered = items.filter((item) => item.enabled !== false && item.key)
  if (filtered.length === 0) return ''

  const keyLabel = lang === 'zh-CN' ? '键' : 'Key'
  const valueLabel = lang === 'zh-CN' ? '值' : 'Value'
  const descLabel = lang === 'zh-CN' ? '描述' : 'Description'

  const rows = filtered
    .map(
      (item) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;color:#333;">${escapeHtml(item.key)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;color:#666;word-break:break-all;">${escapeHtml(item.value)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:12px;color:#999;">${escapeHtml(item.description || '')}</td>
    </tr>`
    )
    .join('')

  return `
  <div style="margin:12px 0;">
    <div style="font-size:13px;font-weight:600;color:#555;margin-bottom:6px;">${title}</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:4px;overflow:hidden;">
      <thead>
        <tr style="background:#f8f9fa;">
          <th style="padding:6px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">${keyLabel}</th>
          <th style="padding:6px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">${valueLabel}</th>
          <th style="padding:6px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">${descLabel}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

/** 生成响应头表格 HTML (可折叠) */
function responseHeadersTable(headers: Record<string, string>, lang: 'zh-CN' | 'en-US'): string {
  const entries = Object.entries(headers)
  if (entries.length === 0) return ''

  const title = lang === 'zh-CN' ? '响应头' : 'Response Headers'
  const headerLabel = lang === 'zh-CN' ? '名称' : 'Header'
  const valueLabel = lang === 'zh-CN' ? '值' : 'Value'

  const rows = entries
    .map(
      ([key, value]) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;color:#333;">${escapeHtml(key)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;color:#666;word-break:break-all;">${escapeHtml(value)}</td>
    </tr>`
    )
    .join('')

  const detailsId = `headers-${Math.random().toString(36).substr(2, 9)}`

  return `
  <details style="margin:8px 0;border:1px solid #eee;border-radius:4px;overflow:hidden;">
    <summary style="padding:8px 12px;background:#f8f9fa;cursor:pointer;font-size:12px;font-weight:600;color:#555;user-select:none;list-style:none;display:flex;align-items:center;gap:6px;" onclick="this.querySelector('.toggle-icon').textContent = this.parentElement.open ? '▶' : '▼'">
      <span class="toggle-icon" style="font-size:10px;color:#888;">▶</span>
      ${title}
    </summary>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#fafafa;">
          <th style="padding:6px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;border-bottom:1px solid #eee;">${headerLabel}</th>
          <th style="padding:6px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;border-bottom:1px solid #eee;">${valueLabel}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </details>`
}

/** 生成单个请求的 HTML */
function renderRequest(item: CollectionRequest, anchorId: string, lang: 'zh-CN' | 'en-US'): string {
  const config = item.request
  const url = config.url || '(no URL)'
  const description = config.description ? `<p style="margin:4px 0 12px;color:#555;font-size:14px;line-height:1.6;">${escapeHtml(config.description)}</p>` : ''

  // 请求头表格
  const headersTitle = lang === 'zh-CN' ? '请求头' : 'Request Headers'
  const headersHtml = keyValueTable(headersTitle, config.headers, lang)

  // 请求参数表格
  const paramsTitle = lang === 'zh-CN' ? '查询参数' : 'Query Parameters'
  const paramsHtml = keyValueTable(paramsTitle, config.params, lang)

  // 请求体
  let bodyHtml = ''
  if (config.bodyType === 'raw' && config.rawBody) {
    const lang_code = config.rawBodyFormat.toUpperCase()
    const bodyTitle = lang === 'zh-CN' ? `请求体 (${lang_code})` : `Request Body (${lang_code})`
    const copyLabel = lang === 'zh-CN' ? '复制' : 'Copy'
    const copiedLabel = lang === 'zh-CN' ? '已复制' : 'Copied'
    const bodyId = `body-${Math.random().toString(36).substr(2, 9)}`
    const formattedBody = config.rawBodyFormat === 'json' ? formatJson(config.rawBody) : config.rawBody

    bodyHtml = `
    <div style="margin:12px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="font-size:13px;font-weight:600;color:#555;">${bodyTitle}</div>
        <button onclick="copyToClipboard('${bodyId}', this)" style="padding:4px 12px;font-size:12px;color:#555;background:#f8f9fa;border:1px solid #ddd;border-radius:4px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'" data-copy-label="${copyLabel}" data-copied-label="${copiedLabel}">${copyLabel}</button>
      </div>
      <pre id="${bodyId}" style="background:#f8f9fa;border:1px solid #eee;border-radius:4px;padding:12px;font-size:13px;font-family:monospace;overflow-x:auto;margin:0;white-space:pre-wrap;word-break:break-all;"><code>${escapeHtml(formattedBody)}</code></pre>
    </div>`
  } else if (config.bodyType === 'x-www-form-urlencoded' && config.urlEncodedData.length > 0) {
    const formTitle = lang === 'zh-CN' ? '表单数据 (URL 编码)' : 'Form Data (URL Encoded)'
    bodyHtml = keyValueTable(formTitle, config.urlEncodedData, lang)
  } else if (config.bodyType === 'form-data' && config.formData.length > 0) {
    const formTitle = lang === 'zh-CN' ? '表单数据 (Multipart)' : 'Form Data (Multipart)'
    bodyHtml = keyValueTable(formTitle, config.formData, lang)
  }

  // 认证信息
  let authHtml = ''
  const authLabel = lang === 'zh-CN' ? '认证' : 'Auth'
  if (config.authType === 'bearer') {
    const bearerLabel = lang === 'zh-CN' ? 'Bearer Token' : 'Bearer Token'
    authHtml = `
    <div style="margin:8px 0;">
      <span style="font-size:12px;font-weight:600;color:#555;">${authLabel}:</span>
      <span style="font-size:12px;color:#666;margin-left:4px;">${bearerLabel}</span>
    </div>`
  } else if (config.authType === 'basic') {
    const basicLabel = lang === 'zh-CN' ? '基础认证' : 'Basic Auth'
    authHtml = `
    <div style="margin:8px 0;">
      <span style="font-size:12px;font-weight:600;color:#555;">${authLabel}:</span>
      <span style="font-size:12px;color:#666;margin-left:4px;">${basicLabel}</span>
    </div>`
  } else if (config.authType === 'apikey') {
    const apikeyLabel = lang === 'zh-CN' ? 'API Key' : 'API Key'
    authHtml = `
    <div style="margin:8px 0;">
      <span style="font-size:12px;font-weight:600;color:#555;">${authLabel}:</span>
      <span style="font-size:12px;color:#666;margin-left:4px;">${apikeyLabel}</span>
    </div>`
  }

  // 响应示例
  let responsesHtml = ''
  if (item.responseExamples && item.responseExamples.length > 0) {
    const examplesTitle = lang === 'zh-CN' ? '响应示例' : 'Response Examples'
    const responseBodyLabel = lang === 'zh-CN' ? '响应体' : 'Response Body'
    const copyLabel = lang === 'zh-CN' ? '复制' : 'Copy'
    const copiedLabel = lang === 'zh-CN' ? '已复制' : 'Copied'

    // 去重：按状态码去重，每个状态码只保留最新的一条（数组已按时间倒序）
    const uniqueExamples = Array.from(
      new Map(
        item.responseExamples.map(ex => [
          ex.status, // 使用状态码作为唯一键
          ex
        ])
      ).values()
    )

    const examples = uniqueExamples
      .map((example) => {
        const isJson = example.contentType.includes('json')
        const formattedBody = isJson ? formatJson(example.body) : example.body
        const headersTable = responseHeadersTable(example.headers, lang)
        const bodyId = `response-${Math.random().toString(36).substr(2, 9)}`

        return `
      <div style="margin:12px 0;border:1px solid #eee;border-radius:6px;overflow:hidden;">
        <div style="padding:8px 12px;background:#f8f9fa;display:flex;align-items:center;gap:8px;">
          ${statusBadge(example.status)}
          <span style="font-size:13px;font-weight:600;color:#333;">${escapeHtml(example.name)}</span>
          <span style="font-size:12px;color:#999;margin-left:auto;">${example.totalTime}ms · ${example.bodySize}B</span>
        </div>
        ${headersTable}
        <div style="padding:8px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:12px;font-weight:600;color:#555;">${responseBodyLabel}</div>
            <button onclick="copyToClipboard('${bodyId}', this)" style="padding:4px 12px;font-size:12px;color:#555;background:#f8f9fa;border:1px solid #ddd;border-radius:4px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'" data-copy-label="${copyLabel}" data-copied-label="${copiedLabel}">${copyLabel}</button>
          </div>
          <pre id="${bodyId}" style="background:#f8f9fa;border:1px solid #eee;border-radius:4px;padding:12px;font-size:13px;font-family:monospace;overflow-x:auto;margin:0;max-height:400px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;"><code>${escapeHtml(formattedBody)}</code></pre>
        </div>
      </div>`
      })
      .join('')

    responsesHtml = `
    <div style="margin:16px 0 8px;">
      <div style="font-size:14px;font-weight:700;color:#333;border-bottom:1px solid #eee;padding-bottom:6px;">${examplesTitle}</div>
      ${examples}
    </div>`
  }

  return `
  <div id="${anchorId}" style="margin:24px 0;padding:20px 24px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      ${methodBadge(config.method)}
      <code style="font-size:14px;color:#333;word-break:break-all;">${escapeHtml(url)}</code>
    </div>
    ${description}
    ${authHtml}
    ${paramsHtml}
    ${headersHtml}
    ${bodyHtml}
    ${responsesHtml}
  </div>`
}

/** 递归渲染文件夹及其子项 */
function renderFolder(folder: CollectionFolder, path: string, lang: 'zh-CN' | 'en-US'): string {
  const items = folder.items.map((item, i) => renderItem(item, `${path}-${i}`, lang)).join('')
  return `
  <div style="margin:16px 0;">
    <h3 style="font-size:16px;font-weight:700;color:#333;margin:0 0 8px;padding-left:12px;border-left:3px solid #49cc90;">
      📁 ${escapeHtml(folder.name)}
    </h3>
    <div style="padding-left:16px;">
      ${items}
    </div>
  </div>`
}

/** 渲染单个集合项(文件夹或请求) */
function renderItem(item: CollectionItem, anchorId: string, lang: 'zh-CN' | 'en-US'): string {
  if (item.type === 'folder') return renderFolder(item, anchorId, lang)
  return renderRequest(item, anchorId, lang)
}

/** 生成侧边导航栏 */
function renderNav(items: CollectionItem[], path: string): string {
  return items
    .map((item, i) => {
      const id = `${path}-${i}`
      if (item.type === 'folder') {
        const children = renderNav(item.items, id)
        return `
      <div style="margin:4px 0;">
        <div style="font-size:13px;font-weight:600;color:#333;padding:4px 0;">📁 ${escapeHtml(item.name)}</div>
        <div style="padding-left:12px;">${children}</div>
      </div>`
      }
      const color = METHOD_COLORS[item.request.method] || '#888'
      return `
      <a href="#${id}" style="display:flex;align-items:center;gap:6px;padding:3px 0;text-decoration:none;font-size:12px;color:#555;transition:color 0.15s;" onmouseover="this.style.color='${color}'" onmouseout="this.style.color='#555'">
        <span style="display:inline-block;width:42px;font-family:monospace;font-weight:700;font-size:11px;color:${color};flex-shrink:0;">${item.request.method}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.name)}</span>
      </a>`
    })
    .join('')
}

// ─── 主导出函数 ────────────────────────────────────────────────

/**
 * 将集合生成独立的 HTML 接口文档
 * @param collection 内部集合对象
 * @param locale 语言设置 ('zh-CN' | 'en-US')
 * @returns 完整的 HTML 字符串
 */
export function collectionToHtmlDoc(collection: Collection, locale: 'zh-CN' | 'en-US' = 'zh-CN'): string {
  const nav = renderNav(collection.items, 'item')
  const content = collection.items.map((item, i) => renderItem(item, `item-${i}`, locale)).join('')
  const description = collection.description
    ? `<p style="margin:8px 0 0;color:#666;font-size:14px;line-height:1.6;">${escapeHtml(collection.description)}</p>`
    : ''
  const timestamp = new Date().toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US')

  const title = locale === 'zh-CN' ? 'API 接口文档' : 'API Documentation'
  const generatedBy = locale === 'zh-CN' ? '由 Requestor 生成' : 'Generated by Requestor'
  const generatedAt = locale === 'zh-CN' ? '生成时间' : 'Generated at'

  return `<!DOCTYPE html>
<html lang="${locale === 'zh-CN' ? 'zh-CN' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(collection.name)} - ${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; color: #333; line-height: 1.5; }
    .layout { display: flex; min-height: 100vh; }
    .sidebar { width: 280px; background: #fff; border-right: 1px solid #e8e8e8; padding: 20px; position: fixed; top: 0; left: 0; bottom: 0; overflow-y: auto; }
    .sidebar h2 { font-size: 16px; color: #333; margin-bottom: 4px; }
    .sidebar .meta { font-size: 11px; color: #999; margin-bottom: 16px; }
    .sidebar nav { font-size: 13px; }
    .main { margin-left: 280px; flex: 1; padding: 32px 40px; max-width: 960px; }
    .main h1 { font-size: 28px; font-weight: 800; color: #1a1a1a; margin-bottom: 4px; }
    .main .timestamp { font-size: 12px; color: #999; margin-bottom: 24px; }
    code, pre { font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace; }
    a { color: inherit; }
    details summary::-webkit-details-marker { display: none; }
    details summary::marker { display: none; }
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .main { margin-left: 0; padding: 20px; }
    }
    @media print {
      .sidebar { display: none; }
      .main { margin-left: 0; }
    }
  </style>
  <script>
    function copyToClipboard(elementId, button) {
      const element = document.getElementById(elementId);
      const text = element.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        const copiedLabel = button.getAttribute('data-copied-label');
        button.textContent = copiedLabel;
        button.style.color = '#49cc90';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.color = '#555';
        }, 2000);
      });
    }
  </script>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <h2>${escapeHtml(collection.name)}</h2>
      <div class="meta">${generatedBy}</div>
      <nav>${nav}</nav>
    </aside>
    <main class="main">
      <h1>${escapeHtml(collection.name)}</h1>
      <div class="timestamp">${generatedAt} ${timestamp}</div>
      ${description}
      ${content}
    </main>
  </div>
</body>
</html>`
}
