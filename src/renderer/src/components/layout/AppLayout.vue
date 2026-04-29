<script setup lang="ts">
import { watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppSettingsStore } from '@/stores/app-settings'
import { useSidebarStore } from '@/stores/sidebar'
import { useTabStore } from '@/stores/tab'
import { useRequestEditorStore } from '@/stores/request-editor'
import { useResponseStore } from '@/stores/response'
import { useWorkspaceStore } from '@/stores/workspace'
import TitleBar from './TitleBar.vue'
import StatusBar from './StatusBar.vue'
import TabBar from './TabBar.vue'
import Sidebar from '../sidebar/Sidebar.vue'
import ResizeHandle from '../common/ResizeHandle.vue'
import HorizontalResizeHandle from '../common/HorizontalResizeHandle.vue'
import UrlInput from '../request/UrlInput.vue'
import RequestBuilder from '../request/RequestBuilder.vue'
import ResponseViewer from '../response/ResponseViewer.vue'
import NetworkDetailsDialog from '../response/NetworkDetailsDialog.vue'
import RealtimeWorkspace from '../realtime/RealtimeWorkspace.vue'

const { t } = useI18n()
const settings = useAppSettingsStore()
const sidebarStore = useSidebarStore()
const tabStore = useTabStore()
const editor = useRequestEditorStore()
const response = useResponseStore()
const workspaceStore = useWorkspaceStore()

let previousTabId: string | null = null

function saveEditorToTab(tabId: string | null): void {
  if (!tabId || workspaceStore.isRealtime) return
  const found = tabStore.tabs.find((tb) => tb.id === tabId)
  if (found) {
    tabStore.updateTabRequest(tabId, editor.activeRequest)
  }
}

function loadTabToEditor(tabId: string | null): void {
  if (!tabId || workspaceStore.isRealtime) return
  const found = tabStore.tabs.find((tb) => tb.id === tabId)
  if (found) {
    editor.loadRequest(found.request)
    response.clear()
  }
}

watch(
  () => tabStore.activeTabId,
  (newId) => {
    if (newId !== previousTabId) {
      saveEditorToTab(previousTabId)
      loadTabToEditor(newId)
      previousTabId = newId
    }
  }
)

let syncTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => editor.activeRequest,
  () => {
    if (workspaceStore.isRealtime) return
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      if (tabStore.activeTabId) {
        tabStore.updateTabRequest(tabStore.activeTabId, editor.activeRequest)
      }
    }, 300)
  },
  { deep: true }
)

function onSidebarResize(delta: number): void {
  settings.setSidebarWidth(settings.sidebarWidth + delta)
}

function onPanelResize(delta: number): void {
  const panels = document.querySelector('.app-layout__panels') as HTMLElement | null
  if (!panels) return
  const totalHeight = panels.clientHeight
  const currentPx = settings.panelSplitPx < 0 ? totalHeight / 2 : settings.panelSplitPx
  settings.setPanelSplitPx(currentPx + delta)
}

const requestStyle = computed(() => {
  if (settings.panelSplitPx < 0) return { flex: '1 1 0' }
  return { flex: 'none', height: settings.panelSplitPx + 'px' }
})

const responseStyle = computed(() => {
  if (settings.panelSplitPx < 0) return { flex: '1 1 0' }
  return { flex: '1 1 0' }
})
</script>

<template>
  <div class="app-layout">
    <TitleBar />
    <div class="app-layout__body">
      <div
        v-show="!sidebarStore.collapsed"
        class="app-layout__sidebar"
        :style="{ width: settings.sidebarWidth + 'px' }"
      >
        <Sidebar />
      </div>
      <ResizeHandle v-show="!sidebarStore.collapsed" @resize="onSidebarResize" />
      <div class="app-layout__main">
        <template v-if="workspaceStore.isRealtime">
          <RealtimeWorkspace />
        </template>
        <template v-else>
          <TabBar />
          <UrlInput />
          <div class="app-layout__panels">
            <div class="app-layout__request" :style="requestStyle">
              <RequestBuilder />
            </div>
            <HorizontalResizeHandle @resize="onPanelResize" />
            <div class="app-layout__response" :style="responseStyle">
              <ResponseViewer />
            </div>
          </div>
        </template>
      </div>
    </div>
    <StatusBar />
    <NetworkDetailsDialog />
  </div>
</template>

<style scoped>
.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.app-layout__body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-layout__sidebar {
  flex-shrink: 0;
  overflow: hidden;
}

.app-layout__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.app-layout__panels {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-layout__request {
  flex: 1;
  min-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.app-layout__response {
  flex: 1;
  min-height: 200px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border);
}
</style>
