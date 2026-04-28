import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { loadData, saveData } from '@/utils/storage'
import type { RealtimeWorkspace } from '@/types/realtime'

const STORAGE_KEY = 'requestor-workspace'

export const useWorkspaceStore = defineStore('workspace', () => {
  const activeWorkspace = ref<RealtimeWorkspace>('http')
  let loaded = false

  const isRealtime = computed(() => activeWorkspace.value === 'realtime')

  function setWorkspace(workspace: RealtimeWorkspace): void {
    activeWorkspace.value = workspace
    persist()
  }

  function toggleWorkspace(): void {
    activeWorkspace.value = activeWorkspace.value === 'http' ? 'realtime' : 'http'
    persist()
  }

  function persist(): void {
    if (!loaded) return
    saveData(STORAGE_KEY, { activeWorkspace: activeWorkspace.value })
  }

  async function loadFromDisk(): Promise<void> {
    const data = await loadData<{ activeWorkspace?: RealtimeWorkspace }>(STORAGE_KEY, {})
    if (data.activeWorkspace === 'http' || data.activeWorkspace === 'realtime') {
      activeWorkspace.value = data.activeWorkspace
    }
    loaded = true
  }

  return {
    activeWorkspace,
    isRealtime,
    setWorkspace,
    toggleWorkspace,
    loadFromDisk
  }
})
