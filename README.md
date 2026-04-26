# Requestor - 桌面版 API 测试工具

<img src="src/img/logo.jpg" alt="Requestor Logo" width="200"/>

**语言 / Language**: [中文](README.md) | [English](README_EN.md)

Requestor 是一款基于 Vue 3 + Electron 构建的跨平台桌面 API 测试工具，提供类似 Postman 的直观界面。支持 HTTP 请求发送、API 集合管理、环境变量配置、请求历史记录等功能，所有数据本地存储，保护隐私安全。支持导出 API 接口文档。

## 💡 设计理念

**为什么会有 Requestor？**

- **内网开发利器**: 专为内网环境设计，完全离线使用，无需联网即可进行 API 测试
- **自研服务调试**: 开发者可以轻松测试自己编写的后端服务，快速验证接口功能
- **高度可定制**: 开源代码支持二次开发，强大的扩展能力让您可以根据需求自定义功能
- **隐私安全**: 所有数据存储在本地，不上传云端，确保敏感信息的安全


## 🌟 核心特性

- **完整的 HTTP 客户端**: 支持 GET、POST、PUT、DELETE、PATCH、HEAD、OPTIONS 等 HTTP 方法
- **多标签页管理**: 同时处理多个 API 请求，支持标签页切换、复制和关闭
- **API 集合管理**: 创建和管理 API 集合，支持拖拽排序、请求项重命名和删除
- **环境变量系统**: 支持多环境配置，使用 `{{variable}}` 语法进行动态变量替换
- **智能请求历史**: 自动保存最近 500 条请求记录，支持快速重新发送
- **强大的响应查看器**: 
  - 格式化显示 JSON、XML、HTML 等响应内容
  - JSON 树形视图，支持展开/折叠
  - Monaco Editor 代码高亮编辑器
  - 响应头、Cookies、耗时统计
- **多种认证方式**: Bearer Token、Basic Auth、API Key（Header/Query）
- **灵活的请求体格式**: Raw（JSON/XML/HTML/Text）、x-www-form-urlencoded、form-data（支持文件上传）、Binary
- **cURL 导入导出**: 支持 cURL 命令的导入和导出
- **主题切换**: 浅色/深色主题，支持跟随系统偏好
- **国际化支持**: 中文和英文界面无缝切换
- **键盘快捷键**: Ctrl+Enter 发送请求、Ctrl+N 新建标签、Ctrl+B 切换侧边栏等
- **离线数据存储**: 所有数据存储在本地文件系统（%APPDATA%/requestor/data），首次启动自动迁移 localStorage 数据
- **回收站功能**: 删除的集合和请求可恢复，30天后自动清理
- **全局搜索**: 快速搜索历史记录和集合中的请求
- **响应示例管理**: 保存和管理不同状态码的响应示例
- **Postman 兼容**: 支持导出为 Postman JSON 格式

## 🚀 快速开始

### 系统要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
# 构建 Windows 安装包 (NSIS)
npm run build:win

# 构建 macOS 版本
npm run build:mac

# 构建 Linux 版本
npm run build:linux

# 构建便携版 (Windows) - 无需安装，解压即用
npm run build:portable

# 仅编译不打包
npm run build
```

### 其他命令

```bash
# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 📁 项目结构

