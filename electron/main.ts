import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerRequestIpc } from './ipc/request'
import { registerDialogIpc } from './ipc/dialog'
import { registerStorageIpc } from './ipc/storage'

/**
 * 创建主窗口并配置安全选项
 * 关键安全设置:
 * - contextIsolation: true - 隔离上下文,防止渲染进程直接访问 Node.js API
 * - sandbox: false - 禁用沙盒以支持某些功能
 * - nodeIntegration: false - 禁用 Node.js 集成,提高安全性
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    show: false, // 初始不显示,等待 ready-to-show 事件
    autoHideMenuBar: true, // 自动隐藏菜单栏
    icon: join(__dirname, '../../build/icon.ico'), // 设置窗口图标
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'), // 预加载脚本
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 窗口准备就绪后显示,避免白屏闪烁
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 拦截外部链接,在系统浏览器中打开
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 根据环境加载不同的 URL
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // 开发模式:加载 Vite 开发服务器
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // 生产模式:加载打包后的 HTML 文件
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 应用就绪后的初始化流程
app.setName('Requestor')

app.whenReady().then(() => {
  // 设置应用用户模型 ID(Windows)
  electronApp.setAppUserModelId('com.requestor')

  // 监听窗口创建,注册快捷键优化器
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册 IPC 通信通道(必须在创建窗口之前)
  registerRequestIpc() // HTTP 请求相关
  registerDialogIpc() // 文件对话框相关
  registerStorageIpc() // 持久化存储相关

  // 创建主窗口
  createWindow()

  // macOS 特有:点击 Dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时的处理
app.on('window-all-closed', () => {
  // macOS 除外:保持应用运行,直到用户主动退出
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
