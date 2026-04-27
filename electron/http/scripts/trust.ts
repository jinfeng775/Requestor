import { dialog, type BrowserWindow } from 'electron'
import type { HttpRequestConfig } from '../../../src/renderer/src/types/request'

const trustedScriptScopes = new Set<string>()

function hasScriptContent(config: HttpRequestConfig): boolean {
  return Boolean(config.scripts.preRequest.trim() || config.scripts.postRequest.trim())
}

export async function confirmRequestScriptTrust(
  owner: BrowserWindow | null,
  config: HttpRequestConfig,
  scriptHash: string,
  trustScope: string
): Promise<boolean> {
  if (!hasScriptContent(config)) return true
  const trustKey = `${trustScope}:${scriptHash}`
  if (trustedScriptScopes.has(trustKey)) return true

  const options = {
    type: 'warning' as const,
    buttons: ['Cancel', 'Trust and Run'],
    defaultId: 0,
    cancelId: 0,
    title: 'Run request scripts?',
    message: 'This request contains scripts. Only run scripts from sources you trust.',
    detail: 'Scripts can read active environment variables and modify this request before it is sent.'
  }
  const result = owner ? await dialog.showMessageBox(owner, options) : await dialog.showMessageBox(options)
  const trusted = result.response === 1

  if (trusted) trustedScriptScopes.add(trustKey)
  return trusted
}
