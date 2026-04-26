<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme, useLanguage } from '@/composables/useTheme'
import { useSidebarStore } from '@/stores/sidebar'
import { Sunny, Moon, Setting, Expand, Fold, Search } from '@element-plus/icons-vue'
import SettingsModal from '../settings/SettingsModal.vue'
import GlobalSearch from '../common/GlobalSearch.vue'

const { t } = useI18n()
const { isDark, toggle: toggleTheme } = useTheme()
const { toggleLanguage, language } = useLanguage()
const sidebarStore = useSidebarStore()
const showSettings = ref(false) // 是否显示设置对话框
const showSearch = ref(false) // 是否显示全局搜索对话框

/**
 * 全局键盘事件监听器
 * Ctrl/Cmd + K 打开全局搜索
 * @param e 键盘事件对象
 */
function onKeydown(e: KeyboardEvent): void {
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.key === 'k') {
    e.preventDefault()
    showSearch.value = true
  }
}

// 组件挂载时添加全局键盘监听,卸载时移除(防止内存泄漏)
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="titlebar">
    <div class="titlebar__drag-region">
      <button
        class="titlebar__sidebar-toggle"
        :title="t('titlebar.settings')"
        @click="sidebarStore.toggle()"
      >
        <el-icon :size="14">
          <Fold v-if="!sidebarStore.collapsed" />
          <Expand v-else />
        </el-icon>
      </button>
      <span class="titlebar__title">{{ t('app.name') }}</span>
    </div>
    <div class="titlebar__actions">
      <button
        class="titlebar__btn"
        :title="t('globalSearch.title') + ' (Ctrl+K)'"
        @click="showSearch = true"
      >
        <el-icon :size="14"><Search /></el-icon>
      </button>
      <button
        class="titlebar__btn"
        :title="isDark ? t('settings.light') : t('settings.dark')"
        @click="toggleTheme"
      >
        <el-icon :size="14">
          <Moon v-if="!isDark" />
          <Sunny v-else />
        </el-icon>
      </button>
      <button class="titlebar__btn titlebar__btn--lang" @click="toggleLanguage">
        {{ language === 'zh-CN' ? 'EN' : '中' }}
      </button>
      <button class="titlebar__btn" :title="t('titlebar.settings')" @click="showSettings = true">
        <el-icon :size="14"><Setting /></el-icon>
      </button>
    </div>

    <SettingsModal v-model:visible="showSettings" />
    <GlobalSearch v-model:visible="showSearch" />
  </div>
</template>

<style scoped>
.titlebar {
  height: var(--titlebar-height);
  background: var(--color-bg-titlebar);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-md);
  user-select: none;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.titlebar__drag-region {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.titlebar__sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.titlebar__sidebar-toggle:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.titlebar__title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  letter-spacing: 0.3px;
}

.titlebar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  -webkit-app-region: no-drag;
}

.titlebar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.titlebar__btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.titlebar__btn--lang {
  width: auto;
  padding: 0 var(--space-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
}
</style>
