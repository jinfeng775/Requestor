<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import { Document } from '@element-plus/icons-vue'

const { t } = useI18n()
const editor = useRequestEditorStore()

/**
 * 选择二进制文件(打开文件对话框)
 * 使用 Electron API 获取文件路径,并更新请求配置
 */
async function selectFile(): Promise<void> {
  const filePath = await window.api.openFile()
  if (filePath) {
    editor.updateRequest({ binaryFilePath: filePath })
  }
}

/** 清除已选择的文件,将路径置为空字符串 */
function clearFile(): void {
  editor.updateRequest({ binaryFilePath: '' })
}

/**
 * 从完整文件路径中提取文件名
 * 支持 Windows(\)和 Unix(/)两种路径分隔符
 * @param path 完整文件路径
 * @returns 文件名(如 "image.png")
 */
function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path
}
</script>

<template>
  <div class="binary-picker">
    <div v-if="editor.activeRequest.binaryFilePath" class="binary-picker__file">
      <el-icon :size="16"><Document /></el-icon>
      <span class="binary-picker__name">{{ getFileName(editor.activeRequest.binaryFilePath) }}</span>
      <span class="binary-picker__path">{{ editor.activeRequest.binaryFilePath }}</span>
      <button class="binary-picker__clear" @click="clearFile">×</button>
    </div>
    <button v-else class="binary-picker__select" @click="selectFile">
      {{ t('request.selectFile') }}
    </button>
  </div>
</template>

<style scoped>
.binary-picker {
  padding: var(--space-md) 0;
}

.binary-picker__file {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}

.binary-picker__name {
  font-weight: var(--font-weight-medium);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.binary-picker__path {
  flex: 1;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.binary-picker__clear {
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--text-lg);
  cursor: pointer;
  padding: 0 4px;
}

.binary-picker__clear:hover { color: var(--color-danger); }

.binary-picker__select {
  border: 1px dashed var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  padding: var(--space-xl);
  width: 100%;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
}

.binary-picker__select:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
