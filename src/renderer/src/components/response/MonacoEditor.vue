<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

// Configure Monaco workers
self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    return new editorWorker()
  }
}

interface Props {
  modelValue: string
  language?: string
  readonly?: boolean
  theme?: 'vs' | 'vs-dark'
  searchQuery?: string
}

const props = withDefaults(defineProps<Props>(), {
  language: 'json',
  readonly: true,
  theme: 'vs'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorContainer = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

function formatJson(value: string): string {
  try {
    const parsed = JSON.parse(value)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return value
  }
}

onMounted(() => {
  if (!editorContainer.value) return

  const formattedValue = props.language === 'json' ? formatJson(props.modelValue) : props.modelValue

  editor = monaco.editor.create(editorContainer.value, {
    value: formattedValue,
    language: props.language || 'json',
    theme: props.theme || 'vs',
    readOnly: props.readonly !== false,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,
    lineNumbers: 'on',
    folding: true,
    wordWrap: 'on',
    contextmenu: true,
    selectOnLineNumbers: true,
    renderWhitespace: 'selection',
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      vertical: 'auto',
      horizontal: 'auto'
    },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 3
  })

  editor.onDidChangeModelContent(() => {
    if (editor && !props.readonly) {
      emit('update:modelValue', editor.getValue())
    }
  })
})

watch(() => props.modelValue, (newValue) => {
  if (editor) {
    const formattedValue = props.language === 'json' ? formatJson(newValue) : newValue
    if (editor.getValue() !== formattedValue) {
      editor.setValue(formattedValue)
    }
  }
})

watch(() => props.language, (newLang) => {
  if (editor) {
    const model = editor.getModel()
    if (model) {
      monaco.editor.setModelLanguage(model, newLang || 'json')
    }
  }
})

watch(() => props.theme, (newTheme) => {
  if (editor) {
    monaco.editor.setTheme(newTheme || 'vs')
  }
})

watch(() => props.searchQuery, (query) => {
  if (editor && query) {
    nextTick(() => {
      editor?.trigger('search', 'actions.find', { searchString: query })
    })
  }
})

onBeforeUnmount(() => {
  editor?.dispose()
})

defineExpose({
  getEditor: () => editor
})
</script>

<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 100%;
}
</style>
