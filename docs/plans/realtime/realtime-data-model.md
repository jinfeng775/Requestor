# Realtime Data Model

## 目标
定义新增的共享类型、持久化边界和集合扩展方式。

## 共享类型建议
文件：`src/renderer/src/types/realtime.ts`

### 协议枚举
- `RealtimeProtocol = 'websocket' | 'sse' | 'socketio' | 'mqtt'`

### 基础键值对
复用现有 `KeyValue` 结构优先，避免重复造型。

### 连接配置
建议使用判别联合：
- `WebSocketConfig`
- `SseConfig`
- `SocketIoConfig`
- `MqttConfig`

公共字段建议：
- `id`
- `name`
- `description`
- `protocol`
- `headers`
- `query`
- `createdAt`
- `updatedAt`

#### WebSocketConfig
- `url`
- `subprotocols: string[]`

#### SseConfig
- `url`
- `withCredentials?: boolean`（若主进程方案支持）

#### SocketIoConfig
- `url`
- `namespace`
- `authPayload`
- `eventName`

#### MqttConfig
- `brokerUrl`
- `clientId`
- `username`
- `password`
- `cleanSession`
- `keepaliveSeconds`
- `subscriptions: Array<{ topic: string; qos: 0 | 1 | 2 }>`

## 标签页模型
建议新增独立 store，而不是复用 `src/renderer/src/stores/tab.ts`。

### RealtimeTab
- `id`
- `name`
- `config`
- `hasUnsavedChanges`

## 运行时会话模型
### RealtimeSessionState
- `tabId`
- `sessionId`
- `status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'`
- `connectedAt?`
- `disconnectedAt?`
- `lastError?`
- `messageCount`
- `subscriptionCount`

### RealtimeMessageEntry
- `id`
- `sessionId`
- `direction: 'in' | 'out' | 'system'`
- `eventType`
- `topic?`
- `eventName?`
- `payload`
- `timestamp`
- `meta?`

## 持久化边界
### 持久化
- realtime 配置
- realtime 标签页快照（可选，MVP 可只持久化配置不恢复连接）
- realtime 历史摘要
- 集合中的 realtime item

### 不持久化
- 活跃连接实例
- reconnect timer
- 完整消息流日志
- 未完成的订阅运行态

## 历史结构
建议新增：
- `src/renderer/src/stores/realtime-history.ts`
- storage key: `requestor-realtime-history`

### RealtimeHistoryEntry
- `id`
- `protocol`
- `name`
- `target`
- `timestamp`
- `result: 'connected' | 'failed' | 'disconnected'`
- `disconnectReason?`
- `messageCount`
- `configSnapshot`

历史里不要保存无界 message log，只保存摘要。

## 集合结构扩展
当前 `src/renderer/src/types/collection.ts` 中 `CollectionItem` 只有 `folder | request`。
建议扩展为：
- `CollectionFolder`
- `CollectionRequest`
- `CollectionRealtimeRequest`

### CollectionRealtimeRequest
- `id`
- `type: 'realtime-request'`
- `name`
- `realtimeConfig`

这样可以最大程度保持对现有 HTTP 集合逻辑的兼容。

## 兼容性原则
- 不修改已有 HTTP request 类型语义。
- 不把 realtime history 混进 HTTP history。
- 不把 realtime session 强塞进当前 response store。
- 通过新增类型和新增 store 实现最小侵入。
