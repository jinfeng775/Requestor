<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import type { BodyType, RawBodyFormat } from '@/types/request'
import KeyValueEditor from '@/components/common/KeyValueEditor.vue'
import BodyFormEditor from './BodyFormEditor.vue'
import BodyBinaryPicker from './BodyBinaryPicker.vue'

const { t } = useI18n()
const editor = useRequestEditorStore()

/** 支持的请求体类型列表 */
const bodyTypes: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'request.bodyType.none' },
  { value: 'form-data', label: 'request.bodyType.formdata' },
  { value: 'x-www-form-urlencoded', label: 'request.bodyType.urlencoded' },
  { value: 'raw', label: 'request.bodyType.raw' },
  { value: 'binary', label: 'request.bodyType.binary' }
]

/** Raw 格式支持的内容类型 */
const rawFormats: { value: RawBodyFormat; label: string }[] = [
  { value: 'json', label: 'request.rawType.json' },
  { value: 'text', label: 'request.rawType.text' },
  { value: 'xml', label: 'request.rawType.xml' },
  { value: 'html', label: 'request.rawType.html' }
]

/**
 * 设置请求体类型
 * @param val 选中的请求体类型字符串
 */
function setBodyType(val: string): void {
  editor.updateRequest({ bodyType: val as BodyType })
}

function setRawFormat(val: string): void {
  editor.updateRequest({ rawBodyFormat: val as RawBodyFormat })
}

function onRawInput(e: Event): void {
  editor.updateRequest({ rawBody: (e.target as HTMLTextAreaElement).value })
}
</script>

<template>
  <div class="body-editor">
    <div class="body-editor__type-selector">
      <el-radio-group :model-value="editor.activeRequest.bodyType" size="small" @change="setBodyType">
        <el-radio-button v-for="bt in bodyTypes" :key="bt.value" :value="bt.value">
          {{ t(bt.label) }}
        </el-radio-button>
      </el-radio-group>

      <el-select
        v-if="editor.activeRequest.bodyType === 'raw'"
        :model-value="editor.activeRequest.rawBodyFormat"
        size="small"
        style="width: 100px; margin-left: 8px"
        @change="setRawFormat"
      >
        <el-option v-for="rf in rawFormats" :key="rf.value" :value="rf.value" :label="t(rf.label)" />
      </el-select>
    </div>

    <div class="body-editor__content">
      <template v-if="editor.activeRequest.bodyType === 'none'">
        <p class="body-editor__empty">This request does not have a body</p>
      </template>

      <template v-else-if="editor.activeRequest.bodyType === 'raw'">
        <textarea
          class="body-editor__raw"
          :value="editor.activeRequest.rawBody"
          placeholder='{ "key": "value" }'
          spellcheck="false"
          @input="onRawInput"
        ></textarea>
      </template>

      <template v-else-if="editor.activeRequest.bodyType === 'x-www-form-urlencoded'">
        <KeyValueEditor
          :model-value="editor.activeRequest.urlEncodedData"
          @update:model-value="(v) => editor.updateRequest({ urlEncodedData: v })"
        />
      </template>

      <template v-else-if="editor.activeRequest.bodyType === 'form-data'">
        <BodyFormEditor />
      </template>

      <template v-else-if="editor.activeRequest.bodyType === 'binary'">
        <BodyBinaryPicker />
      </template>
    </div>
  </div>
</template>

<style scoped>
.body-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
}

.body-editor__type-selector {
  display: flex;
  align-items: center;
}

.body-editor__content {
  flex: 1;
}

.body-editor__empty {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  padding: var(--space-xl);
  text-align: center;
}

.body-editor__raw {
  width: 100%;
  min-height: 160px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  resize: vertical;
  outline: none;
  transition: border-color var(--duration-fast);
}

.body-editor__raw:focus {
  border-color: var(--color-accent);
}

.body-editor__raw::placeholder {
  color: var(--color-text-placeholder);
}
</style>
