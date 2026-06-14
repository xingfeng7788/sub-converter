<template>
  <main class="tool-page">
    <section class="tool-shell">
      <header class="hero-panel">
        <div>
          <p class="eyebrow">节点健康检测</p>
          <h1>先检测可用性，再导出在线节点</h1>
          <p class="subtitle">从当前服务器检测节点连通性和延迟，过滤失效节点，并导出目标客户端可用的在线配置。</p>
        </div>
        <div class="hero-icon">
          <HeartPulse :size="30" />
        </div>
      </header>

      <section class="control-panel">
        <div class="mode-tabs">
          <button :class="{ active: sourceMode === 'url' }" @click="sourceMode = 'url'">订阅地址</button>
          <button :class="{ active: sourceMode === 'content' }" @click="sourceMode = 'content'">原始节点</button>
        </div>

        <label class="field">
          <span>{{ sourceMode === 'url' ? '订阅地址' : '节点内容' }}</span>
          <textarea
            v-model="sourceInput"
            :rows="sourceMode === 'url' ? 3 : 7"
            :placeholder="sourceMode === 'url' ? 'https://example.com/subscription?token=...' : 'ss://...\\nvmess://...\\nclash/sing-box 配置...'"
          ></textarea>
        </label>

        <div class="settings-grid">
          <label class="field">
            <span>导出格式</span>
            <select v-model="exportTarget">
              <option value="v2rayn">V2RayN / 分享链接</option>
              <option value="v2rayng">V2RayNG / 分享链接</option>
              <option value="shadowrocket">Shadowrocket 分享链接</option>
              <option value="clash">Clash YAML</option>
              <option value="clashmeta">Clash Meta YAML</option>
              <option value="mihomo">Mihomo YAML</option>
              <option value="stash">Stash YAML</option>
              <option value="singbox">sing-box JSON</option>
              <option value="hiddify">Hiddify JSON</option>
              <option value="nekobox">NekoBox JSON</option>
              <option value="surge">Surge CONF</option>
              <option value="loon">Loon CONF</option>
            </select>
          </label>

          <label class="field">
            <span>超时时间</span>
            <select v-model.number="timeout">
              <option :value="3000">3 秒</option>
              <option :value="5000">5 秒</option>
              <option :value="8000">8 秒</option>
            </select>
          </label>

          <label class="field">
            <span>并发数量</span>
            <select v-model.number="concurrent">
              <option :value="5">5 个</option>
              <option :value="10">10 个</option>
              <option :value="20">20 个</option>
            </select>
          </label>
        </div>

        <div class="actions">
          <button class="primary" @click="startCheck" :disabled="loading || !sourceInput.trim()">
            <Loader2 v-if="loading" :size="18" class="spin" />
            <Activity v-else :size="18" />
            <span>{{ loading ? '检测中' : '开始检测' }}</span>
          </button>
          <button class="secondary" @click="exportOnlineNodes" :disabled="!exportConfig">
            <Download :size="18" />
            <span>导出在线节点</span>
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </section>

      <section v-if="results.length" class="result-panel">
        <div class="summary-grid">
          <div class="summary-card">
            <span>总节点</span>
            <strong>{{ summary.total }}</strong>
          </div>
          <div class="summary-card online">
            <span>在线</span>
            <strong>{{ summary.online }}</strong>
          </div>
          <div class="summary-card offline">
            <span>离线</span>
            <strong>{{ summary.offline }}</strong>
          </div>
          <div class="summary-card">
            <span>平均延迟</span>
            <strong>{{ summary.avgLatency }}ms</strong>
          </div>
        </div>

        <div class="filter-bar">
          <button v-for="item in filters" :key="item.id" :class="{ active: currentFilter === item.id }" @click="currentFilter = item.id">
            {{ item.label }}
          </button>
        </div>

        <div class="node-list">
          <article v-for="node in filteredResults" :key="`${node.type}-${node.server}-${node.port}-${node.name}`" class="node-row" :class="node.status">
            <span class="status-dot"></span>
            <div>
              <strong>{{ node.name }}</strong>
              <small>{{ node.type.toUpperCase() }} · {{ node.server }}:{{ node.port }}</small>
            </div>
            <span class="latency" :class="latencyClass(node.latency)">
              {{ node.status === 'online' ? `${node.latency}ms` : node.error || '离线' }}
            </span>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Activity, Download, HeartPulse, Loader2 } from 'lucide-vue-next'

const sourceMode = ref('url')
const sourceInput = ref('')
const exportTarget = ref('v2rayn')
const timeout = ref(5000)
const concurrent = ref(10)
const loading = ref(false)
const error = ref('')
const results = ref([])
const summary = ref({ total: 0, online: 0, offline: 0, avgLatency: 0 })
const exportConfig = ref('')
const exportFileName = ref('online-nodes.txt')
const currentFilter = ref('all')

