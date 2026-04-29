/** IPC 通道名称常量 - 主进程和渲染进程共用 */
export const IPC_CHANNELS = {
  REQUEST_SEND: 'request:send', // 发送 HTTP 请求
  REQUEST_CANCEL: 'request:cancel', // 取消请求
  REALTIME_CONNECT: 'realtime:connect',
  REALTIME_DISCONNECT: 'realtime:disconnect',
  REALTIME_SEND: 'realtime:send',
  REALTIME_SUBSCRIBE: 'realtime:subscribe',
  REALTIME_UNSUBSCRIBE: 'realtime:unsubscribe',
  REALTIME_EVENT: 'realtime:event',
  COLLECTION_GET_ALL: 'collection:getAll', // 获取所有集合
  COLLECTION_CREATE: 'collection:create', // 创建集合
  COLLECTION_UPDATE: 'collection:update', // 更新集合
  COLLECTION_DELETE: 'collection:delete', // 删除集合
  COLLECTION_ADD_ITEM: 'collection:addItem', // 添加集合项
  COLLECTION_DELETE_ITEM: 'collection:deleteItem', // 删除集合项
  HISTORY_GET_ALL: 'history:getAll', // 获取所有历史记录
  HISTORY_ADD: 'history:add', // 添加历史记录
  HISTORY_DELETE: 'history:delete', // 删除历史记录
  HISTORY_CLEAR: 'history:clear', // 清空历史记录
  ENVIRONMENT_GET_ALL: 'environment:getAll', // 获取所有环境
  ENVIRONMENT_CREATE: 'environment:create', // 创建环境
  ENVIRONMENT_UPDATE: 'environment:update', // 更新环境
  ENVIRONMENT_DELETE: 'environment:delete', // 删除环境
  SETTINGS_GET: 'settings:get', // 获取设置
  SETTINGS_SET: 'settings:set', // 保存设置
  DIALOG_OPEN_FILE: 'dialog:openFile', // 打开文件对话框
  DIALOG_SAVE_FILE: 'dialog:saveFile', // 保存文件对话框
  DIALOG_OPEN_JSON: 'dialog:openJson', // 打开 JSON 文件对话框
  STORAGE_LOAD: 'storage:load', // 加载持久化数据
  STORAGE_SAVE: 'storage:save', // 保存持久化数据
  STORAGE_SIZE: 'storage:size' // 获取文件大小
} as const
