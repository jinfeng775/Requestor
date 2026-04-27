# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Project overview

Requestor is a desktop API testing tool, similar to Postman, built with Electron 33, Vue 3, TypeScript, Pinia, Element Plus, Monaco Editor, and electron-vite. It is designed for offline/local API testing: HTTP requests, collections, environments, history, response viewing, cURL import/export, Postman export, themes, i18n, and file-based local persistence.

## Common commands

Use npm; this repository has a package-lock.json.

```bash
# Install dependencies
npm install

# Run Electron + Vite development mode
npm run dev

# Build Electron main/preload/renderer bundles
npm run build

# Preview the built app
npm run preview

# Type-check both Electron/Node and Vue renderer code
npm run typecheck

# Type-check only Electron/Node code
npm run typecheck:node

# Type-check only renderer code
npm run typecheck:web

# Run ESLint
npm run lint

# Format source files with Prettier
npm run format

# Compile and run tests with Node's built-in test runner
npm test

# Run one compiled test file after compiling tests
npx tsc -p tsconfig.test.json && node --test out-test/test/electron/http/variables/resolveVariables.test.js

# Package builds
npm run build:unpack
npm run build:win
npm run build:portable
npm run build:mac
npm run build:linux
```

Testing currently compiles `electron/http/variables/**/*.ts` and `test/**/*.ts` through `tsconfig.test.json`, then runs `node --test "out-test/test/**/*.test.js"`.

## Architecture

### Process boundaries

- `electron/main.ts` is the Electron main-process entry. It creates the main `BrowserWindow`, configures `contextIsolation: true` and `nodeIntegration: false`, opens external links in the system browser, and registers IPC before creating the window.
- `electron/preload.ts` is the only bridge exposed to the renderer. It uses `contextBridge` to expose `window.api` methods for request sending, file dialogs, file I/O, and storage.
- `src/renderer/src/main.ts` bootstraps the Vue renderer with Pinia, vue-i18n, Element Plus, and global styles, then mounts `App.vue`.
- `electron.vite.config.ts` defines separate main, preload, and renderer builds. Renderer imports use the `@` alias for `src/renderer/src`; Monaco is split into its own manual chunk; Element Plus auto-import/component resolvers are enabled.

### Request flow

The normal send-request path crosses the renderer/main boundary:

1. Renderer UI state lives in Pinia stores, primarily `stores/request-editor.ts`, `stores/environment.ts`, and `stores/response.ts`.
2. `src/renderer/src/composables/useRequest.ts` validates that a URL and `window.api` are available, deep-clones the active request to detach it from Vue reactivity, copies active environment variables, and calls `window.api.sendRequest(...)`.
3. `electron/preload.ts` maps `sendRequest` to the `request:send` IPC channel.
4. `electron/ipc/request.ts` handles `request:send`, delegates to `executeRequest`, and returns a `{ success, data }` or `{ success, error }` envelope.
5. `electron/http/engine.ts` performs the HTTP request with Electron `net.request`. It resolves `{{variables}}`, builds query strings, applies Bearer/Basic/API Key auth, builds raw/urlencoded/form-data/binary bodies, follows redirects, and collects response headers, cookies, body, timing, size, content type, and variable warnings.
6. On success, `useRequest.ts` updates the response store, appends history, and, when the request came from a collection item, updates the collection request config and stores a response example.

Variable resolution lives under `electron/http/variables/`; tests for nested variables, dynamic variables, escaping, unknown variables, and circular references are in `test/electron/http/variables/resolveVariables.test.ts`.

### State and persistence

- Renderer state uses Pinia stores under `src/renderer/src/stores/` for app settings, tabs, request editor, response, history, collections, environments, sidebar, and trash.
- `src/renderer/src/App.vue` loads persisted stores in parallel on mount, starts the system theme listener, then initializes tabs.
- Renderer persistence calls are centralized in `src/renderer/src/utils/storage.ts`. It serializes Vue reactive data to plain JSON before crossing IPC.
- Main-process JSON file persistence is implemented in `electron/store/storage.ts` and exposed by `electron/ipc/storage.ts` through `storage:load`, `storage:save`, and `storage:size`.
- Data is stored below Electron's `app.getPath('userData')/data` directory as `{key}.json`. README documents Windows as `%APPDATA%/requestor/data/{key}.json`.
- Some stores migrate legacy localStorage data, and `electron/store/storage.ts` also checks a legacy `mypostman` data path for `requestor-*` keys.

### IPC and file access

- Shared IPC channel constants are in `src/renderer/src/types/ipc.ts`.
- Implemented main handlers include request sending, storage load/save/size, file open/save dialogs, JSON open dialogs, and raw `file:read` / `file:write` handlers.
- Keep renderer code using the preload bridge instead of importing Electron or Node APIs directly.

### Renderer organization

- Components are grouped by feature under `src/renderer/src/components/`: `layout`, `request`, `response`, `sidebar`, `environment`, `settings`, and `common`.
- Reusable renderer logic lives in `src/renderer/src/composables/`, including request sending, shortcuts, theme handling, toast behavior, and cache stats.
- Shared renderer models live in `src/renderer/src/types/`; utilities such as storage, cURL, UUID, and export helpers live in `src/renderer/src/utils/`.
- i18n is configured in `src/renderer/src/i18n/` with locale files in `src/renderer/src/i18n/locales/`.
- Global styling is loaded from `src/renderer/src/styles/`, including variables, dark theme styles, Element Plus overrides, and global CSS.

## Packaging notes

`electron-builder.yml` sets `appId: com.requestor.app`, `productName: Requestor`, build resources in `build/`, and Windows targets for NSIS, unpacked directory, and portable x64 builds. Packaged outputs go under `dist/`.
