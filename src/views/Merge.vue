<template>
  <main class="tool-page">
    <section class="tool-shell">
      <header class="hero-panel">
        <div>
          <p class="eyebrow">订阅合并</p>
          <h1>把多个订阅整理成一个干净配置</h1>
          <p class="subtitle">批量拉取多个订阅地址，合并、去重、预览节点分布，并按目标客户端直接导出。</p>
        </div>
        <GitMerge :size="32" class="hero-mark" />
      </header>

      <section class="control-panel">
        <label class="field">
          <span>订阅地址列表</span>
          <textarea v-model="urlsContent" rows="7" placeholder="https://example.com/sub1&#10;https://example.com/sub2"></textarea>
        </label>

        <div class="settings-grid">
          <label class="field">
            <span>目标客户端</span>
            <select v-model="target">
              <option value="clash">Clash</option>
              <option value="clashmeta">Clash Meta</option>
              <option value="mihomo">Mihomo</option>
              <option value="stash">Stash</option>
              <option value="singbox">sing-box</option>
              <option value="hiddify">Hiddify</option>
              <option value="nekobox">NekoBox</option>
              <option value="surge">Surge</option>
              <option value="surfboard">Surfboard</option>
              <option value="quantumultx">Quantumult X</option>
              <option value="loon">Loon</option>
              <option value="shadowrocket">Shadowrocket</option>
              <option value="v2rayn">V2RayN</option>
              <option value="v2rayng">V2RayNG</option>
            </select>
          </label>

          <label class="switch-row">
            <span><strong>去重</strong><small>移除重复服务器和协议组合</small></span>
            <input type="checkbox" v-model="options.dedupe" />
          </label>
          <label class="switch-row">
            <span><strong>地区标识</strong><small>为节点名称追加地区标记</small></span>
            <input type="checkbox" v-model="options.emoji" />
          </label>
          <label class="switch-row">
            <span><strong>排序</strong><small>按名称整理输出顺序</small></span>
            <input type="checkbox" v-model="options.sort" />
          </label>
        </div>

        <div class="actions">
          <button class="secondary" @click="previewMerge" :disabled="loading || !urls.length">
            <Eye :size="18" />
            <span>{{ loading ? '处理中' : '预览节点' }}</span>
          </button>
          <button class="primary" @click="downloadMerge" :disabled="loading || !urls.length">
            <Download :size="18" />
            <span>合并并下载</span>
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </section>

      <section v-if="previewResult" class="result-panel">
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
            <strong>{{ node.name }}</strong>
            <span>{{ node.type.toUpperCase() }} · {{ node.server }}:{{ node.port }}</span>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Download, Eye, GitMerge } from 'lucide-vue-next'

const urlsContent = ref('')
const target = ref('clashmeta')
const loading = ref(false)
const error = ref('')
const previewResult = ref(null)
const options = ref({ dedupe: true, emoji: true, sort: false })

const urls = computed(() => urlsContent.value.split('\n').map(url => url.trim()).filter(url => /^https?:\/\//i.test(url)))

const previewMerge = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/merge/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: urls.value, dedupe: options.value.dedupe })
    })
    const data = await response.json()
    if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`)
    previewResult.value = data
  } catch (err) {
    error.value = err.message || '预览失败'
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
      body: JSON.stringify({ urls: urls.value, target: target.value, ...options.value })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `merged-${target.value}.${extensionFor(target.value)}`
    a.click()
    URL.revokeObjectURL(objectUrl)
  } catch (err) {
    error.value = err.message || '合并失败'
  } finally {
    loading.value = false
  }
}

const extensionFor = (client) => {
  if (['singbox', 'sing-box', 'nekobox', 'hiddify', 'sfa', 'sfi', 'sfm'].includes(client)) return 'json'
  if (['clash', 'clashmeta', 'mihomo', 'stash', 'clashverge', 'clash-verge', 'clashnyanpasu', 'clash-nyanpasu', 'flclash'].includes(client)) return 'yaml'
  if (['surge', 'loon', 'surfboard'].includes(client)) return 'conf'
  return 'txt'
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
  justify-content: space-between;
  gap: 20px;
  padding: clamp(26px, 4vw, 40px);
}

.hero-mark {
  flex: 0 0 auto;
  color: #67e8f9;
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
  max-width: 720px;
  margin-top: 14px;
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.8;
}

.control-panel,
.result-panel {
  display: grid;
  gap: 16px;
  padding: 20px;
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
  grid-template-columns: minmax(190px, 1.2fr) repeat(3, minmax(170px, 1fr));
  gap: 12px;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.switch-row,
.summary-card,
.preview-list article {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.4);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 72px;
  padding: 12px;
}

.switch-row strong,
.switch-row small {
  display: block;
}

.switch-row strong {
  color: #f8fafc;
  font-size: 0.92rem;
}

.switch-row small {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 0.78rem;
  line-height: 1.4;
}

.switch-row input {
  flex: 0 0 auto;
  width: 42px;
  height: 24px;
  appearance: none;
  border-radius: 999px;
  background: #334155;
  cursor: pointer;
  position: relative;
}

.switch-row input::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.18s ease;
}

.switch-row input:checked {
  background: #0891b2;
}

.switch-row input:checked::after {
  transform: translateX(18px);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary,
.secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 0.94rem;
  font-weight: 900;
  cursor: pointer;
}

.primary {
  border: 0;
  color: #03131a;
  background: #67e8f9;
}

.secondary {
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.64);
}

.primary:disabled,
.secondary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.summary-card {
  padding: 16px;
}

.summary-card span {
  color: #94a3b8;
  font-size: 0.84rem;
}

.summary-card strong {
  display: block;
  margin-top: 6px;
  color: #f8fafc;
  font-size: 1.65rem;
}

.preview-list {
  display: grid;
  gap: 10px;
  max-height: 360px;
  overflow: auto;
}

.preview-list article {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 12px;
}

.preview-list strong {
  color: #f8fafc;
}

.preview-list span {
  color: #94a3b8;
  white-space: nowrap;
}

.error {
  color: #fecdd3;
}

@media (max-width: 900px) {
  .tool-page {
    padding: 100px 14px 36px;
  }

  .settings-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel,
  .preview-list article {
    flex-direction: column;
  }
}
</style>
