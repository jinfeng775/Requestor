<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppSettingsStore } from '@/stores/app-settings'
import { useTabStore } from '@/stores/tab'
import { useHistoryStore } from '@/stores/history'
import { useCollectionStore } from '@/stores/collection'
import { useTrashStore } from '@/stores/trash'
import { useItemTrashStore } from '@/stores/item-trash'
import { useEnvironmentStore } from '@/stores/environment'
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
const { startSystemListener } = useTheme()

// 注册全局快捷键
useShortcuts()

/**
 * 应用启动时的初始化流程
 * 并行加载所有持久化数据,全部完成后再初始化标签页
 */
onMounted(async () => {
  startSystemListener() // 监听系统主题变化
  // 并行加载所有持久化数据
  await Promise.all([
    settings.loadFromDisk(),
    historyStore.loadFromDisk(),
    collectionStore.loadFromDisk(),
    trashStore.loadFromDisk(),
    itemTrashStore.loadFromDisk(),
    envStore.loadFromDisk()
  ])
  tabStore.init() // 初始化空标签页
})
</script>

<template>
  <AppLayout />
</template>