```
requestor/
├── electron/                     # Electron 主进程代码
│   ├── http/
│   │   └── engine.ts            # HTTP 请求引擎（支持变量插值、多种认证、multipart/form-data）
│   ├── ipc/
│   │   ├── request.ts           # 请求相关 IPC 通道
│   │   ├── dialog.ts            # 文件对话框 IPC
│   │   └── storage.ts           # 文件系统存储 IPC
│   ├── store/
│   │   └── storage.ts           # 本地 JSON 文件存储实现
│   ├── types/
│   │   └── electron.d.ts        # Electron 类型声明
│   ├── main.ts                  # 主进程入口（窗口创建、IPC 注册）
│   └── preload.ts               # 预加载脚本（暴露安全 API 到渲染进程）
├── src/renderer/                 # 渲染进程代码 (Vue 3)
│   ├── components/
│   │   ├── common/              # 通用组件
│   │   │   ├── GlobalSearch.vue       # 全局搜索
│   │   │   ├── KeyValueEditor.vue     # 键值对编辑器（支持批量编辑）
│   │   │   ├── ResizeHandle.vue       # 可拖拽调整大小手柄
│   │   │   └── SaveToCollectionDialog.vue  # 保存到集合对话框
│   │   ├── environment/
│   │   │   └── EnvironmentEditor.vue  # 环境变量编辑器
│   │   ├── layout/
│   │   │   ├── AppLayout.vue          # 应用主布局
│   │   │   ├── TitleBar.vue           # 自定义标题栏
│   │   │   ├── TabBar.vue             # 标签页栏
│   │   │   └── StatusBar.vue          # 状态栏
│   │   ├── request/             # 请求构建组件
│   │   │   ├── UrlInput.vue           # URL 输入框（支持 cURL 导入导出）
│   │   │   ├── MethodSelector.vue     # HTTP 方法选择器
│   │   │   ├── RequestBuilder.vue     # 请求构建器主组件
│   │   │   ├── ParamsEditor.vue       # 查询参数编辑器
│   │   │   ├── HeadersEditor.vue      # 请求头编辑器
│   │   │   ├── BodyEditor.vue         # 请求体编辑器
│   │   │   ├── BodyFormEditor.vue     # form-data 编辑器
│   │   │   ├── BodyBinaryPicker.vue   # 二进制文件选择器
│   │   │   └── AuthEditor.vue         # 认证编辑器
│   │   ├── response/            # 响应展示组件
│   │   │   ├── ResponseViewer.vue     # 响应查看器主组件
│   │   │   ├── ResponseBody.vue       # 响应体展示
│   │   │   ├── ResponseHeaders.vue    # 响应头展示
│   │   │   ├── ResponseCookies.vue    # Cookies 展示
│   │   │   ├── ResponseMeta.vue       # 响应元数据（状态码、耗时等）
│   │   │   ├── JsonTreeView.vue       # JSON 树形视图
│   │   │   └── MonacoEditor.vue       # Monaco 代码编辑器
│   │   ├── sidebar/             # 侧边栏组件
│   │   │   ├── Sidebar.vue            # 侧边栏主组件
│   │   │   ├── CollectionTree.vue     # 集合树（支持拖拽排序）
│   │   │   ├── HistoryList.vue        # 历史记录列表
│   │   │   └── TrashList.vue          # 回收站列表
│   │   └── settings/
│   │       └── SettingsModal.vue      # 设置对话框
│   ├── composables/             # Vue 组合式函数
│   │   ├── useRequest.ts        # 请求发送逻辑
│   │   ├── useShortcuts.ts      # 键盘快捷键管理
│   │   ├── useTheme.ts          # 主题切换
│   │   └── useLanguage.ts       # 语言切换
│   ├── stores/                  # Pinia 状态管理
│   │   ├── app-settings.ts      # 应用设置（主题、语言、UI 配置）
│   │   ├── tab.ts               # 标签页管理
│   │   ├── collection.ts        # API 集合管理
│   │   ├── environment.ts       # 环境变量管理
│   │   ├── history.ts           # 请求历史（最多 500 条）
│   │   ├── request-editor.ts    # 当前编辑的请求
│   │   ├── response.ts          # 响应数据管理
│   │   ├── sidebar.ts           # 侧边栏状态
│   │   ├── trash.ts             # 回收站管理
│   │   └── item-trash.ts        # 单项回收站
│   ├── i18n/                    # 国际化
│   │   ├── index.ts             # i18n 配置
│   │   └── locales/
│   │       ├── zh-CN.json       # 中文翻译
│   │       └── en-US.json       # 英文翻译
│   ├── types/                   # TypeScript 类型定义
│   │   ├── request.ts           # 请求/响应类型
│   │   ├── collection.ts        # 集合类型
│   │   ├── environment.ts       # 环境变量类型
│   │   ├── history.ts           # 历史类型
│   │   └── ipc.ts               # IPC 通道常量
│   ├── utils/                   # 工具函数
│   │   ├── storage.ts           # 文件系统存储封装
│   │   ├── uuid.ts              # ID 生成
│   │   └── curl.ts              # cURL 解析和生成
│   ├── styles/                  # 样式文件
│   │   ├── variables.css        # CSS 变量（主题颜色）
│   │   ├── base.css             # 基础样式
│   │   └── ... 
│   ├── App.vue                  # 根组件
│   └── main.ts                  # 渲染进程入口
├── build/                       # 构建资源（图标等）
├── dist/                        # 分发目录（打包后的应用）
├── out/                         # 编译输出
├── package.json                 # 项目配置
├── electron.vite.config.ts      # Vite + Electron 配置
├── electron-builder.yml         # Electron Builder 配置
└── tsconfig.node.json           # TypeScript 配置
```

