# Requestor - Desktop API Testing Tool

<img src="src/img/logo.jpg" alt="Requestor Logo" width="200"/>

**Language / 语言**: [English](README_EN.md) | [中文](README.md)

Requestor is a cross-platform desktop API testing tool built with Vue 3 + Electron, providing an intuitive Postman-like interface. It supports HTTP request sending, API collection management, environment variable configuration, request history, and more. All data is stored locally to protect your privacy. Supports exporting API documentation.

## 💡 Design Philosophy

**Why Requestor?**

- **Intranet Development Tool**: Designed specifically for intranet environments, works completely offline without internet connection
- **Self-developed Service Testing**: Developers can easily test their own backend services and quickly verify API functionality
- **Highly Customizable**: Open-source code supports secondary development with powerful extensibility for custom features based on your needs
- **Privacy & Security**: All data stored locally, never uploaded to the cloud, ensuring the security of sensitive information

## 🌟 Core Features

- **Full HTTP Client**: Support for GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS methods
- **Multi-tab Management**: Handle multiple API requests simultaneously with tab switching, duplication, and closing
- **API Collection Management**: Create and manage API collections with drag-and-drop sorting, renaming, and deletion
- **Environment Variables**: Multi-environment configuration with `{{variable}}` syntax for dynamic substitution
- **Smart Request History**: Auto-save last 500 requests with quick re-send capability
- **Powerful Response Viewer**:
  - Formatted display of JSON, XML, HTML responses
  - JSON tree view with expand/collapse support
  - Monaco Editor with syntax highlighting
  - Response headers, cookies, and timing statistics
- **Multiple Authentication Methods**: Bearer Token, Basic Auth, API Key (Header/Query)
- **Flexible Request Body Formats**: Raw (JSON/XML/HTML/Text), x-www-form-urlencoded, form-data (with file upload), Binary
- **cURL Import/Export**: Support for cURL command import and export
- **Theme Switching**: Light/dark themes with system preference following
- **Internationalization**: Seamless Chinese and English interface switching
- **Keyboard Shortcuts**: Ctrl+Enter to send, Ctrl+N for new tab, Ctrl+B to toggle sidebar, etc.
- **Offline Data Storage**: All data stored in local file system (%APPDATA%/requestor/data), with automatic localStorage migration on first launch
- **Trash Functionality**: Deleted collections and requests can be restored, auto-cleanup after 30 days
- **Global Search**: Quick search through history and collections
- **Response Examples**: Save and manage response examples for different status codes
- **Postman Compatible**: Export to Postman JSON format

## 🚀 Quick Start

### System Requirements

- Node.js >= 16.0.0
- npm >= 8.0.0

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

### Build Application

```bash
# Build Windows installer (NSIS)
npm run build:win

# Build macOS version
npm run build:mac

# Build Linux version
npm run build:linux

# Build portable version (Windows) - no installation required
npm run build:portable

# Compile only without packaging
npm run build
```

### Other Commands

```bash
# Type checking
npm run typecheck

# Code linting
npm run lint

# Code formatting
npm run format
```

## 📁 Project Structure

