<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Close } from '@element-plus/icons-vue'
import { useRealtimeTabStore } from '@/stores/realtime-tab'
import { useRealtimeSessionStore } from '@/stores/realtime-session'
import { REALTIME_PROTOCOL_LABELS } from '@/types/realtime'

const { t } = useI18n()
const tabStore = useRealtimeTabStore()
const sessionStore = useRealtimeSessionStore()
const activeTab = computed(() => tabStore.activeTab)

async function closeTab(tabId: string): Promise<void> {
  const session = sessionStore.sessions[tabId]
  if (session?.sessionId) {
    await window.api.realtimeDisconnect(session.sessionId)
  }
  sessionStore.removeSession(tabId)
  tabStore.closeTab(tabId)
}
</script>

<template>
  <div class="realtime-tabbar">
    <div class="realtime-tabbar__list">
      <button
        v-for="tab in tabStore.tabs"
        :key="tab.id"
        :class="['realtime-tabbar__tab', { 'realtime-tabbar__tab--active': tab.id === tabStore.activeTabId }]"
        @click="tabStore.setActiveTab(tab.id)"
      >
        <span class="realtime-tabbar__protocol">{{ REALTIME_PROTOCOL_LABELS[tab.config.protocol] }}</span>
        <span class="realtime-tabbar__name">{{ tab.name }}</span>
        <span v-if="tab.hasUnsavedChanges" class="realtime-tabbar__dot"></span>
        <span v-if="tabStore.tabs.length > 1" class="realtime-tabbar__close" @click.stop="closeTab(tab.id)">
          <el-icon :size="12"><Close /></el-icon>
        </span>
      </button>
    </div>
    <button class="realtime-tabbar__add" :title="t('common.new')" @click="tabStore.createTab(activeTab?.config.protocol || 'websocket')">
      <el-icon :size="14"><Plus /></el-icon>
    </button>
  </div>
</template>

<style scoped>
.realtime-tabbar {
  display: flex;
  align-items: flex-end;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-light);
  height: var(--tab-height);
  padding-left: var(--space-xs);
  flex-shrink: 0;
}

.realtime-tabbar__list {
  display: flex;
  flex: 1;
  overflow-x: auto;
}

.realtime-tabbar__tab,
.realtime-tabbar__add {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.realtime-tabbar__tab {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0 var(--space-md);
  height: calc(var(--tab-height) - 1px);
  position: relative;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border-light);
}

.realtime-tabbar__tab--active {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.realtime-tabbar__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: var(--space-sm);
  right: var(--space-sm);
  height: 2px;
  background: var(--color-accent);
}

.realtime-tabbar__protocol {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-accent);
}

.realtime-tabbar__name {
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.realtime-tabbar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-warning);
}

.realtime-tabbar__close {
  display: inline-flex;
  align-items: center;
}

.realtime-tabbar__add {
  width: 32px;
  height: calc(var(--tab-height) - 2px);
}
</style>
