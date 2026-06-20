<template>
  <section class="panel advanced-options">
    <button class="options-toggle" type="button" @click="isOpen = !isOpen">
      <span>
        <SlidersHorizontal :size="18" />
        <strong>高级转换选项</strong>
      </span>
      <ChevronDown :size="18" :class="{ rotated: isOpen }" />
    </button>

    <transition name="expand">
      <div v-if="isOpen" class="options-panel">
        <div class="switch-grid">
          <label v-for="item in switches" :key="item.key" class="switch-card">
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.hint }}</small>
            </span>
            <input type="checkbox" v-model="options[item.key]" />
          </label>
        </div>

        <label class="field">
          <span>分流规则模板{{ rulePresetEnabled ? '' : '（仅 YAML 客户端）' }}</span>
          <select class="select" v-model="options.rulePreset" :disabled="!rulePresetEnabled">
            <option value="">基础兼容规则</option>
            <option v-for="preset in availablePresets" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
          </select>
        </label>

        <div class="field-grid">
          <label class="field">
            <span>保留关键词</span>
            <input class="input" v-model="options.filter" placeholder="香港|美国|高级" />
          </label>

          <label class="field">
            <span>排除关键词</span>
            <input class="input" v-model="options.exclude" placeholder="过期|流量|测试" />
          </label>
        </div>

        <label class="field">
          <span>重命名规则</span>
          <textarea class="textarea mono" v-model="options.rename" rows="3" placeholder="旧名称->新名称"></textarea>
        </label>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { ChevronDown, SlidersHorizontal } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  rulePresetEnabled: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue'])
const isOpen = ref(false)

const options = reactive({
  emoji: props.modelValue.emoji ?? true,
  udp: props.modelValue.udp ?? true,
  skipCert: props.modelValue.skipCert ?? false,
  sort: props.modelValue.sort ?? false,
  filter: props.modelValue.filter ?? '',
  exclude: props.modelValue.exclude ?? '',
  rename: props.modelValue.rename ?? '',
  rulePreset: props.modelValue.rulePreset ?? ''
})

const switches = [
  { key: 'emoji', label: '地区标识', hint: '自动给节点名称追加地区标识。' },
  { key: 'udp', label: '启用 UDP', hint: '目标客户端支持时启用 UDP 转发。' },
  { key: 'skipCert', label: '跳过证书校验', hint: '适合自签名或特殊 TLS 节点。' },
  { key: 'sort', label: '节点排序', hint: '按名称整理输出顺序。' }
]

const availablePresets = ref([])

fetch('/api/rules/presets')
  .then(res => res.json())
  .then(data => {
    // Basic is hardcoded, so remove it from fetched list if present
    availablePresets.value = data.filter(p => p.id !== 'basic')
  })
  .catch(console.error)

watch(options, value => emit('update:modelValue', { ...value }), { deep: true, immediate: true })
</script>

<style scoped>
.advanced-options {
  display: grid;
  gap: 12px;
}

.options-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 0;
  border: 0;
  color: var(--text);
  background: transparent;
  cursor: pointer;
}

.options-toggle > span {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

.options-toggle svg {
  color: var(--accent);
}

.rotated {
  transform: rotate(180deg);
}

.options-panel {
  display: grid;
  gap: 14px;
  padding-top: 6px;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 760px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