## 🛠️ 技术栈

### 核心技术
- **Electron 33** - 跨平台桌面应用框架
- **Vue 3.5** - 渐进式 JavaScript 框架（Composition API）
- **TypeScript 5.6** - 类型安全的 JavaScript 超集
- **Pinia 2.3** - Vue 3 官方状态管理库
- **Vite 6** - 现代前端构建工具
- **electron-vite 3** - Electron + Vite 集成方案

### UI 框架
- **Element Plus 2.9** - Vue 3 组件库
- **Monaco Editor 0.55** - 代码编辑器（VS Code 同款）
- **vuedraggable 4.1** - 拖拽排序库

### 构建工具
- **electron-builder 25** - Electron 应用打包工具
- **ESLint 8** - 代码检查工具
- **Prettier 3** - 代码格式化工具

## 💡 主要功能模块

### 1. 请求构建器
- **URL 输入**: 支持手动输入和 cURL 导入
- **HTTP 方法**: GET、POST、PUT、DELETE、PATCH、HEAD、OPTIONS
- **查询参数**: 键值对编辑器，支持启用/禁用、批量编辑
- **请求头**: 自定义请求头，支持常用头快速添加
- **请求体**:
  - **Raw**: JSON、XML、HTML、Text（Monaco Editor 高亮）
  - **x-www-form-urlencoded**: 表单编码数据
  - **form-data**: 支持文本字段和文件上传
  - **Binary**: 二进制文件作为请求体
- **认证**:
  - **Bearer Token**: JWT 等 Token 认证
  - **Basic Auth**: 用户名密码 Base64 编码
  - **API Key**: 可添加到 Header 或 Query 参数

### 2. 响应查看器
- **响应体**: 
  - JSON 格式化显示（树形视图，可展开/折叠）
  - Monaco Editor 代码高亮
  - 原始文本显示
  - HTML 预览
- **响应头**: 键值对展示
- **Cookies**: Cookie 名称、值、域名、路径
- **元数据**: 状态码、状态文本、耗时、响应大小
- **搜索**: 在响应内容中搜索关键词

### 3. 集合管理
- **创建集合**: 组织相关的 API 请求
- **拖拽排序**: 使用 vuedraggable 实现拖拽排序
- **请求管理**: 添加、删除、重命名请求项
- **响应示例**: 保存不同状态码的响应示例
- **导出**: 导出为 Postman JSON 格式

### 4. 环境变量
- **多环境**: 创建多个环境（开发、测试、生产等）
- **变量管理**: 键值对形式的变量，支持初始值和当前值
- **变量插值**: 在 URL、请求头、请求体中使用 `{{variable}}` 语法
- **环境切换**: 快速切换活动环境

### 5. 请求历史
- **自动保存**: 每次请求自动保存，最多 500 条
- **快速重发**: 点击历史记录快速重新发送请求
- **保存到集合**: 将历史请求保存到集合
- **批量操作**: 多选保存、删除

### 6. 回收站
- **软删除**: 删除的集合和请求进入回收站
- **恢复功能**: 从回收站恢复删除的项目
- **永久删除**: 彻底删除回收站中的项目
- **自动清理**: 30 天后自动清除回收站内容

### 7. 全局搜索
- **快速搜索**: Ctrl+K 打开全局搜索
- **搜索范围**: 历史记录和集合中的请求
- **实时过滤**: 输入即搜索

