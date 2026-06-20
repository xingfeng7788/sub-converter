<template>
  <main class="page">
    <section class="page-shell stack">
      <header class="hero-surface merge-hero">
        <div>
          <p class="section-label">MERGE ENGINE</p>
          <h1 class="title-xl">把多个订阅整理成一份干净配置</h1>
          <p class="subtitle">
            批量拉取多个订阅，合并去重、过滤重命名、追加地区标识，并按目标客户端直接导出。
          </p>
        </div>
        <GitMerge :size="34" />
      </header>

      <section class="panel control-panel">
        <label class="field">
          <span>订阅地址列表</span>
          <textarea class="textarea mono" v-model="urlsContent" rows="7" placeholder="https://example.com/sub1&#10;https://example.com/sub2"></textarea>
        </label>

        <div class="settings-grid">
          <label class="field">
            <span>目标客户端</span>
            <select class="select" v-model="target">
              <option v-for="client in targets" :key="client.id" :value="client.id">{{ client.name }}</option>
            </select>
          </label>

          <label class="field">
            <span>规则模板{{ supportsRulePreset ? '' : '（仅 YAML 客户端）' }}</span>
            <select class="select" v-model="options.rulePreset" :disabled="!supportsRulePreset">
              <option value="">基础兼容规则</option>
              <option v-for="preset in availablePresets" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
            </select>
          </label>

          <label class="field">
            <span>保留关键词</span>
            <input class="input" v-model="options.include" placeholder="香港|美国|高级" />
          </label>

          <label class="field">
            <span>排除关键词</span>
            <input class="input" v-model="options.exclude" placeholder="过期|流量|测试" />
          </label>
        </div>

        <label class="field">
          <span>重命名规则</span>
          <textarea class="textarea mono small" v-model="options.rename" rows="3" placeholder="旧名称->新名称"></textarea>
        </label>

        <div class="switch-grid">
          <label class="switch-card">
            <span><strong>去重</strong><small>按协议、服务器和端口去除重复节点。</small></span>
            <input type="checkbox" v-model="options.dedupe" />
          </label>
          <label class="switch-card">
            <span><strong>地区标识</strong><small>给节点名称追加地区标识。</small></span>
            <input type="checkbox" v-model="options.emoji" />
          </label>
          <label class="switch-card">
            <span><strong>排序</strong><small>按名称整理输出顺序。</small></span>
            <input type="checkbox" v-model="options.sort" />
          </label>
          <label class="switch-card">
            <span><strong>启用 UDP</strong><small>目标客户端支持时启用 UDP。</small></span>
            <input type="checkbox" v-model="options.udp" />
          </label>
          <label class="switch-card">
            <span><strong>跳过证书校验</strong><small>适合自签名或特殊节点。</small></span>
            <input type="checkbox" v-model="options.skipCert" />
          </label>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" type="button" @click="previewMerge" :disabled="loading || !urls.length">
            <Eye :size="18" />
            <span>{{ loading ? '处理中' : '预览节点' }}</span>
          </button>
          <button class="btn btn-primary" type="button" @click="downloadMerge" :disabled="loading || !urls.length">
            <Download :size="18" />
            <span>合并并下载</span>
          </button>
        </div>

        <p v-if="error" class="alert alert-error">{{ error }}</p>
      </section>

      <section v-if="previewResult" class="panel result-panel">
        <div class="result-heading">
          <div>
            <p class="section-label">PREVIEW</p>
            <h2>节点预览</h2>
          </div>
          <span>{{ urls.length }} 个订阅源</span>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span>总节点</span>
            <strong>{{ previewResult.total }}</strong>
          </div>
          <div v-for="(count, type) in previewResult.byType" :key="type" class="summary-card">
            <span>{{ type }}</span>
            <strong>{{ count }}</strong>
          </div>
        </div>

        <div class="preview-list">
          <article v-for="node in previewResult.nodes" :key="`${node.type}-${node.server}-${node.port}-${node.name}`">
            <div>
              <strong>{{ node.name }}</strong>
              <small>{{ node.type.toUpperCase() }}</small>
            </div>
            <span>{{ node.server }}:{{ node.port }}</span>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Download, Eye, GitMerge } from 'lucide-vue-next'
import { TARGET_DEFINITIONS, getTargetDefinition } from '../../shared/targets.js'
import { apiErrorMessage } from '../utils/apiError.js'

const urlsContent = ref('')
const target = ref('clashmeta')
const loading = ref(false)
const error = ref('')
const previewResult = ref(null)
const options = reactive({
  dedupe: true,
  emoji: true,
  sort: false,
  udp: true,
  skipCert: false,
  include: '',
  exclude: '',
  rename: '',
  rulePreset: 'standard'
})

const targets = TARGET_DEFINITIONS.map(client => ({
  id: client.id,
  name: `${client.name} ${client.extension.toUpperCase()}`
}))

const urls = computed(() => urlsContent.value
  .split('\n')
  .map(url => url.trim())
  .filter(url => /^https?:\/\//i.test(url)))
const supportsRulePreset = computed(() => getTargetDefinition(target.value)?.format === 'yaml')

const availablePresets = ref([])

fetch('/api/rules/presets')
  .then(res => res.json())
  .then(data => {
    // Basic is hardcoded, so remove it from fetched list if present
    availablePresets.value = data.filter(p => p.id !== 'basic')
  })
  .catch(console.error)

const previewMerge = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/merge/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: urls.value, dedupe: options.dedupe })
    })
    const data = await response.json()
    if (!response.ok || data.error) throw new Error(apiErrorMessage(data, `预览失败（HTTP ${response.status}）`))
    previewResult.value = data
  } catch (err) {
    error.value = apiErrorMessage(err, '预览失败')
  } finally {
    loading.value = false
  }
}

const downloadMerge = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: urls.value,
        target: target.value,
        ...options,
        rulePreset: supportsRulePreset.value ? options.rulePreset : ''
      })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(apiErrorMessage(text, `合并失败（HTTP ${response.status}）`))
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `merged-${target.value}.${extensionFor(target.value)}`
    a.click()
    URL.revokeObjectURL(objectUrl)
  } catch (err) {
    error.value = apiErrorMessage(err, '合并失败')
  } finally {
    loading.value = false
  }
}

const extensionFor = (client) => {
  return getTargetDefinition(client)?.extension || 'txt'
}
</script>

<style scoped>
.merge-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.merge-hero > svg {
  flex: 0 0 auto;
  color: var(--accent);
}

.control-panel,
.result-panel {
  display: grid;
  gap: 15px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.textarea.small {
  min-height: 92px;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.result-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.result-heading h2 {
  margin: 0;
  color: var(--text);
}

.result-heading > span {
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: 0.78rem;
  font-weight: 900;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.summary-card {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.035);
}

.summary-card span {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 900;
}

.summary-card strong {
  display: block;
  margin-top: 5px;
  color: var(--text);
  font-size: 1.55rem;
  line-height: 1;
}

.preview-list {
  display: grid;
  gap: 9px;
  max-height: 390px;
  overflow: auto;
}

.preview-list article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.03);
}

.preview-list strong,
.preview-list small {
  display: block;
}

.preview-list strong {
  color: var(--text);
}

.preview-list small,
.preview-list span {
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: 0.82rem;
}

@media (max-width: 980px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .merge-hero,
  .result-heading {
    flex-direction: column;
  }

  .settings-grid,
  .preview-list article {
    grid-template-columns: 1fr;
  }
}
</style>
