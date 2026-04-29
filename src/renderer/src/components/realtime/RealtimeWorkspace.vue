<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRealtimeTabStore } from '@/stores/realtime-tab'
import { useRealtimeSessionStore } from '@/stores/realtime-session'
import RealtimeTabBar from './RealtimeTabBar.vue'
import RealtimeConnectionForm from './RealtimeConnectionForm.vue'
import RealtimeMessageLog from './RealtimeMessageLog.vue'

const tabStore = useRealtimeTabStore()
const sessionStore = useRealtimeSessionStore()

const activeTab = computed(() => tabStore.activeTab)
const activeSession = computed(() => (activeTab.value ? sessionStore.sessions[activeTab.value.id] : null))
const isConnected = computed(() => activeSession.value?.status === 'connected' || activeSession.value?.status === 'connecting')

function realtimeEventListener(event: import('@/types/realtime').RealtimeEventEnvelope): void {
  sessionStore.applyEvent(event)
}

onMounted(() => {
  tabStore.init()
  for (const tab of tabStore.tabs) {
    sessionStore.syncTab(tab.id, tab.config.protocol)
  }
  window.api?.onRealtimeEvent(realtimeEventListener)
})

onUnmounted(() => {
  window.api?.offRealtimeEvent(realtimeEventListener)
})
</script>

<template>
  <div class="realtime-workspace">
    <RealtimeTabBar />
    <RealtimeConnectionForm :connected="isConnected" />
    <RealtimeMessageLog />
  </div>
</template>

<style scoped>
.realtime-workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
