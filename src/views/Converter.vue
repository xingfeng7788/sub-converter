<template>
  <div class="converter-page">
    <section class="workspace">
      <aside class="status-rail">
        <div class="brand-mark">
          <Network :size="28" />
        </div>
        <div class="rail-item active">
          <span>01</span>
          <strong>来源</strong>
        </div>
        <div class="rail-item" :class="{ active: selectedClient }">
          <span>02</span>
          <strong>客户端</strong>
        </div>
        <div class="rail-item" :class="{ active: convertedUrl }">
          <span>03</span>
          <strong>导入</strong>
        </div>
      </aside>

      <main class="console">
        <header class="console-header">
          <div>
            <p class="eyebrow">订阅转换</p>
            <h1>生成可直接导入的客户端配置</h1>
            <p class="subtitle">粘贴订阅地址，选择目标客户端，生成稳定的转换订阅链接，也可以继续下载配置或生成二维码。</p>
          </div>
          <div class="health-pill">
            <span></span>
            本地服务可用
          </div>
        </header>

        <section class="input-panel">
          <label class="source-field">
            <span>订阅地址</span>
            <textarea
              v-model="subscriptionUrl"
              placeholder="https://example.com/subscription?token=..."
              rows="5"
            ></textarea>
          </label>

          <div class="api-strip">
            <button
              v-for="api in apiSources"
              :key="api.id"
              :class="{ active: selectedApi === api.id }"
              @click="selectedApi = api.id"
              :title="api.desc"
            >
              <Server :size="16" />
              <span>{{ api.name }}</span>
            </button>
          </div>
        </section>

        <ClientSelector v-model="selectedClient" />
        <AdvancedOptions
          :model-value="advancedOptions"
          @update:model-value="updateAdvancedOptions"
        />

        <section class="action-bar">
          <button class="primary-action" @click="convertSubscription" :disabled="!canConvert || loading">
            <Loader2 v-if="loading" :size="18" class="spin" />
            <RefreshCw v-else :size="18" />
            <span>{{ loading ? '生成中' : '生成订阅链接' }}</span>
          </button>
          <button class="secondary-action" @click="resetForm">
            <RotateCcw :size="18" />
            <span>重置</span>
          </button>
        </section>

        <ResultPanel v-if="convertedUrl" :result="convertedUrl" />
        <p v-if="error" class="error-message">{{ error }}</p>
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Loader2, Network, RefreshCw, RotateCcw, Server } from 'lucide-vue-next'
import ClientSelector from '../components/ClientSelector.vue'
import AdvancedOptions from '../components/AdvancedOptions.vue'
import ResultPanel from '../components/ResultPanel.vue'

const subscriptionUrl = ref('')
const selectedClient = ref('clashmeta')
const selectedApi = ref('local')
const loading = ref(false)
const convertedUrl = ref('')
const error = ref('')

const apiSources = [
  { id: 'local', name: '本地服务', desc: '使用当前项目后端', url: '' },
  { id: 'v1mk', name: 'v1.mk', desc: '第三方转换 API', url: 'https://api.v1.mk' },
  { id: 'xeton', name: 'xeton.dev', desc: '第三方转换 API', url: 'https://sub.xeton.dev' },
  { id: 'dler', name: 'dler.io', desc: '第三方转换 API', url: 'https://api.dler.io' }
]

const advancedOptions = reactive({
  emoji: true,
  udp: true,
  skipCert: false,
  sort: false,
  filter: '',
  exclude: '',
  rename: '',
  rulePreset: 'standard'
})

const currentApi = computed(() => apiSources.find(api => api.id === selectedApi.value) || apiSources[0])
const canConvert = computed(() => subscriptionUrl.value.trim() && selectedClient.value)

const updateAdvancedOptions = value => {
  Object.assign(advancedOptions, value || {})
}

