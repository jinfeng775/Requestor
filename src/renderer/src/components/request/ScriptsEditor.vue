<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'

const { t } = useI18n()
const editor = useRequestEditorStore()

const preRequestScript = computed({
  get: () => editor.activeRequest.scripts.preRequest,
  set: (value: string) => {
    editor.updateRequest({
      scripts: {
        ...editor.activeRequest.scripts,
        preRequest: value,
        trusted: false
      }
    })
  }
})

const postRequestScript = computed({
  get: () => editor.activeRequest.scripts.postRequest,
  set: (value: string) => {
    editor.updateRequest({
      scripts: {
        ...editor.activeRequest.scripts,
        postRequest: value,
        trusted: false
      }
    })
  }
})
</script>

<template>
  <div class="scripts-editor">
    <section class="scripts-editor__section">
      <div class="scripts-editor__header">
        <h3>{{ t('scripts.preRequest') }}</h3>
        <p>{{ t('scripts.preRequestHelp') }}</p>
      </div>
      <textarea
        v-model="preRequestScript"
        class="scripts-editor__textarea"
        spellcheck="false"
        placeholder="pw.env.set('token', 'abc')"
      />
    </section>

    <section class="scripts-editor__section">
      <div class="scripts-editor__header">
        <h3>{{ t('scripts.postRequest') }}</h3>
        <p>{{ t('scripts.postRequestHelp') }}</p>
      </div>
      <textarea
        v-model="postRequestScript"
        class="scripts-editor__textarea"
        spellcheck="false"
        placeholder="const data = pw.response.body.json()"
      />
    </section>
  </div>
</template>

<style scoped>
.scripts-editor {
  display: grid;
  gap: var(--space-md);
}

.scripts-editor__section {
  display: grid;
  gap: var(--space-xs);
}

.scripts-editor__header h3 {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.scripts-editor__header p {
  margin: 4px 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.scripts-editor__textarea {
  min-height: 140px;
  resize: vertical;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.5;
  outline: none;
}

.scripts-editor__textarea:focus {
  border-color: var(--color-accent);
}
</style>
