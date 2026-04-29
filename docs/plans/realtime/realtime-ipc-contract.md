# Realtime IPC Contract

## 目标
明确 renderer / preload / main 之间的命令与事件，避免实现阶段接口漂移。

## 建议新增通道
文件：`src/renderer/src/types/ipc.ts`

建议新增常量：
- `REALTIME_CONNECT`
- `REALTIME_DISCONNECT`
- `REALTIME_SEND`
- `REALTIME_SUBSCRIBE`
- `REALTIME_UNSUBSCRIBE`
- `REALTIME_EVENT`

## preload API 草案
文件：`electron/preload.ts`

```ts
window.api.realtimeConnect(config, envVars)
window.api.realtimeDisconnect(sessionId)
window.api.realtimeSend(sessionId, payload)
window.api.realtimeSubscribe(sessionId, subscription)
window.api.realtimeUnsubscribe(sessionId, subscription)
window.api.onRealtimeEvent(listener)
window.api.offRealtimeEvent(listener)
```

## 命令模型
### connect
输入：
- `tabId`
- `config`
- `envVars`

输出：
- `success`
- `sessionId`
- `protocol`
- `meta?`
- `error?`

### disconnect
输入：
- `sessionId`

输出：
- `success`
- `error?`

### send
适用于：
- WebSocket
- Socket.IO
- MQTT

输入：
- `sessionId`
- `payload`
- `meta?`（eventName/topic/qos 等）

输出：
- `success`
- `error?`

### subscribe / unsubscribe
主要用于：
- MQTT
- Socket.IO（监听特定 event 时也可复用此思路）

输入：
- `sessionId`
- `subscription`

输出：
- `success`
- `error?`

## main -> renderer 事件模型
事件统一走单一回推通道 `REALTIME_EVENT`。

### RealtimeEventEnvelope
- `sessionId`
- `tabId`
- `protocol`
- `type`
- `timestamp`
- `payload`
- `meta?`

### type 值
- `connecting`
- `connected`
- `disconnected`
- `error`
- `message-in`
- `message-out`
- `system`
- `subscription-added`
- `subscription-removed`

## 协议差异处理
### WebSocket
- `message-in` / `message-out` payload 以文本优先。
- 二进制在 MVP 先标成 metadata，不做复杂展示。

### SSE
- 只会有入站事件。
- `payload.meta` 可包含 `event`、`id`、`retry`。

### Socket.IO
- `payload.meta` 可包含 `eventName`、`namespace`。

### MQTT
- `payload.meta` 可包含 `topic`、`qos`、`retain`。

## 错误处理原则
- main 层统一转为结构化错误，不把底层库原始对象直接暴露到 renderer。
- renderer 仅基于标准错误结构展示。
- 连接失败、发送失败、订阅失败都要能区分。

## 清理策略
- tab 关闭时 renderer 先发 disconnect。
- 若 renderer 未正常发出，main 在 window close / app quit 时兜底清理所有 session。