const convertSubscription = async () => {
  if (!canConvert.value) return
  loading.value = true
  error.value = ''
  convertedUrl.value = ''

  try {
    const apiBaseUrl = selectedApi.value === 'local' ? window.location.origin : currentApi.value.url
    const params = new URLSearchParams({
      target: selectedClient.value,
      url: subscriptionUrl.value.trim(),
      emoji: advancedOptions.emoji ? '1' : '0',
      udp: advancedOptions.udp ? '1' : '0',
      scert: advancedOptions.skipCert ? '1' : '0',
      sort: advancedOptions.sort ? '1' : '0'
    })

    if (advancedOptions.filter) params.append('include', advancedOptions.filter)
    if (advancedOptions.exclude) params.append('exclude', advancedOptions.exclude)
    if (advancedOptions.rename) params.append('rename', advancedOptions.rename)
    if (advancedOptions.rulePreset) params.append('rulePreset', advancedOptions.rulePreset)

    convertedUrl.value = selectedApi.value === 'local'
      ? `${apiBaseUrl}/api/convert?${params.toString()}`
      : `${apiBaseUrl}/sub?${params.toString()}`
  } catch (err) {
    error.value = err.message || '转换失败'
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  subscriptionUrl.value = ''
  selectedClient.value = 'clashmeta'
  selectedApi.value = 'local'
  convertedUrl.value = ''
  error.value = ''
  Object.assign(advancedOptions, {
    emoji: true,
    udp: true,
    skipCert: false,
    sort: false,
    filter: '',
    exclude: '',
    rename: '',
    rulePreset: 'standard'
  })
}
</script>

<style scoped>
.converter-page {
  min-height: 100vh;
  padding: 118px 24px 48px;
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.12), transparent 34%),
    linear-gradient(225deg, rgba(99, 102, 241, 0.14), transparent 40%),
    #020617;
}

.workspace {
  display: grid;
  grid-template-columns: 96px minmax(0, 1080px);
  gap: 20px;
  width: min(1200px, 100%);
  margin: 0 auto;
}

.status-rail {
  display: grid;
  align-content: start;
  gap: 12px;
}

.brand-mark,
.rail-item {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.74);
}

.brand-mark {
  display: grid;
  place-items: center;
  height: 72px;
  color: #67e8f9;
}

.rail-item {
  padding: 14px 12px;
  color: #64748b;
}

.rail-item.active {
  border-color: rgba(34, 211, 238, 0.58);
  color: #f8fafc;
  background: rgba(8, 47, 73, 0.68);
}

.rail-item span,
.rail-item strong {
  display: block;
}

.rail-item span {
  font-size: 0.74rem;
  font-weight: 800;
}

.rail-item strong {
  margin-top: 4px;
  font-size: 0.9rem;
}

.console {
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.78);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
}

.console-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.eyebrow {
  margin-bottom: 8px;
  color: #22d3ee;
  font-size: 0.86rem;
  font-weight: 900;
}

h1 {
  max-width: 720px;
  color: #f8fafc;
  font-size: clamp(2rem, 3.8vw, 3.45rem);
  line-height: 1.12;
  letter-spacing: 0;
}

.subtitle {
  max-width: 760px;
  margin-top: 14px;
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.8;
}

.health-pill {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 9px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(34, 197, 94, 0.28);
  border-radius: 8px;
  color: #bbf7d0;
  background: rgba(22, 101, 52, 0.18);
  font-size: 0.86rem;
  font-weight: 800;
  white-space: nowrap;
}

.health-pill span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

.input-panel {
  display: grid;
  gap: 14px;
}

.source-field {
  display: grid;
  gap: 8px;
}

.source-field span {
  color: #f8fafc;
  font-size: 0.9rem;
  font-weight: 900;
}

textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  color: #f8fafc;
  background: rgba(2, 6, 23, 0.78);
  font: 0.95rem/1.6 var(--font-mono);
  resize: vertical;
}

textarea:focus {
  outline: none;
  border-color: #22d3ee;
}

.api-strip,
.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.api-strip button,
.primary-action,
.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 15px;
  border-radius: 8px;
  font: inherit;
  font-size: 0.94rem;
  font-weight: 900;
  cursor: pointer;
}

.api-strip button,
.secondary-action {
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.64);
}

.api-strip button.active {
  border-color: #22d3ee;
  color: #ffffff;
  background: rgba(8, 145, 178, 0.22);
}

.action-bar {
  padding-top: 4px;
}

.primary-action {
  border: 0;
  color: #03131a;
  background: #67e8f9;
}

.primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.secondary-action:hover {
  border-color: #22d3ee;
  color: #ffffff;
}

.error-message {
  padding: 12px;
  border: 1px solid rgba(251, 113, 133, 0.3);
  border-radius: 8px;
  color: #fecdd3;
  background: rgba(127, 29, 29, 0.25);
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 820px) {
  .converter-page {
    padding: 100px 14px 32px;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .status-rail {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .console {
    padding: 16px;
  }

  .console-header {
    flex-direction: column;
  }
}
</style>
