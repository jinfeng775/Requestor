## Implementation Plan: Chrome-like Network Request Details

### Assumptions
- “跟谷歌浏览的看板一模一样” is interpreted as **high-fidelity request-details inspector parity** with Chrome DevTools Network request details, not a full browser-grade global network monitor.
- This app is an **API client**, so some Chrome DevTools concepts should be adapted around request execution rather than page resource loading.
- Electron `net.request` is the transport source of truth, so the plan favors **accurate data we can actually collect** over fake timing fields.

### Task Type
- [x] Frontend
- [x] Backend
- [x] Fullstack

### Goal
Turn the current response-only panel into a **real request details inspector** with Chrome-like tabs and density:
- Overview
- Headers
- Payload
- Preview / Response
- Cookies
- Timing
- Scripts / Trace

The resulting UI should let a user answer:
1. What exactly did I send?
2. What exactly came back?
3. How long did each phase take?
4. Was there a redirect or mutation?
5. Which headers/cookies/body were involved?

---

## Current State Summary

### Existing execution path
1. Renderer sends request from `src/renderer/src/composables/useRequest.ts`
2. IPC bridge forwards through `electron/ipc/request.ts`
3. Main process executes via `electron/http/requestPipeline.ts` / `electron/http/engine.ts`
4. Renderer stores response in `src/renderer/src/stores/response.ts`
5. UI renders via `src/renderer/src/components/response/ResponseViewer.vue`

### Existing response contract
`src/renderer/src/types/request.ts` currently exposes only:
- `status`
- `statusText`
- `headers`
- `body`
- `bodySize`
- `headerSize`
- `totalTime`
- `contentType`
- `cookies`
- `variableWarnings`
- `scriptReport`

### Main gap
The app currently has **response viewing**, but not **network request details**. It is missing:
- final request snapshot after interpolation/auth/body assembly
- query string breakdown
- request headers actually sent
- request payload preview
- redirect chain
- timing phase breakdown
- remote/protocol metadata
- Chrome-like inspector IA

---

## Technical Solution

### 1. Add a dedicated `networkDetails` contract
Do **not** keep expanding `HttpResponseData` as flat fields. Add a nested structure to preserve readability and future growth.

#### Proposed type shape
```ts
interface NetworkHeaderEntry {
  name: string
  value: string
}

interface NetworkQueryParam {
  key: string
  value: string
  enabled: boolean
}

interface NetworkCookie {
  name: string
  value: string
  domain: string
  path: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: string
  expires?: string
}

interface NetworkRedirectEntry {
  status: number
  statusText: string
  location?: string
  url: string
  durationMs?: number
}

interface NetworkTimingBreakdown {
  queuedMs?: number
  requestSentMs?: number
  waitingTtfbMs?: number
  downloadMs?: number
  totalMs: number
  accuracy: 'measured' | 'estimated' | 'unsupported'
  unsupportedPhases?: Array<'dns' | 'connect' | 'ssl'>
}

interface NetworkRequestSnapshot {
  method: string
  originalUrl: string
  finalUrl: string
  queryString: NetworkQueryParam[]
  headers: NetworkHeaderEntry[]
  headerSize: number
  bodyPreview: string
  bodySize: number
  bodyType: HttpRequestConfig['bodyType']
  contentType: string
}

interface NetworkResponseSnapshot {
  url: string
  status: number
  statusText: string
  headers: NetworkHeaderEntry[]
  rawHeaders: Record<string, string>
  headerSize: number
  bodySize: number
  contentType: string
  cookies: NetworkCookie[]
  remoteAddress?: string
  remotePort?: number
  protocol?: string
  fromCache?: boolean
}

interface NetworkDetails {
  overview: {
    method: string
    finalUrl: string
    status: number
    statusText: string
    totalTime: number
    requestBodySize: number
    responseBodySize: number
    transferredSize: number
    protocol?: string
  }
  request: NetworkRequestSnapshot
  response: NetworkResponseSnapshot
  timing: NetworkTimingBreakdown
  redirects: NetworkRedirectEntry[]
}
```

### 2. Capture only timing data that Electron can support honestly
Chrome DevTools shows DNS / Initial connection / SSL / Request sent / Waiting (TTFB) / Content download.

With current `electron/net.request` usage, the realistic plan is:
- **must measure directly**:
  - total
  - waiting / TTFB proxy (request start -> first response byte)
  - download (first response byte -> response end)
- **conditionally expose if runtime supports it**:
  - protocol
  - remote address / port
  - redirect info
- **do not fake** DNS / connect / SSL if Electron does not expose them

UI should therefore label unsupported phases clearly rather than inventing precision.

### 3. Build a DevTools-like inspector, not a browser waterfall clone
The right-side panel should evolve from tabbed response display into a **dense detail inspector**.

Recommended information architecture:
- Summary strip
- Primary tabs:
  - Overview
  - Headers
  - Payload
  - Preview
  - Response
  - Cookies
  - Timing
  - Scripts

Chrome-like to copy:
- compact metadata row
- dense key/value sections
- collapsible header blocks
- timing bars with labels
- copy affordances

