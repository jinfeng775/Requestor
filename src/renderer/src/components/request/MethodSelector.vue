<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { HttpMethod } from '@/types/request'

/** Props 定义:当前选中的 HTTP 方法 */
const props = defineProps<{ modelValue: HttpMethod }>()
/** Emits 定义:更新选中值的事件 */
const emit = defineEmits<{ 'update:modelValue': [value: HttpMethod] }>()

const { t } = useI18n()

/** 支持的 HTTP 方法列表 */
const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

/**
 * 根据 HTTP 方法返回对应的 CSS 类名(用于颜色区分)
 * @param method HTTP 方法名
 * @returns CSS 类名(如 "method-tag--get")
 */
function getMethodClass(method: string): string {
  return `method-tag method-tag--${method.toLowerCase()}`
}

/**
 * 处理选择变化事件,向父组件发送新值
 * @param val 选中的方法字符串
 */
function onChange(val: string): void {
  emit('update:modelValue', val as HttpMethod)
}
</script>

<template>
  <el-select
    :model-value="props.modelValue"
    size="default"
    class="method-selector"
    @change="onChange"
  >
    <el-option
      v-for="m in methods"
      :key="m"
      :value="m"
      :label="m"
    >
      <span :class="getMethodClass(m)">{{ m }}</span>
    </el-option>
    <template #prefix>
      <span :class="getMethodClass(props.modelValue)">{{ props.modelValue }}</span>
    </template>
  </el-select>
</template>

<style scoped>
.method-selector {
  width: 180px;
  flex-shrink: 0;
}

.method-selector :deep(.el-input__wrapper) {
  border-radius: var(--radius-md) !important;
  box-shadow: 0 0 0 1px var(--color-border) inset !important;
  transition: box-shadow var(--duration-fast) var(--ease-out) !important;
}

.method-selector :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-text-tertiary) inset !important;
}

.method-selector :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12), 0 0 0 1px var(--color-accent) inset !important;
}

.method-tag {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-mono);
  letter-spacing: 0.3px;
}

.method-tag--get {
  color: var(--color-method-get);
}
.method-tag--post {
  color: var(--color-method-post);
}
.method-tag--put {
  color: var(--color-method-put);
}
.method-tag--delete {
  color: var(--color-method-delete);
}
.method-tag--patch {
  color: var(--color-method-patch);
}
.method-tag--head {
  color: var(--color-method-head);
}
.method-tag--options {
  color: var(--color-method-options);
}
</style>