```
requestor/
├── electron/                     # Electron main process code
│   ├── http/
│   │   └── engine.ts            # HTTP request engine (variable interpolation, auth, multipart/form-data)
│   ├── ipc/
│   │   ├── request.ts           # Request-related IPC channels
│   │   ├── dialog.ts            # File dialog IPC
│   │   └── storage.ts           # File system storage IPC
│   ├── store/
│   │   └── storage.ts           # Local JSON file storage implementation
│   ├── types/
│   │   └── electron.d.ts        # Electron type declarations
│   ├── main.ts                  # Main process entry (window creation, IPC registration)
│   └── preload.ts               # Preload script (expose safe APIs to renderer)
├── src/renderer/                 # Renderer process code (Vue 3)
│   ├── components/
│   │   ├── common/              # Common components
│   │   │   ├── GlobalSearch.vue       # Global search
│   │   │   ├── KeyValueEditor.vue     # Key-value editor (bulk edit support)
│   │   │   ├── ResizeHandle.vue       # Draggable resize handle
│   │   │   └── SaveToCollectionDialog.vue  # Save to collection dialog
│   │   ├── environment/
│   │   │   └── EnvironmentEditor.vue  # Environment variable editor
│   │   ├── layout/
│   │   │   ├── AppLayout.vue          # Main app layout
│   │   │   ├── TitleBar.vue           # Custom title bar
│   │   │   ├── TabBar.vue             # Tab bar
│   │   │   └── StatusBar.vue          # Status bar
│   │   ├── request/             # Request builder components
│   │   │   ├── UrlInput.vue           # URL input (cURL import/export)
│   │   │   ├── MethodSelector.vue     # HTTP method selector
│   │   │   ├── RequestBuilder.vue     # Request builder main component
│   │   │   ├── ParamsEditor.vue       # Query params editor
│   │   │   ├── HeadersEditor.vue      # Request headers editor
│   │   │   ├── BodyEditor.vue         # Request body editor
│   │   │   ├── BodyFormEditor.vue     # form-data editor
│   │   │   ├── BodyBinaryPicker.vue   # Binary file picker
│   │   │   └── AuthEditor.vue         # Authentication editor
│   │   ├── response/            # Response viewer components
│   │   │   ├── ResponseViewer.vue     # Response viewer main component
│   │   │   ├── ResponseBody.vue       # Response body display
│   │   │   ├── ResponseHeaders.vue    # Response headers display
│   │   │   ├── ResponseCookies.vue    # Cookies display
│   │   │   ├── ResponseMeta.vue       # Response metadata (status, timing, etc.)
│   │   │   ├── JsonTreeView.vue       # JSON tree view
│   │   │   └── MonacoEditor.vue       # Monaco code editor
│   │   ├── sidebar/             # Sidebar components
│   │   │   ├── Sidebar.vue            # Sidebar main component
│   │   │   ├── CollectionTree.vue     # Collection tree (drag-and-drop)
│   │   │   ├── HistoryList.vue        # History list
│   │   │   └── TrashList.vue          # Trash list
│   │   └── settings/
│   │       └── SettingsModal.vue      # Settings dialog
│   ├── composables/             # Vue composables
│   │   ├── useRequest.ts        # Request sending logic
│   │   ├── useShortcuts.ts      # Keyboard shortcuts management
│   │   ├── useTheme.ts          # Theme switching
│   │   └── useLanguage.ts       # Language switching
│   ├── stores/                  # Pinia state management
│   │   ├── app-settings.ts      # App settings (theme, language, UI config)
│   │   ├── tab.ts               # Tab management
│   │   ├── collection.ts        # API collection management
│   │   ├── environment.ts       # Environment variables management
│   │   ├── history.ts           # Request history (max 500 entries)
│   │   ├── request-editor.ts    # Currently editing request
│   │   ├── response.ts          # Response data management
│   │   ├── sidebar.ts           # Sidebar state
│   │   ├── trash.ts             # Trash management
│   │   └── item-trash.ts        # Item trash management
│   ├── i18n/                    # Internationalization
│   │   ├── index.ts             # i18n configuration
│   │   └── locales/
│   │       ├── zh-CN.json       # Chinese translations
│   │       └── en-US.json       # English translations
│   ├── types/                   # TypeScript type definitions
│   │   ├── request.ts           # Request/response types
│   │   ├── collection.ts        # Collection types
│   │   ├── environment.ts       # Environment variable types
│   │   ├── history.ts           # History types
│   │   └── ipc.ts               # IPC channel constants
│   ├── utils/                   # Utility functions
│   │   ├── storage.ts           # File system storage wrapper
│   │   ├── uuid.ts              # ID generation
│   │   └── curl.ts              # cURL parsing and generation
│   ├── styles/                  # Style files
│   │   ├── variables.css        # CSS variables (theme colors)
│   │   ├── base.css             # Base styles
│   │   └── ... 
│   ├── App.vue                  # Root component
│   └── main.ts                  # Renderer process entry
├── build/                       # Build resources (icons, etc.)
├── dist/                        # Distribution directory (packaged app)
├── out/                         # Compiled output
├── package.json                 # Project configuration
├── electron.vite.config.ts      # Vite + Electron configuration
├── electron-builder.yml         # Electron Builder configuration
└── tsconfig.node.json           # TypeScript configuration
```