### 8. 键盘快捷键
- **Ctrl+Enter**: 发送请求
- **Ctrl+N**: 新建标签页
- **Ctrl+B**: 切换侧边栏
- **Ctrl+L**: 聚焦 URL 输入框
- **Ctrl+W**: 关闭当前标签页
- **Ctrl+S**: 保存到集合
- **Ctrl+K**: 全局搜索

## 🔧 开发指南

### 代码规范
- ESLint + Prettier 代码格式化
- TypeScript 严格模式
- Vue 3 Composition API
- 组件命名：PascalCase
- 文件命名：kebab-case

### 状态管理
使用 Pinia stores 管理全局状态：
- `app-settings`: 应用配置（主题、语言、侧边栏宽度等）
- `tab`: 标签页管理（创建、关闭、切换）
- `collection`: API 集合（CRUD 操作）
- `environment`: 环境变量（多环境管理）
- `history`: 请求历史（自动保存、查询）
- `request-editor`: 当前编辑的请求
- `response`: 响应数据（成功/失败状态）
- `sidebar`: 侧边栏状态（显示/隐藏）
- `trash`: 回收站管理

### IPC 通信
通过 `preload.ts` 暴露安全的 API 给渲染进程：
```typescript
// 发送 HTTP 请求
window.api.sendRequest(config, envVars)

// 文件操作
window.api.openFile()
window.api.saveFile(defaultName)
window.api.readFile(filePath)
window.api.writeFile(filePath, content)

// 持久化存储
window.api.storageLoad(key)
window.api.storageSave(key, data)
window.api.storageSize(key)
```

### 数据存储
- **存储位置**: `%APPDATA%/requestor/data/{key}.json`
- **存储格式**: JSON 文件（2 空格缩进）
- **存储键**:
  - `requestor-settings`: 应用设置
  - `requestor-collections`: API 集合
  - `requestor-environments`: 环境变量
  - `requestor-history`: 请求历史
  - `requestor-trash`: 回收站
  - `requestor-item-trash`: 单项回收站
- **迁移机制**: 首次启动时自动从 localStorage 迁移到文件系统

## 🌐 国际化

支持的语言：
- 简体中文 (zh-CN)
- 英语 (en-US)

翻译文件位于 `src/renderer/src/i18n/locales/`：
- `zh-CN.json`: 中文翻译
- `en-US.json`: 英文翻译

使用 vue-i18n 实现国际化：
```vue
<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <button>{{ t('common.send') }}</button>
</template>
```

## 🎨 主题系统

支持浅色和深色主题：
- **手动切换**: 设置面板中选择浅色/深色/跟随系统
- **自动跟随**: 监听系统主题变化
- **CSS 变量**: 使用 CSS 变量实现主题样式
- **存储位置**: 主题设置保存在 `requestor-settings.json`

主题变量示例：
```css
:root[data-theme='light'] {
  --color-bg-primary: #ffffff;
  --color-text-primary: #333333;
}

:root[data-theme='dark'] {
  --color-bg-primary: #1e1e1e;
  --color-text-primary: #cccccc;
}
```

## 📦 打包发布

### Windows
```bash
# NSIS 安装包（推荐）
npm run build:win
# 输出: dist/requestor-1.0.0-setup.exe

# 便携版（绿色版）
npm run build:portable
# 输出: dist/requestor-1.0.0-portable.exe

# 解压缩版
npm run build:unpack
# 输出: dist/win-unpacked/
```

### macOS
```bash
npm run build:mac
# 输出: dist/requestor-1.0.0.dmg
```

### Linux
```bash
npm run build:linux
# 输出: dist/requestor-1.0.0.AppImage
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 提交规范
遵循 Conventional Commits 规范：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

示例：
```bash
git commit -m "feat: add cURL import support"
git commit -m "fix: resolve response parsing error"
git commit -m "docs: update README with new features"
```

## 📄 许可证

MIT License

## 👥 作者

Requestor Team

---

**注意**: 这是一个开源项目，旨在为开发者提供一个轻量级、高效的 API 测试工具。如果您有任何建议或问题，请随时联系我们！

---

## 🌍 多语言支持 / Multi-language Support

- [English Version](README_EN.md) - 英文版本
- [语言切换说明](README_LANGUAGE.md) - 详细的语言切换指南
