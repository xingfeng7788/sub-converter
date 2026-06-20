<template>
  <main class="page">
    <section class="page-shell stack">
      <section class="panel control-panel">
        <div class="mode-tabs">
          <button type="button" :class="{ active: sourceMode === 'url' }" @click="sourceMode = 'url'">订阅地址</button>
          <button type="button" :class="{ active: sourceMode === 'content' }" @click="sourceMode = 'content'">原始节点</button>
        </div>

        <label class="field">
          <span>{{ sourceMode === 'url' ? '订阅地址' : '节点内容' }}</span>
          <textarea
            class="textarea mono"
            v-model="sourceInput"
            :rows="sourceMode === 'url' ? 3 : 7"
            :placeholder="sourceMode === 'url' ? 'https://example.com/subscription?token=...' : 'ss://...\\nvmess://...\\nclash/sing-box 配置...'"
          ></textarea>
        </label>

        <div class="settings-grid">
          <label class="field">
            <span>导出格式</span>
            <select class="select" v-model="exportTarget">
              <option v-for="client in exportTargets" :key="client.id" :value="client.id">{{ client.name }}</option>
            </select>
          </label>

          <label class="field">
            <span>超时时间</span>
            <select class="select" v-model.number="timeout">
              <option :value="3000">3 秒</option>
              <option :value="5000">5 秒</option>
              <option :value="8000">8 秒</option>
            </select>
          </label>

          <label class="field">
            <span>并发数量</span>
            <select class="select" v-model.number="concurrent">
              <option :value="5">5 个</option>
              <option :value="10">10 个</option>
              <option :value="20">20 个</option>
            </select>
          </label>
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="button" @click="startCheck" :disabled="loading || !sourceInput.trim()">
            <Loader2 v-if="loading" :size="18" class="spin" />
            <Activity v-else :size="18" />
            <span>{{ loading ? '检测中' : '开始检测' }}</span>
          </button>
          <button class="btn btn-secondary" type="button" @click="exportOnlineNodes" :disabled="!exportConfig">
            <Download :size="18" />
            <span>导出在线节点</span>
          </button>
        </div>

        <p v-if="error" class="alert alert-error">{{ error }}</p>
      </section>

      <section v-if="results.length" class="panel result-panel">
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
          <button v-for="item in filters" :key="item.id" type="button" :class="{ active: currentFilter === item.id }" @click="currentFilter = item.id">
            {{ item.label }}
          </button>
        </div>

        <div class="node-list">
          <article v-for="node in filteredResults" :key="`${node.type}-${node.server}-${node.port}-${node.name}`" class="node-row" :class="node.status">
            <span class="status-dot"></span>
            <div class="node-main">
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
import { TARGET_DEFINITIONS } from '../../shared/targets.js'
import { apiErrorMessage } from '../utils/apiError.js'

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

const exportTargets = TARGET_DEFINITIONS.map(client => ({
  id: client.id,
  name: `${client.name} / ${client.extension.toUpperCase()}`
}))

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
    if (!response.ok || data.error) throw new Error(apiErrorMessage(data, `检测失败（HTTP ${response.status}）`))

    results.value = data.nodes || []
    summary.value = data.summary || summary.value
    exportConfig.value = data.exportConfig || ''
    exportFileName.value = data.exportFileName || exportFileName.value
  } catch (err) {
    error.value = apiErrorMessage(err, '健康检测失败')
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
.health-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.health-hero > svg {
  flex: 0 0 auto;
  color: var(--accent);
}

.control-panel,
.result-panel {
  display: grid;
  gap: 15px;
}

.mode-tabs,
.filter-bar,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mode-tabs button,
.filter-bar button {
  min-height: 40px;
  padding: 0 13px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--text-soft);
  background: var(--overlay);
  cursor: pointer;
  font-weight: 900;
}

.mode-tabs button.active,
.filter-bar button.active,
.mode-tabs button:hover,
.filter-bar button:hover {
  border-color: var(--line-strong);
  color: var(--accent);
  background: var(--overlay-hover);
}

.settings-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.summary-card {
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--overlay);
}

.summary-card span {
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 900;
}

.summary-card strong {
  display: block;
  margin-top: 6px;
  color: var(--text);
  font-size: 1.55rem;
  line-height: 1;
}

.summary-card.online strong {
  color: var(--accent-2);
}

.summary-card.offline strong {
  color: var(--danger);
}

.node-list {
  display: grid;
  gap: 9px;
}

.node-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--overlay);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 14px var(--danger);
}

.node-row.online .status-dot {
  background: var(--success);
  box-shadow: 0 0 14px var(--success);
}

.node-main {
  min-width: 0;
}

.node-main strong,
.node-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-main strong {
  color: var(--text);
}

.node-main small {
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: 0.82rem;
}

.latency {
  color: var(--text-soft);
  font-weight: 900;
  white-space: nowrap;
}

.latency.good {
  color: var(--accent-2);
}

.latency.ok {
  color: var(--warning);
}

.latency.bad {
  color: var(--danger);
}

@media (max-width: 760px) {
  .health-hero,
  .node-row {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .settings-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