## 🛠️ Tech Stack

### Core Technologies
- **Electron 33** - Cross-platform desktop application framework
- **Vue 3.5** - Progressive JavaScript framework (Composition API)
- **TypeScript 5.6** - Type-safe JavaScript superset
- **Pinia 2.3** - Official state management for Vue 3
- **Vite 6** - Modern frontend build tool
- **electron-vite 3** - Electron + Vite integration

### UI Framework
- **Element Plus 2.9** - Vue 3 component library
- **Monaco Editor 0.55** - Code editor (same as VS Code)
- **vuedraggable 4.1** - Drag-and-drop sorting library

### Build Tools
- **electron-builder 25** - Electron application packaging tool
- **ESLint 8** - Code linting tool
- **Prettier 3** - Code formatting tool

## 💡 Main Feature Modules

### 1. Request Builder
- **URL Input**: Manual input and cURL import support
- **HTTP Methods**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Query Parameters**: Key-value editor with enable/disable and bulk edit
- **Request Headers**: Custom headers with quick addition of common headers
- **Request Body**:
  - **Raw**: JSON, XML, HTML, Text (Monaco Editor highlighting)
  - **x-www-form-urlencoded**: Form-encoded data
  - **form-data**: Text fields and file upload support
  - **Binary**: Binary file as request body
- **Authentication**:
  - **Bearer Token**: JWT and other token authentication
  - **Basic Auth**: Username/password Base64 encoding
  - **API Key**: Add to Header or Query parameter

### 2. Response Viewer
- **Response Body**:
  - JSON formatted display (tree view, expandable/collapsible)
  - Monaco Editor with syntax highlighting
  - Raw text display
  - HTML preview
- **Response Headers**: Key-value display
- **Cookies**: Cookie name, value, domain, path
- **Metadata**: Status code, status text, timing, response size
- **Search**: Search keywords in response content

### 3. Collection Management
- **Create Collections**: Organize related API requests
- **Drag-and-Drop Sorting**: Using vuedraggable for sorting
- **Request Management**: Add, delete, rename request items
- **Response Examples**: Save response examples for different status codes
- **Export**: Export to Postman JSON format

### 4. Environment Variables
- **Multi-Environment**: Create multiple environments (dev, test, production, etc.)
- **Variable Management**: Key-value variables with initial and current values
- **Variable Interpolation**: Use `{{variable}}` syntax in URL, headers, and body
- **Environment Switching**: Quick switch between active environments

### 5. Request History
- **Auto-Save**: Automatically save each request, up to 500 entries
- **Quick Re-send**: Click history to quickly resend requests
- **Save to Collection**: Save historical requests to collections
- **Batch Operations**: Multi-select save and delete

### 6. Trash
- **Soft Delete**: Deleted collections and requests go to trash
- **Restore**: Restore deleted items from trash
- **Permanent Delete**: Completely remove items from trash
- **Auto-Cleanup**: Automatically clear trash after 30 days

### 7. Global Search
- **Quick Search**: Press Ctrl+K to open global search
- **Search Scope**: History and collection requests
- **Real-time Filtering**: Search as you type

