<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FolderOpened, Clock, Delete } from '@element-plus/icons-vue'
import CollectionTree from './CollectionTree.vue'
import HistoryList from './HistoryList.vue'
import TrashList from './TrashList.vue'

const { t } = useI18n()
/** 当前激活的侧边栏标签页(collections/history/trash) */
const activeTab = ref<'collections' | 'history' | 'trash'>('collections')
</script>

<template>
  <div class="sidebar">
    <div class="sidebar__tabs">
      <button
        :class="['sidebar__tab', { 'sidebar__tab--active': activeTab === 'collections' }]"
        @click="activeTab = 'collections'"
      >
        <el-icon :size="14"><FolderOpened /></el-icon>
        {{ t('sidebar.collections') }}
      </button>
      <button
        :class="['sidebar__tab', { 'sidebar__tab--active': activeTab === 'history' }]"
        @click="activeTab = 'history'"
      >
        <el-icon :size="14"><Clock /></el-icon>
        {{ t('sidebar.history') }}
      </button>
      <button
        :class="['sidebar__tab', { 'sidebar__tab--active': activeTab === 'trash' }]"
        @click="activeTab = 'trash'"
      >
        <el-icon :size="14"><Delete /></el-icon>
        {{ t('sidebar.trash') }}
      </button>
    </div>

    <div class="sidebar__content">
      <CollectionTree v-if="activeTab === 'collections'" />
      <HistoryList v-else-if="activeTab === 'history'" />
      <TrashList v-else />
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-sidebar);
  border-right: 1px solid var(--color-border-light);
  overflow: hidden;
}

.sidebar__tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.sidebar__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  height: var(--tab-height);
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  position: relative;
  transition: color var(--duration-fast) var(--ease-out);
}

.sidebar__tab:hover {
  color: var(--color-text-secondary);
}

.sidebar__tab--active {
  color: var(--color-text-primary);
}

.sidebar__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--color-accent);
  border-radius: 2px 2px 0 0;
  animation: tab-indicator 0.25s var(--ease-spring);
}

@keyframes tab-indicator {
  from { transform: scaleX(0); opacity: 0; }
  to { transform: scaleX(1); opacity: 1; }
}

.sidebar__content {
  flex: 1;
  overflow-y: auto;
}
</style>
