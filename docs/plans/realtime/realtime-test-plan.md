# Realtime Test Plan

## 测试目标
确保新增 realtime 能力不破坏现有 HTTP 流程，并且四种协议在 MVP 范围内可稳定工作。

## 分层测试策略
### 1. Unit tests
建议目录：
- `test/electron/realtime/`
- `test/renderer/realtime/`（如当前测试体系后续扩展支持）

覆盖点：
- realtime 类型归一化
- session manager 的状态流转
- message log 条数裁剪
- realtime history 摘要生成
- 变量解析在 realtime 字段上的复用
- collection item 的 realtime 分支逻辑

### 2. Integration tests
覆盖点：
- preload -> IPC -> main 的 connect/disconnect/send 流
- 窗口关闭 / tab 关闭触发 session cleanup
- main 回推事件被 renderer store 正确消费

### 3. 协议级 smoke tests
#### WebSocket
- 连接 echo server
- 发送文本消息
- 收到回显
- 正常关闭

#### SSE
- 连接 event stream
- 收到多条消息
- 手动断开

#### Socket.IO
- 成功连接 namespace
- emit 一个事件
- 收到服务端事件

#### MQTT
- 连接 broker
- 订阅 topic
- 发布消息
- 收到回环消息
- 取消订阅

## 手工验证清单
- 可以进入 Realtime 工作区。
- 可以创建多个 realtime tab。
- 协议切换不会污染别的 tab 状态。
- 关闭 tab 会释放对应连接。
- 保存到集合后可再次打开。
- 历史正确记录协议和连接结果。
- 长时间接收消息不会无限增长内存。

## 回归检查
重点回归：
- HTTP 请求发送仍正常
- `src/renderer/src/stores/tab.ts` 逻辑未被错误耦合
- 现有 history/collection/environment 功能不受影响
- `electron/preload.ts` 现有 API 不回归

## 当前仓库测试体系注意点
当前 `npm test` 主要覆盖：
- `test/electron/http/variables/**/*.test.ts`
- `test/**/*.ts` 编译后的 node test

因此需要在实现阶段同步扩展 `tsconfig.test.json` 和测试入口，确保 realtime 模块被编译并执行。

## 里程碑验收命令
每个里程碑至少执行：
- `npm run typecheck`
- `npm run lint`
- `npm test`

如引入 UI 流程，还应补充手工 Electron 验证或 E2E smoke。
