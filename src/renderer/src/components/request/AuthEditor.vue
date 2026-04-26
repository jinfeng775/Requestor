<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import type { AuthType } from '@/types/request'

const { t } = useI18n()
const editor = useRequestEditorStore()

/** 支持的认证类型列表(用于下拉选择) */
const authTypes: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'request.authType.none' },
  { value: 'bearer', label: 'request.authType.bearer' },
  { value: 'basic', label: 'request.authType.basic' },
  { value: 'apikey', label: 'request.authType.apikey' }
]

/**
 * 设置认证类型并初始化对应的认证配置对象
 * 根据选择的类型创建不同的 auth 结构(bearer/basic/apikey)
 * @param val 选中的认证类型字符串
 */
function setAuthType(val: string): void {
  const authType = val as AuthType
  let auth = null
  if (authType === 'bearer') auth = { token: '' }
  else if (authType === 'basic') auth = { username: '', password: '' }
  else if (authType === 'apikey') auth = { key: '', value: '', addTo: 'header' as const }
  editor.updateRequest({ authType, auth })
}

/**
 * 更新认证配置中的某个字段
 * 使用不可变更新确保 Vue 响应式检测
 * @param field 要更新的字段名
 * @param value 新的字段值
 */
function updateAuthField(field: string, value: string): void {
  if (!editor.activeRequest.auth) return
  editor.updateRequest({
    auth: { ...editor.activeRequest.auth, [field]: value }
  })
}
</script>

<template>
  <div class="auth-editor">
    <div class="auth-editor__type">
      <el-select
        :model-value="editor.activeRequest.authType"
        style="width: 200px"
        @change="setAuthType"
      >
        <el-option v-for="at in authTypes" :key="at.value" :value="at.value" :label="t(at.label)" />
      </el-select>
    </div>

    <div v-if="editor.activeRequest.authType === 'bearer'" class="auth-editor__fields">
      <label class="auth-editor__label">{{ t('request.token') }}</label>
      <input
        class="auth-editor__input"
        :value="(editor.activeRequest.auth as any)?.token ?? ''"
        :placeholder="t('auth.enterToken')"
        @input="updateAuthField('token', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div v-else-if="editor.activeRequest.authType === 'basic'" class="auth-editor__fields">
      <label class="auth-editor__label">{{ t('request.username') }}</label>
      <input
        class="auth-editor__input"
        :value="(editor.activeRequest.auth as any)?.username ?? ''"
        :placeholder="t('request.username')"
        @input="updateAuthField('username', ($event.target as HTMLInputElement).value)"
      />
      <label class="auth-editor__label">{{ t('request.password') }}</label>
      <input
        class="auth-editor__input"
        type="password"
        :value="(editor.activeRequest.auth as any)?.password ?? ''"
        :placeholder="t('request.password')"
        @input="updateAuthField('password', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div v-else-if="editor.activeRequest.authType === 'apikey'" class="auth-editor__fields">
      <label class="auth-editor__label">{{ t('request.key') }}</label>
      <input
        class="auth-editor__input"
        :value="(editor.activeRequest.auth as any)?.key ?? ''"
        :placeholder="t('auth.headerQueryName')"
        @input="updateAuthField('key', ($event.target as HTMLInputElement).value)"
      />
      <label class="auth-editor__label">{{ t('request.value') }}</label>
      <input
        class="auth-editor__input"
        :value="(editor.activeRequest.auth as any)?.value ?? ''"
        :placeholder="t('auth.apiKeyValue')"
        @input="updateAuthField('value', ($event.target as HTMLInputElement).value)"
      />
      <label class="auth-editor__label">{{ t('auth.addTo') }}</label>
      <el-select
        :model-value="(editor.activeRequest.auth as any)?.addTo ?? 'header'"
        style="width: 160px"
        @change="(v: string) => updateAuthField('addTo', v)"
      >
        <el-option value="header" :label="t('auth.header')" />
        <el-option value="query" :label="t('auth.queryParam')" />
      </el-select>
    </div>

    <div v-else class="auth-editor__empty">
      <p>{{ t('request.authType.none') }}</p>
    </div>
  </div>
</template>

<style scoped>
.auth-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
}

.auth-editor__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.auth-editor__label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.auth-editor__input {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-sm);
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  outline: none;
  transition: border-color var(--duration-fast);
}

.auth-editor__input:focus {
  border-color: var(--color-accent);
}

.auth-editor__empty {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  padding: var(--space-xl);
  text-align: center;
}
</style>