Adapt for API client:
- surface collection/environment/script effects as first-class request context
- keep one request open at a time instead of browser-wide request table dependency

---

## Implementation Steps

### Phase 1 — Extend the backend contract
**Deliverable:** `HttpResponseData` includes a fully shaped `networkDetails` object.

#### Files
- `src/renderer/src/types/request.ts`
- `electron/http/engine.ts`
- `electron/http/requestPipeline.ts`
- `electron/ipc/request.ts`
- `electron/types/electron.d.ts`

#### Work
1. Add `NetworkDetails`-related interfaces in `src/renderer/src/types/request.ts`.
2. Keep existing top-level fields for compatibility.
3. In `electron/http/engine.ts`, capture:
   - interpolated URL before request
   - final URL after auth/query injection
   - normalized request headers actually sent
   - built request body preview and byte size
   - first-byte timestamp
   - response-end timestamp
   - parsed response headers and cookies
   - redirect steps if they can be intercepted
4. Return both:
   - legacy fields for existing UI
   - new `networkDetails` object for the new inspector

#### Pseudo-code
```ts
const startedAt = now()
let firstByteAt: number | null = null
let finalUrl = fullUrl
const requestHeaders = buildHeaders(...)
const builtBody = buildBody(...)

request.on('response', (response) => {
  if (firstByteAt === null) firstByteAt = now()
  response.on('data', collectChunks)
  response.on('end', () => {
    const endedAt = now()

    resolve({
      status,
      statusText,
      headers,
      body,
      totalTime: endedAt - startedAt,
      networkDetails: {
        overview: {...},
        request: {...},
        response: {...},
        timing: {
          waitingTtfbMs: firstByteAt ? firstByteAt - startedAt : undefined,
          downloadMs: firstByteAt ? endedAt - firstByteAt : undefined,
          totalMs: endedAt - startedAt,
          accuracy: 'measured',
          unsupportedPhases: ['dns', 'connect', 'ssl']
        },
        redirects: redirectChain
      }
    })
  })
})
```

#### Important design rule
If a request body is huge or binary, do not always duplicate full contents into `networkDetails.request.bodyPreview`. Use:
- full text preview only for bounded text payloads
- truncated preview + byte size for large text payloads
- placeholder metadata for binary payloads

---

### Phase 2 — Thread the new contract through renderer state
**Deliverable:** Existing request flow still works, and new inspector data is available in store.

#### Files
- `src/renderer/src/stores/response.ts`
- `src/renderer/src/composables/useRequest.ts`
- `src/renderer/src/types/history.ts`
- `src/renderer/src/stores/history.ts`

#### Work
1. Leave `useRequest.ts` send flow intact.
2. Ensure `response.setData()` preserves the new `networkDetails` payload.
3. Decide history persistence policy:
   - **recommended**: persist only a compact subset of `networkDetails`
   - do not dump full body previews into history by default
4. Add history-safe summary type if request details need reopening later.

#### Pseudo-code
```ts
interface HistoryNetworkSummary {
  method: string
  finalUrl: string
  status: number
  totalTime: number
  requestBodySize: number
  responseBodySize: number
}
```

#### Why
Full fidelity inspector data is valuable live, but persisting everything will inflate disk usage and memory.

---

### Phase 3 — Rebuild the response area into an inspector shell
**Deliverable:** A Chrome-like detail surface inside the current lower panel.

#### Files
- `src/renderer/src/components/response/ResponseViewer.vue`
- `src/renderer/src/components/response/ResponseMeta.vue`
- new response feature components under `src/renderer/src/components/response/`

#### Recommended new components
- `NetworkOverviewTab.vue`
- `NetworkHeadersTab.vue`
- `NetworkPayloadTab.vue`
- `NetworkPreviewTab.vue`
- `NetworkResponseTab.vue`
- `NetworkCookiesTab.vue`
- `NetworkTimingTab.vue`
- `NetworkSection.vue`
- `NetworkKeyValueTable.vue`
- `TimingBar.vue`

#### Work
1. Keep `ResponseViewer.vue` as the shell.
2. Replace current 4-tab model with inspector tabs.
3. Move status / time / size from `ResponseMeta.vue` into a denser summary strip that also shows:
   - method
   - final URL
   - protocol
   - transferred size
4. Keep Scripts as a first-class tab.
5. Split preview vs raw response:
   - Preview = formatted body viewer
   - Response = raw/plain text view

#### Tab structure
- **Overview**: canonical summary, URL, method, status, sizes, protocol, redirect count
- **Headers**:
  - General
  - Response Headers
  - Request Headers
  - Query String Parameters
- **Payload**:
  - form-data / x-www-form-urlencoded / raw request body preview
- **Preview**:
  - rich display for JSON / HTML / text
- **Response**:
  - raw response body
- **Cookies**:
  - request/response cookie sections
- **Timing**:
  - segmented bars + numeric breakdown
- **Scripts**:
  - existing pre/post execution report

---

### Phase 4 — Chrome-like interaction polish
**Deliverable:** The panel feels like a real network inspector rather than simple tabs.

