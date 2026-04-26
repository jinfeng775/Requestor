<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useEnvironmentStore } from '@/stores/environment'

const { t } = useI18n()
const envStore = useEnvironmentStore()

const visible = defineModel<boolean>('visible', { default: false }) // 对话框可见性(双向绑定)

/**
 * 创建新环境(使用默认名称)
 * 调用 environment store 的 createEnvironment 方法,传入国际化后的默认名称
 */
function newEnv(): void {
  envStore.createEnvironment(t('environment.newEnv'))
}
</script>

<template>
  <el-dialog v-model="visible" :title="t('environment.title')" width="700px" destroy-on-close>
    <div class="env-manager">
      <div class="env-manager__sidebar">
        <div class="env-manager__list">
          <div
            v-for="env in envStore.environments"
            :key="env.id"
            :class="['env-manager__item', { 'env-manager__item--active': envStore.activeEnvId === env.id }]"
            @click="envStore.setActive(env.id)"
          >
            <span>{{ env.name }}</span>
            <el-icon :size="12" @click.stop="envStore.deleteEnvironment(env.id)"><Close /></el-icon>
          </div>
        </div>
        <el-button size="small" @click="newEnv">+ {{ t('environment.newEnv') }}</el-button>
      </div>

      <div class="env-manager__content">
        <template v-if="envStore.activeEnv">
          <table class="env-manager__table">
            <thead>
              <tr>
                <th style="width: 30px"></th>
                <th>{{ t('environment.variable') }}</th>
                <th>{{ t('environment.initialValue') }}</th>
                <th>{{ t('environment.currentValue') }}</th>
                <th style="width: 30px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, index) in envStore.activeEnv.variables" :key="index">
                <td>
                  <el-checkbox
                    :model-value="v.enabled"
                    @change="envStore.updateVariable(envStore.activeEnvId!, index, 'enabled', !v.enabled)"
                  />
                </td>
                <td>
                  <input
                    class="env-manager__input"
                    :value="v.key"
                    :placeholder="t('environmentEditor.keyPlaceholder')"
                    @input="envStore.updateVariable(envStore.activeEnvId!, index, 'key', ($event.target as HTMLInputElement).value)"
                  />
                </td>
                <td>
                  <input
                    class="env-manager__input"
                    :value="v.initialValue"
                    :placeholder="t('environmentEditor.valuePlaceholder')"
                    @input="envStore.updateVariable(envStore.activeEnvId!, index, 'initialValue', ($event.target as HTMLInputElement).value)"
                  />
                </td>
                <td>
                  <input
                    class="env-manager__input"
                    :value="v.currentValue"
                    :placeholder="t('environmentEditor.valuePlaceholder')"
                    @input="envStore.updateVariable(envStore.activeEnvId!, index, 'currentValue', ($event.target as HTMLInputElement).value)"
                  />
                </td>
                <td>
                  <el-icon
                    :size="14"
                    style="cursor: pointer; color: var(--color-text-tertiary)"
                    @click="envStore.deleteVariable(envStore.activeEnvId!, index)"
                  >
                    <Close />
                  </el-icon>
                </td>
              </tr>
            </tbody>
          </table>
          <el-button size="small" @click="envStore.addVariable(envStore.activeEnvId!)">
            + {{ t('environment.addVariable') }}
          </el-button>
        </template>
        <div v-else class="env-manager__empty">
          {{ t('environment.noEnv') }}
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script lang="ts">
import { Close } from '@element-plus/icons-vue'
export default { components: { Close } }
</script>

<style scoped>
.env-manager {
  display: flex;
  gap: var(--space-lg);
  min-height: 300px;
}

.env-manager__sidebar {
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border-right: 1px solid var(--color-border-light);
  padding-right: var(--space-md);
}

.env-manager__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.env-manager__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: background var(--duration-fast);
}

.env-manager__item:hover { background: var(--color-bg-hover); }

.env-manager__item--active {
  background: rgba(64, 158, 255, 0.1);
  color: var(--color-accent);
}

.env-manager__content {
  flex: 1;
  overflow: auto;
}

.env-manager__table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: var(--space-sm);
}

.env-manager__table th {
  text-align: left;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.env-manager__table td {
  padding: 2px var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.env-manager__input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--text-sm);
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
  padding: var(--space-xs) 0;
}

.env-manager__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
}
</style>