### 8. Keyboard Shortcuts
- **Ctrl+Enter**: Send request
- **Ctrl+N**: New tab
- **Ctrl+B**: Toggle sidebar
- **Ctrl+L**: Focus URL input
- **Ctrl+W**: Close current tab
- **Ctrl+S**: Save to collection
- **Ctrl+K**: Global search

## 🔧 Development Guide

### Code Standards
- ESLint + Prettier code formatting
- TypeScript strict mode
- Vue 3 Composition API
- Component naming: PascalCase
- File naming: kebab-case

### State Management
Global state managed with Pinia stores:
- `app-settings`: Application configuration (theme, language, UI config)
- `tab`: Tab management (create, close, switch)
- `collection`: API collections (CRUD operations)
- `environment`: Environment variables (multi-environment management)
- `history`: Request history (auto-save, query)
- `request-editor`: Currently editing request
- `response`: Response data (success/failure state)
- `sidebar`: Sidebar state (show/hide)
- `trash`: Trash management

### IPC Communication
Safe APIs exposed to renderer process via `preload.ts`:
```typescript
// Send HTTP request
window.api.sendRequest(config, envVars)

// File operations
window.api.openFile()
window.api.saveFile(defaultName)
window.api.readFile(filePath)
window.api.writeFile(filePath, content)

// Persistent storage
window.api.storageLoad(key)
window.api.storageSave(key, data)
window.api.storageSize(key)
```

### Data Storage
- **Storage Location**: `%APPDATA%/requestor/data/{key}.json`
- **Storage Format**: JSON files (2-space indentation)
- **Storage Keys**:
  - `requestor-settings`: Application settings
  - `requestor-collections`: API collections
  - `requestor-environments`: Environment variables
  - `requestor-history`: Request history
  - `requestor-trash`: Trash
  - `requestor-item-trash`: Item trash
- **Migration**: Automatic migration from localStorage to file system on first launch

## 🌐 Internationalization

Supported languages:
- Simplified Chinese (zh-CN)
- English (en-US)

Translation files located in `src/renderer/src/i18n/locales/`:
- `zh-CN.json`: Chinese translations
- `en-US.json`: English translations

Using vue-i18n for internationalization:
```vue
<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <button>{{ t('common.send') }}</button>
</template>
```

## 🎨 Theme System

Supports light and dark themes:
- **Manual Switch**: Select light/dark/follow system in settings panel
- **Auto Follow**: Listen to system theme changes
- **CSS Variables**: Use CSS variables for theme styling
- **Storage**: Theme settings saved in `requestor-settings.json`

Theme variables example:
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

## 📦 Packaging & Distribution

### Windows
```bash
# NSIS installer (recommended)
npm run build:win
# Output: dist/requestor-1.0.0-setup.exe

# Portable version
npm run build:portable
# Output: dist/requestor-1.0.0-portable.exe

# Unpacked version
npm run build:unpack
# Output: dist/win-unpacked/
```

### macOS
```bash
npm run build:mac
# Output: dist/requestor-1.0.0.dmg
```

### Linux
```bash
npm run build:linux
# Output: dist/requestor-1.0.0.AppImage
```

## 🤝 Contributing

Issues and Pull Requests are welcome!

### Development Workflow
1. Fork this project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
Follow Conventional Commits specification:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation update
- `style:` Code formatting
- `refactor:` Refactoring
- `test:` Test related
- `chore:` Build process or auxiliary tool changes

Examples:
```bash
git commit -m "feat: add cURL import support"
git commit -m "fix: resolve response parsing error"
git commit -m "docs: update README with new features"
```

## 📄 License

MIT License

## 👥 Authors

Requestor Team

---

**Note**: This is an open-source project aimed at providing developers with a lightweight, efficient API testing tool. If you have any suggestions or questions, feel free to contact us!

---

## 🌍 Multi-language Support

- [中文版](README.md) - Chinese Version
- [Language Switch Guide](README_LANGUAGE.md) - Detailed language switching guide
