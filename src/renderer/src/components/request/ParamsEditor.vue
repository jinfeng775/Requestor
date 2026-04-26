<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import KeyValueEditor from '@/components/common/KeyValueEditor.vue'

/** URL 查询参数编辑器组件 - 封装 KeyValueEditor 用于编辑请求参数 */

const { t } = useI18n()
const editor = useRequestEditorStore()
</script>

<template>
  <KeyValueEditor
    :model-value="editor.activeRequest.params"
    :show-description="true"
    :add-label="t('request.addRow')"
    @update:model-value="(v) => editor.updateRequest({ params: v })"
  />
</template>
