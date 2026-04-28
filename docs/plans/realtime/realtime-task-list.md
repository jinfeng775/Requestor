# Realtime Task List

## 分支
- 开发分支：`feat/realtime-protocols`

## 里程碑 0：规划与依赖确认
- [ ] 确认四种协议各自采用的主进程 SDK
- [ ] 确认依赖仅在 main 端使用，不进入 renderer bundle
- [ ] 锁定 IPC 合同与数据模型
- [ ] 明确消息日志上限策略

## 里程碑 1：基础骨架
- [ ] 新增 `src/renderer/src/types/realtime.ts`
- [ ] 在 `src/renderer/src/types/ipc.ts` 增加 realtime channels
- [ ] 新增 `electron/ipc/realtime.ts`
- [ ] 新增 `electron/realtime/sessionManager.ts`
- [ ] 在 `electron/preload.ts` 暴露 realtime API
- [ ] 在主进程注册 realtime IPC

验收：
- [ ] typecheck 通过
- [ ] lint 通过
- [ ] connect/disconnect 空骨架调用链可跑通

## 里程碑 2：Renderer 工作区与标签页
- [ ] 新增 Realtime 工作区入口
- [ ] 新增 `src/renderer/src/stores/realtime-tab.ts`
- [ ] 新增 `src/renderer/src/stores/realtime-session.ts`
- [ ] 新增基础组件：layout / tab bar / form / log
- [ ] 支持创建、切换、关闭 realtime tab

验收：
- [ ] 不影响现有 HTTP tab 行为
- [ ] UI 能展示连接状态与消息日志骨架

## 里程碑 3：WebSocket MVP
- [ ] 实现 main 侧 websocket client adapter
- [ ] 实现 connect / disconnect / send
- [ ] 展示入站/出站消息
- [ ] 加入 message log 上限策略

验收：
- [ ] 能连通 echo server
- [ ] 可发送文本并收到响应

## 里程碑 4：SSE MVP
- [ ] 实现 SSE adapter
- [ ] 支持 connect / disconnect
- [ ] 解析并展示 event stream
- [ ] 明确 UI 中 SSE 为只读流

验收：
- [ ] 能持续接收消息并手动断开

## 里程碑 5：Socket.IO MVP
- [ ] 实现 socket.io adapter
- [ ] 支持 namespace / auth / event emit
- [ ] 监听并展示服务端事件

验收：
- [ ] 能完成 connect + emit + receive 基本流

## 里程碑 6：MQTT MVP
- [ ] 实现 mqtt adapter
- [ ] 支持 connect / publish / subscribe / unsubscribe
- [ ] 展示 topic、qos、retain 等元数据

验收：
- [ ] 可完成订阅与发布回环验证

## 里程碑 7：持久化与集合整合
- [ ] 新增 `src/renderer/src/stores/realtime-history.ts`
- [ ] 定义 `requestor-realtime-history`
- [ ] 扩展 `src/renderer/src/types/collection.ts`
- [ ] 扩展 collection store 与 UI，支持 realtime item
- [ ] 复用环境变量解析

验收：
- [ ] realtime 配置可保存到集合并重新打开
- [ ] realtime history 可查看连接摘要

## 里程碑 8：测试与收尾
- [ ] 补充 `test/electron/realtime/` 单元/集成测试
- [ ] 扩展 `tsconfig.test.json` 覆盖 realtime 模块
- [ ] 回归验证 HTTP 主流程
- [ ] 补充 README / i18n 文案

最终验收：
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] 手工验证 Realtime 黄金路径
