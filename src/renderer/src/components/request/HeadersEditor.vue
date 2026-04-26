<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import KeyValueEditor from '@/components/common/KeyValueEditor.vue'

/** HTTP 请求头编辑器组件 - 封装 KeyValueEditor 用于编辑请求头 */

const { t } = useI18n()
const editor = useRequestEditorStore()
</script>

<template>
  <KeyValueEditor
    :model-value="editor.activeRequest.headers"
    :show-description="true"
    :add-label="t('request.addRow')"
    @update:model-value="(v) => editor.updateRequest({ headers: v })"
  />
</template>
