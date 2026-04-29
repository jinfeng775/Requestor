<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'
import NetworkOverview from './NetworkOverview.vue'
import NetworkHeaders from './NetworkHeaders.vue'
import NetworkPayload from './NetworkPayload.vue'
import NetworkTiming from './NetworkTiming.vue'

const { t } = useI18n()
const response = useResponseStore()

type NetworkDetailsTab = 'overview' | 'headers' | 'payload' | 'timing'

const visible = ref(false)
const activeTab = ref<NetworkDetailsTab>('overview')

const tabs = computed<Array<{ key: NetworkDetailsTab; label: string }>>(() => [
  { key: 'overview', label: t('networkDetails.tabs.overview') },
  { key: 'headers', label: t('networkDetails.tabs.headers') },
  { key: 'payload', label: t('networkDetails.tabs.payload') },
  { key: 'timing', label: t('networkDetails.tabs.timing') }
])

const canOpen = computed(() => Boolean(response.data?.networkDetails))
const shortcutLabel = computed(() => t('networkDetails.shortcut'))

function toggleDialog(): void {
  if (!canOpen.value) return
  visible.value = !visible.value
}

function onGlobalToggle(): void {
  toggleDialog()
}

watch(canOpen, (nextCanOpen) => {
  if (!nextCanOpen) {
    visible.value = false
  }
})

onMounted(() => {
  document.addEventListener('app:toggle-network-details', onGlobalToggle)
})

onUnmounted(() => {
  document.removeEventListener('app:toggle-network-details', onGlobalToggle)
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="t('networkDetails.title')"
    width="min(1080px, 92vw)"
    top="5vh"
    destroy-on-close
    append-to-body
    class="network-details-dialog"
    @open="activeTab = 'overview'"
  >
    <template v-if="canOpen">
      <div class="network-details-dialog__toolbar">
        <div class="network-details-dialog__tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            :class="['network-details-dialog__tab', { 'network-details-dialog__tab--active': activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <span class="network-details-dialog__shortcut">{{ shortcutLabel }}</span>
      </div>

      <div class="network-details-dialog__panel">
        <NetworkOverview v-if="activeTab === 'overview'" />
        <NetworkHeaders v-else-if="activeTab === 'headers'" />
        <NetworkPayload v-else-if="activeTab === 'payload'" />
        <NetworkTiming v-else-if="activeTab === 'timing'" />
      </div>
    </template>
    <div v-else class="network-details-dialog__empty">
      {{ t('networkDetails.unavailable') }}
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.network-details-dialog__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.network-details-dialog__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.network-details-dialog__tab {
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  font-size: var(--text-sm);
}

.network-details-dialog__tab--active {
  color: var(--color-text-primary);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg-secondary));
}

.network-details-dialog__shortcut {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  white-space: nowrap;
}

.network-details-dialog__panel {
  min-height: 480px;
  max-height: 72vh;
  overflow: auto;
  padding-top: var(--space-md);
}

.network-details-dialog__empty {
  color: var(--color-text-tertiary);
  padding: var(--space-lg) 0;
}
</style>