#### Work
1. Add collapsible sections to Headers / Payload / Cookies.
2. Add inline copy actions for values and whole sections.
3. Add sticky sub-toolbar for current tab actions.
4. Add search/filter within long header lists.
5. Add long-value expansion and wrap toggle.
6. Add empty-state language for unsupported timing phases.

#### UX rules
- density should be high, but not cramped
- all timing visuals need text fallback
- keyboard navigation must work for tabs and collapsible sections
- no horizontal overflow traps for long URLs or header values

---

### Phase 5 — Optional layout parity improvements
**Deliverable:** The overall workspace feels closer to DevTools.

#### Files
- `src/renderer/src/components/layout/AppLayout.vue`
- `src/renderer/src/components/request/RequestBuilder.vue`

#### Options
1. **Low-risk path — recommended now**
   - keep current vertical split
   - only upgrade lower panel into a full inspector
2. **Higher-fidelity path — later**
   - allow a detachable or fullscreen network-inspector mode
   - optionally add left request summary rail within the response panel

#### Recommendation
Start with low-risk path. It preserves current product ergonomics and avoids a large workspace rewrite.

---

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `src/renderer/src/types/request.ts` | Modify | Add `NetworkDetails` request/response/timing/redirect types |
| `electron/http/engine.ts` | Modify | Capture request snapshot, timing points, response metadata, redirect context |
| `electron/http/requestPipeline.ts` | Modify | Thread network details through script pipeline output |
| `electron/ipc/request.ts` | Modify | Preserve expanded contract through IPC envelope |
| `electron/types/electron.d.ts` | Modify | Update preload-exposed type signature if needed |
| `src/renderer/src/stores/response.ts` | Modify | Store richer response details without breaking existing reads |
| `src/renderer/src/composables/useRequest.ts` | Modify | Keep send flow, consume enriched payload |
| `src/renderer/src/components/response/ResponseViewer.vue` | Modify | Replace simple tab shell with inspector shell |
| `src/renderer/src/components/response/ResponseMeta.vue` | Modify | Convert into dense summary row |
| `src/renderer/src/components/response/*` | Add | Add Overview / Headers / Payload / Timing / shared inspector components |
| `src/renderer/src/types/history.ts` | Modify | Add compact history-safe network summary if persisted |
| `src/renderer/src/stores/history.ts` | Modify | Persist only bounded details, not entire duplicate payloads |
| `src/renderer/src/components/layout/AppLayout.vue` | Optional modify | Only if later adding detachable/fullscreen request-details mode |

---

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Electron `net.request` cannot expose full Chrome-grade DNS/connect/SSL phases | Mark unsupported phases explicitly; only show measured values; do not fake precision |
| Redirect chain is hidden by `redirect: 'follow'` | Investigate interceptable redirect events first; if unavailable, expose final URL + redirect count fallback |
| Full request/response duplication increases memory and disk use | Bound preview sizes, avoid persisting full inspector payload in history, summarize large/binary bodies |
| Sensitive auth headers/tokens become too visible | Add redaction rules for `Authorization`, cookies, and secret-like headers in copied/exported views |
| UI becomes too dense and hard to scan | Use collapsible groups, sticky summary, search, wrap toggles, and keyboard support |
| Existing response UI regressions | Keep legacy top-level response fields until all new tabs are stable |

---

## Verification Plan

### Backend / contract
1. Unit tests for request snapshot generation:
   - interpolated URL
   - query params
   - request header capture
   - request body preview truncation
2. Unit/integration tests for timing object shape:
   - total present
   - waiting/download derived correctly
   - unsupported phases labeled correctly
3. Redirect handling tests where feasible.
4. Binary body handling tests.

### Renderer
1. Tab rendering tests for each inspector section.
2. Header/value wrapping and copy behavior tests.
3. Timing fallback rendering when some phases are unavailable.
4. Error/loading/empty-state regression checks.

### Manual UI verification
- Send JSON request
- Send form-data request
- Send binary upload request
- Hit redirect endpoint
- Hit error endpoint
- Verify long URL / large headers / cookies
- Verify fullscreen mode still works

---

## Suggested Delivery Slices

### Slice A — Highest ROI
- contract extension
- Overview tab
- Headers tab
- Payload tab
- Timing tab

### Slice B
- Preview / Response separation
- Cookies improvements
- summary strip redesign

### Slice C
- redirect detail
- copy/search polish
- detachable/fullscreen inspector enhancements

---

## Recommendation
Build this in **three real milestones**:
1. **Data truth first** — enrich `networkDetails` in the Electron engine
2. **Inspector shell second** — replace the current response tabs with a DevTools-style structure
3. **Fidelity polish last** — timing visuals, copy/search, redirect details, fullscreen ergonomics

That path gives you a result that feels much closer to Chrome DevTools while staying honest about what an Electron API client can actually measure.

---

## SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: unavailable in current environment (external wrapper missing)
- GEMINI_SESSION: unavailable in current environment (external wrapper missing)
- INTERNAL_BACKEND_ARCHITECT_AGENT: a1f44d372129dba0a
- INTERNAL_FRONTEND_PLANNER_AGENT: aa66032aa92cee705
