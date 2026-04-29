# Realtime Architecture

## 总体原则
- **Renderer 只管理 UI 状态，不持有真实连接。**
- **Preload 只暴露窄桥接 API。**
- **Electron main 持有所有长连接与协议客户端。**
- **尽量复用现有 tab/store/storage 模式，但不要硬把 realtime 塞进 HTTP 结构。**

## 为什么单独做 Realtime 工作区
当前 HTTP 体系已经围绕以下文件形成稳定结构：
- `src/renderer/src/stores/tab.ts`
- `src/renderer/src/stores/request-editor.ts`
- `src/renderer/src/stores/response.ts`
- `src/renderer/src/components/layout/AppLayout.vue`

这些结构默认假设请求模型是 HTTP request/response。实时协议和 HTTP 语义差异太大，强行复用会导致：
- store 语义混乱
- UI 条件分支爆炸
- 回归风险变高

因此建议新增独立 `Realtime` 工作区，与现有 HTTP 工作区并存。

## 进程边界
### Renderer
职责：
- 工作区切换
- Realtime 标签页管理
- 配置表单状态
- 消息日志展示
- 连接状态展示
- 集合/历史交互

不负责：
- socket 实例
- reconnect 定时器
- 流式解析
- 协议 SDK

### Preload
在 `electron/preload.ts` 扩展桥接：
- `realtimeConnect`
- `realtimeDisconnect`
- `realtimeSend`
- `realtimeSubscribe`
- `realtimeUnsubscribe`
- `realtimeOnEvent`
- `realtimeOffEvent`

### Main
建议新增：
- `electron/ipc/realtime.ts`
- `electron/realtime/types.ts`
- `electron/realtime/sessionManager.ts`
- `electron/realtime/protocols/websocketClient.ts`
- `electron/realtime/protocols/sseClient.ts`
- `electron/realtime/protocols/socketIoClient.ts`
- `electron/realtime/protocols/mqttClient.ts`

主进程负责：
- 建立/关闭连接
- 保存 `sessionId -> client instance` 映射
- 统一归一化事件
- 连接关闭与窗口销毁时资源回收
- 发消息前进行变量解析

## 建议的 UI 分层
### Renderer 新增目录
- `src/renderer/src/components/realtime/`
- `src/renderer/src/stores/realtime-tab.ts`
- `src/renderer/src/stores/realtime-session.ts`
- `src/renderer/src/stores/realtime-history.ts`
- `src/renderer/src/types/realtime.ts`

### 可能新增组件
- `RealtimeLayout.vue`
- `RealtimeTabBar.vue`
- `RealtimeProtocolTabs.vue`
- `RealtimeConnectionForm.vue`
- `RealtimeMessageLog.vue`
- `RealtimeMessageComposer.vue`
- `RealtimeSubscriptionPanel.vue`（MQTT / Socket.IO 优先）

## 事件模型
Renderer 发命令，Main 回推标准化事件。

### 命令
- connect
- disconnect
- send
- subscribe
- unsubscribe
- clear-log（仅 renderer 本地）

### 回推事件
- `connecting`
- `connected`
- `disconnected`
- `error`
- `message-in`
- `message-out`
- `system`
- `subscription-added`
- `subscription-removed`

## 生命周期
1. renderer 创建 realtime tab。
2. 用户点击 connect。
3. preload 调用 IPC。
4. main 创建 protocol client 并注册监听器。
5. main 将事件回推给 renderer。
6. renderer 更新 session store 与消息日志。
7. 标签页关闭 / 窗口关闭 / 应用退出时，main 强制清理会话。

## 依赖策略
协议 SDK 应只在 main 侧使用，避免进入 renderer bundle。
优先使用成熟库，不手写协议实现：
- WebSocket client
- EventSource / SSE parser
- Socket.IO client
- MQTT client

## 架构风险
- 长连接放在 renderer 会带来安全与稳定性问题。
- 把 realtime 复用进当前 HTTP tab/store 会显著增加回归风险。
- 无界消息日志会造成内存增长，必须做条数上限。
