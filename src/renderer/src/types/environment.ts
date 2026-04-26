/** 环境配置接口 - 用于管理不同环境的变量 */
export interface Environment {
  id: string // 环境唯一标识
  name: string // 环境名称(如:开发、测试、生产)
  variables: EnvironmentVariable[] // 环境变量列表
}

/** 环境变量 */
export interface EnvironmentVariable {
  key: string // 变量名
  initialValue: string // 初始值(持久化存储)
  currentValue: string // 当前值(会话中可修改)
  enabled: boolean // 是否启用
}