const filters = [
  { id: 'all', label: '全部' },
  { id: 'online', label: '在线' },
  { id: 'offline', label: '离线' }
]

const filteredResults = computed(() => {
  if (currentFilter.value === 'all') return results.value
  return results.value.filter(node => node.status === currentFilter.value)
})

const startCheck = async () => {
  loading.value = true
  error.value = ''
  results.value = []
  exportConfig.value = ''

  try {
    const payload = {
      timeout: timeout.value,
      concurrent: concurrent.value,
      exportTarget: exportTarget.value,
      ...(sourceMode.value === 'url' ? { url: sourceInput.value.trim() } : { content: sourceInput.value })
    }

    const response = await fetch('/api/health/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`)

    results.value = data.nodes || []
    summary.value = data.summary || summary.value
    exportConfig.value = data.exportConfig || ''
    exportFileName.value = data.exportFileName || exportFileName.value
  } catch (err) {
    error.value = err.message || '健康检测失败'
  } finally {
    loading.value = false
  }
}

const exportOnlineNodes = () => {
  if (!exportConfig.value) return
  const blob = new Blob([exportConfig.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName.value
  a.click()
  URL.revokeObjectURL(url)
}

const latencyClass = (latency) => {
  if (latency < 0) return 'bad'
  if (latency < 100) return 'good'
  if (latency < 300) return 'ok'
  return 'bad'
}
</script>

<style scoped>
.tool-page {
  min-height: 100vh;
  padding: 118px 24px 56px;
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.12), transparent 34%),
    linear-gradient(225deg, rgba(99, 102, 241, 0.14), transparent 42%),
    #020617;
}

.tool-shell {
  display: grid;
  gap: 18px;
  width: min(1120px, 100%);
  margin: 0 auto;
}

.hero-panel,
.control-panel,
.result-panel {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.78);
}

.hero-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: clamp(26px, 4vw, 40px);
}

.eyebrow {
  color: #22d3ee;
  font-size: 0.86rem;
  font-weight: 900;
}

h1 {
  max-width: 760px;
  margin-top: 10px;
  color: #f8fafc;
  font-size: clamp(2rem, 3.8vw, 3.45rem);
  line-height: 1.12;
}

.subtitle {
  max-width: 700px;
  margin-top: 14px;
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.8;
}

.hero-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 70px;
  height: 70px;
  border: 1px solid rgba(34, 211, 238, 0.36);
  border-radius: 8px;
  color: #67e8f9;
  background: rgba(8, 47, 73, 0.5);
}

.control-panel,
.result-panel {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.mode-tabs,
.filter-bar,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mode-tabs button,
.filter-bar button,
.secondary,
.primary {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 0.94rem;
  font-weight: 900;
  cursor: pointer;
}

.mode-tabs button,
.filter-bar button,
.secondary {
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.64);
}

.mode-tabs button.active,
.filter-bar button.active,
.secondary:hover {
  border-color: #22d3ee;
  color: #ffffff;
}

.primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  color: #03131a;
  background: #67e8f9;
}

.primary:disabled,
.secondary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: #cbd5e1;
  font-size: 0.88rem;
  font-weight: 900;
}

textarea,
select {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  color: #f8fafc;
  background: rgba(2, 6, 23, 0.72);
  font: inherit;
}

textarea {
  padding: 14px;
  font-family: var(--font-mono);
  resize: vertical;
}

select {
  min-height: 44px;
  padding: 0 12px;
}

.settings-grid,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-card {
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.4);
}

.summary-card span {
  color: #94a3b8;
  font-size: 0.84rem;
  font-weight: 800;
}

.summary-card strong {
  display: block;
  margin-top: 6px;
  color: #f8fafc;
  font-size: 1.65rem;
}

.summary-card.online strong {
  color: #86efac;
}

.summary-card.offline strong {
  color: #fda4af;
}

.node-list {
  display: grid;
  gap: 10px;
}

.node-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.36);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f43f5e;
}

.node-row.online .status-dot {
  background: #22c55e;
}

.node-row strong,
.node-row small {
  display: block;
}

.node-row strong {
  color: #f8fafc;
}

.node-row small {
  margin-top: 3px;
  color: #94a3b8;
}

.latency {
  font-weight: 900;
}

.latency.good {
  color: #86efac;
}

.latency.ok {
  color: #fde68a;
}

.latency.bad {
  color: #fda4af;
}

.error {
  color: #fecdd3;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 760px) {
  .tool-page {
    padding: 100px 14px 36px;
  }

  .hero-panel,
  .node-row {
    align-items: stretch;
    grid-template-columns: 1fr;
  }

  .settings-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
