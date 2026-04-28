<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import { insertScriptSnippet } from '@/utils/script-snippet'

const { t } = useI18n()
const editor = useRequestEditorStore()
const preTextareaRef = ref<HTMLTextAreaElement>()
const postTextareaRef = ref<HTMLTextAreaElement>()

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

const preRequestSnippets = [
  {
    key: 'setEnv',
    code: `pw.env.set('variable', 'value')`
  },
  {
    key: 'setTimestamp',
    code: `const currentTime = Date.now()\npw.env.set('timestamp', currentTime.toString())`
  },
  {
    key: 'setRandomNumber',
    code: `const min = 1\nconst max = 1000\nconst randomArbitrary = Math.random() * (max - min) + min\npw.env.set('randomNumber', randomArbitrary.toString())`
  },
  {
    key: 'setHeader',
    code: `pw.request.headers.set('Authorization', 'Bearer {{token}}')`
  },
  {
    key: 'setQueryParam',
    code: `pw.request.params.set('traceId', Date.now().toString())`
  }
]

const postRequestSnippets = [
  {
    key: 'saveJsonField',
    code: `const data = pw.response.body.json()\npw.env.set('token', String(data.token ?? ''))`
  },
  {
    key: 'saveStatusCode',
    code: `pw.env.set('statusCode', pw.response.status.toString())`
  },
  {
    key: 'saveHeader',
    code: `const requestId = pw.response.headers.get('x-request-id')\nif (requestId) pw.env.set('requestId', requestId)`
  },
  {
    key: 'logResponse',
    code: `pw.console.log('status', pw.response.status, pw.response.statusText)`
  }
]

function setScriptValue(phase: 'pre' | 'post', value: string): void {
  if (phase === 'pre') {
    preRequestScript.value = value
    return
  }
  postRequestScript.value = value
}

function insertSnippet(phase: 'pre' | 'post', code: string): void {
  const textarea = phase === 'pre' ? preTextareaRef.value : postTextareaRef.value
  const currentValue = phase === 'pre' ? preRequestScript.value : postRequestScript.value
  const selectionStart = textarea?.selectionStart ?? currentValue.length
  const selectionEnd = textarea?.selectionEnd ?? currentValue.length

  const insertionResult = insertScriptSnippet({
    currentValue,
    snippetCode: code,
    selectionStart,
    selectionEnd
  })

  setScriptValue(phase, insertionResult.nextValue)

  requestAnimationFrame(() => {
    const target = phase === 'pre' ? preTextareaRef.value : postTextareaRef.value
    if (!target) return
    target.focus()
    target.setSelectionRange(insertionResult.cursorPosition, insertionResult.cursorPosition)
  })
}
</script>

<template>
  <div class="scripts-editor">
    <section class="scripts-editor__section">
      <div class="scripts-editor__header">
        <h3>{{ t('scripts.preRequest') }}</h3>
        <p>{{ t('scripts.preRequestHelp') }}</p>
      </div>
      <div class="scripts-editor__snippets">
        <span class="scripts-editor__snippets-label">{{ t('scripts.snippets.quickInsert') }}</span>
        <div class="scripts-editor__snippet-list">
          <button
            v-for="snippet in preRequestSnippets"
            :key="`pre-${snippet.key}`"
            type="button"
            class="scripts-editor__snippet"
            @click="insertSnippet('pre', snippet.code)"
          >
            {{ t(`scripts.snippets.items.${snippet.key}`) }}
          </button>
        </div>
      </div>
      <textarea
        ref="preTextareaRef"
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
      <div class="scripts-editor__snippets">
        <span class="scripts-editor__snippets-label">{{ t('scripts.snippets.quickInsert') }}</span>
        <div class="scripts-editor__snippet-list">
          <button
            v-for="snippet in postRequestSnippets"
            :key="`post-${snippet.key}`"
            type="button"
            class="scripts-editor__snippet"
            @click="insertSnippet('post', snippet.code)"
          >
            {{ t(`scripts.snippets.items.${snippet.key}`) }}
          </button>
        </div>
      </div>
      <textarea
        ref="postTextareaRef"
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

.scripts-editor__snippets {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.scripts-editor__snippets-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: 24px;
}

.scripts-editor__snippet-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.scripts-editor__snippet {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  line-height: 20px;
  cursor: pointer;
}

.scripts-editor__snippet:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
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
