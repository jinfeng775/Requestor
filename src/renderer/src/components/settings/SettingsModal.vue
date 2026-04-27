<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme, useLanguage } from '@/composables/useTheme'

/** 设置对话框组件 - 管理主题、语言等应用设置 */

const { t } = useI18n()
const { theme, setTheme } = useTheme()
const { language, setLanguage } = useLanguage()

const savedTheme = ref(localStorage.getItem('requestor-theme') || theme.value) // 从 localStorage 读取保存的主题

const visible = defineModel<boolean>('visible', { default: false })

/**
 * 主题切换处理函数
 * @param v 选中的主题值('light' | 'dark' | 'auto')
 */
function onThemeChange(v: string | number | boolean | undefined): void {
  const nextTheme = String(v) as 'light' | 'dark' | 'auto'
  setTheme(nextTheme)
  savedTheme.value = nextTheme
}

/**
 * 语言切换处理函数
 * @param v 选中的语言代码('zh-CN' | 'en-US')
 */
function onLanguageChange(v: string | number | boolean | undefined): void {
  setLanguage(String(v) as 'zh-CN' | 'en-US')
}
</script>

<template>
  <el-dialog v-model="visible" :title="t('settings.title')" width="480px" destroy-on-close>
    <div class="settings">
      <div class="settings__section">
        <h4 class="settings__label">{{ t('settings.theme') }}</h4>
        <el-radio-group :model-value="savedTheme" @change="onThemeChange">
          <el-radio value="auto">{{ t('settings.auto') }}</el-radio>
          <el-radio value="light">{{ t('settings.light') }}</el-radio>
          <el-radio value="dark">{{ t('settings.dark') }}</el-radio>
        </el-radio-group>
      </div>

      <div class="settings__section">
        <h4 class="settings__label">{{ t('settings.language') }}</h4>
        <el-radio-group :model-value="language" @change="onLanguageChange">
          <el-radio value="zh-CN">中文</el-radio>
          <el-radio value="en-US">English</el-radio>
        </el-radio-group>
      </div>

      <div class="settings__section">
        <h4 class="settings__label">{{ t('settings.about') }}</h4>
        <p class="settings__about">{{ t('app.name') }} v1.0.0</p>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.settings__label {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.settings__about {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
