import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from '@/utils/uuid'
import { loadData, saveData, migrateFromLocalStorage } from '@/utils/storage'
import type { Environment, EnvironmentVariable } from '@/types/environment'

const STORAGE_KEY = 'requestor-environments'

interface EnvironmentStoreData {
  environments: Environment[]
  activeEnvId: string | null
}

export const useEnvironmentStore = defineStore('environment', () => {
  const environments = ref<Environment[]>([])
  const activeEnvId = ref<string | null>(null)
  let loaded = false

  const activeEnv = computed(
    () => environments.value.find((e) => e.id === activeEnvId.value) || null
  )

  const activeVars = computed(() => {
    if (!activeEnv.value) return {}
    const vars: Record<string, string> = {}
    for (const v of activeEnv.value.variables) {
      if (v.enabled && v.key) {
        vars[v.key] = v.currentValue || v.initialValue
      }
    }
    return vars
  })

  function createEnvironment(name: string): Environment {
    const env: Environment = { id: nanoid(), name, variables: [] }
    environments.value = [...environments.value, env]
    if (!activeEnvId.value) activeEnvId.value = env.id
    persist()
    return env
  }

  function deleteEnvironment(id: string): void {
    environments.value = environments.value.filter((e) => e.id !== id)
    if (activeEnvId.value === id) {
      activeEnvId.value = environments.value[0]?.id || null
    }
    persist()
  }

  function setActive(id: string | null): void {
    activeEnvId.value = id
    persist()
  }

  function addVariable(envId: string): void {
    environments.value = environments.value.map((e) => {
      if (e.id !== envId) return e
      return {
        ...e,
        variables: [...e.variables, { key: '', initialValue: '', currentValue: '', enabled: true }]
      }
    })
    persist()
  }

  function updateVariable(
    envId: string,
    index: number,
    field: keyof EnvironmentVariable,
    value: string | boolean
  ): void {
    environments.value = environments.value.map((e) => {
      if (e.id !== envId) return e
      return {
        ...e,
        variables: e.variables.map((v, i) => (i === index ? { ...v, [field]: value } : v))
      }
    })
    persist()
  }

  function deleteVariable(envId: string, index: number): void {
    environments.value = environments.value.map((e) => {
      if (e.id !== envId) return e
      return { ...e, variables: e.variables.filter((_, i) => i !== index) }
    })
    persist()
  }

  /** 持久化到文件系统 */
  function persist(): void {
    if (!loaded) return
    saveData(STORAGE_KEY, {
      environments: environments.value,
      activeEnvId: activeEnvId.value
    })
  }

  /** 从文件系统加载环境数据 */
  async function loadFromDisk(): Promise<void> {
    await migrateFromLocalStorage(STORAGE_KEY, 'mypostman-environments')
    const data = await loadData<EnvironmentStoreData>(STORAGE_KEY, {
      environments: [],
      activeEnvId: null
    })
    if (Array.isArray(data.environments)) {
      environments.value = data.environments
    }
    activeEnvId.value = data.activeEnvId ?? null
    loaded = true
  }

  return {
    environments,
    activeEnvId,
    activeEnv,
    activeVars,
    createEnvironment,
    deleteEnvironment,
    setActive,
    addVariable,
    updateVariable,
    deleteVariable,
    loadFromDisk
  }
})
