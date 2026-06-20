<template>
  <main class="page">
    <section class="page-shell stack">
      <section class="panel control-panel">
        <div class="form-grid">
          <label class="field wide">
            <span>原始地址</span>
            <input class="input mono" v-model="newUrl" placeholder="https://example.com/api/convert?target=..." />
          </label>
          <label class="field">
            <span>自定义短码（选填）</span>
            <input class="input mono" v-model="customCode" placeholder="my-profile" />
          </label>
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="button" @click="createShortLink" :disabled="!newUrl.trim() || loading">
            <Loader2 v-if="loading" :size="18" class="spin" />
            <Plus v-else :size="18" />
            <span>{{ loading ? '创建中' : '创建短链接' }}</span>
          </button>
        </div>

        <p v-if="error" class="alert alert-error">{{ error }}</p>
        <p v-if="success" class="alert alert-success">{{ success }}</p>
      </section>

      <transition name="fade">
        <section class="panel result-panel" v-if="generatedLink">
          <div class="list-header">
            <div>
              <p class="section-label">SUCCESS</p>
              <h2>短链接已生成</h2>
            </div>
            <button class="btn btn-primary compact" type="button" @click="copyLink(generatedLink)">
              <Copy :size="16" />
              <span>复制链接</span>
            </button>
          </div>
          <div class="link-row">
            <input class="input mono" type="text" :value="generatedLink" readonly />
          </div>
          <p class="alert alert-warning" style="margin-top: 10px;">
            请注意妥善保存此链接，系统不会提供任何公开的短链接列表。
          </p>
        </section>
      </transition>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { Copy, Loader2, Plus } from 'lucide-vue-next'
import { apiErrorMessage } from '../utils/apiError.js'
import { copyText } from '../utils/clipboard.js'

const newUrl = ref('')
const customCode = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const generatedLink = ref('')

const createShortLink = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  generatedLink.value = ''
  try {
    const response = await fetch('/api/shortlink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl.value.trim(), code: customCode.value.trim() || undefined })
    })
    const data = await response.json()
    if (!response.ok || data.error) throw new Error(apiErrorMessage(data, `创建失败（HTTP ${response.status}）`))
    
    generatedLink.value = data.shortUrl
    newUrl.value = ''
    customCode.value = ''
    success.value = '短链接创建成功。'
  } catch (err) {
    error.value = apiErrorMessage(err, '创建失败')
  } finally {
    loading.value = false
  }
}

const copyLink = async (url) => {
  error.value = ''
  try {
    await copyText(url)
    success.value = '已复制到剪贴板。'
  } catch {
    error.value = '复制失败，请手动复制链接。'
  }
}
</script>

<style scoped>
.short-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.short-hero > svg {
  flex: 0 0 auto;
  color: var(--accent);
}

.control-panel,
.result-panel {
  display: grid;
  gap: 15px;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 12px;
}

.auth-field {
  margin-top: -3px;
}

.actions,
.row-actions,
.list-header,
.link-row,
.link-meta {
  display: flex;
  gap: 10px;
}

.actions,
.list-header,
.link-row {
  align-items: center;
}

.list-header,
.link-row {
  justify-content: space-between;
}

.list-header h2 {
  margin: 0;
  color: var(--text);
}

.list-header > span {
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 900;
}

.link-list {
  display: grid;
  gap: 10px;
}

.link-row {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--overlay);
}

.link-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.link-main strong,
.link-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-main strong {
  color: var(--text);
}

.link-main span,
.link-meta,
.empty-state {
  color: var(--text-muted);
}

.link-meta {
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  font-family: var(--mono);
  font-size: 0.78rem;
}

.row-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--text-soft);
  background: var(--overlay);
  cursor: pointer;
}

.row-actions button:hover {
  border-color: var(--line-strong);
  color: var(--accent);
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 180px;
}

.empty-state svg {
  color: var(--accent);
}

@media (max-width: 820px) {
  .form-grid,
  .link-row,
  .short-hero {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .link-meta {
    align-items: flex-start;
  }
}
</style>
