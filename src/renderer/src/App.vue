<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppSettingsStore } from '@/stores/app-settings'
import { useTabStore } from '@/stores/tab'
import { useHistoryStore } from '@/stores/history'
import { useCollectionStore } from '@/stores/collection'
import { useTrashStore } from '@/stores/trash'
import { useItemTrashStore } from '@/stores/item-trash'
import { useEnvironmentStore } from '@/stores/environment'
import { useRealtimeTabStore } from '@/stores/realtime-tab'
import { useWorkspaceStore } from '@/stores/workspace'
import { useShortcuts } from '@/composables/useShortcuts'
import { useTheme } from '@/composables/useTheme'
import AppLayout from '@/components/layout/AppLayout.vue'

const settings = useAppSettingsStore()
const tabStore = useTabStore()
const historyStore = useHistoryStore()
const collectionStore = useCollectionStore()
const trashStore = useTrashStore()
const itemTrashStore = useItemTrashStore()
const envStore = useEnvironmentStore()
const realtimeTabStore = useRealtimeTabStore()
const workspaceStore = useWorkspaceStore()
const { startSystemListener } = useTheme()

useShortcuts()

onMounted(async () => {
  startSystemListener()
  await Promise.all([
    settings.loadFromDisk(),
    historyStore.loadFromDisk(),
    collectionStore.loadFromDisk(),
    trashStore.loadFromDisk(),
    itemTrashStore.loadFromDisk(),
    envStore.loadFromDisk(),
    workspaceStore.loadFromDisk()
  ])
  tabStore.init()
  realtimeTabStore.init()
})
</script>

<template>
  <AppLayout />
</template>
