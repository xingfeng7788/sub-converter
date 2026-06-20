<template>
  <section class="panel result-panel" v-if="result">
    <div class="result-head">
      <div>
        <p class="section-label">OUTPUT READY</p>
        <h2>已生成可导入订阅</h2>
      </div>
      <div class="result-actions">
        <button class="icon-button" type="button" @click="copyLink" :title="copied ? '已复制' : '复制链接'">
          <Check v-if="copied" :size="18" />
          <Copy v-else :size="18" />
        </button>
        <button class="icon-button" type="button" @click="downloadConfig" title="下载配置" :disabled="downloading">
          <Loader2 v-if="downloading" :size="18" class="spin" />
          <Download v-else :size="18" />
        </button>
        <button class="icon-button" type="button" @click="toggleQR" title="显示二维码" :disabled="qrLoading">
          <Loader2 v-if="qrLoading" :size="18" class="spin" />
          <QrCode v-else :size="18" />
        </button>
      </div>
    </div>

    <div class="result-url">
      <input class="input mono" type="text" :value="result" readonly ref="urlInput" />
    </div>

    <div v-if="shortLinkLoading || shortLink" class="shortlink-box">
      <p class="section-label">短链接</p>
      <div class="result-url">
        <Loader2 v-if="shortLinkLoading" :size="18" class="spin loader-icon" />
        <input class="input mono" :class="{ 'pl-36': shortLinkLoading }" type="text" :value="shortLink || '正在生成短链接...'" readonly ref="shortUrlInput" />
        <button v-if="shortLink" class="icon-button compact-copy" type="button" @click="copyShortLink" :title="shortCopied ? '已复制' : '复制短链接'">
          <Check v-if="shortCopied" :size="16" />
          <Copy v-else :size="16" />
        </button>
      </div>
    </div>

    <p v-if="error" class="alert alert-error">{{ error }}</p>

    <transition name="fade">
      <div v-if="showQR" class="qr-panel">
        <div class="qr-header">
          <div>
            <p class="section-label">SCAN IMPORT</p>
            <h3>{{ clientLabel }} 二维码</h3>
          </div>
          <span>{{ qrItems.length }} 项</span>
        </div>

        <div class="qr-tabs" v-if="qrItems.length > 1">
          <button
            v-for="(item, index) in qrItems"
            :key="item.id"
            type="button"
            :class="{ active: activeQrIndex === index }"
            @click="activeQrIndex = index"
          >
            {{ item.shortTitle }}
          </button>
        </div>

        <div class="qr-card" v-if="activeQrItem">
          <canvas ref="qrCanvas"></canvas>
          <div class="qr-meta">
            <strong>{{ activeQrItem.title }}</strong>
            <p>{{ activeQrItem.description }}</p>
            <button class="copy-qr-value" type="button" @click="copyQrValue">
              <Copy :size="15" />
              <span>{{ qrValueCopied ? '已复制' : '复制二维码内容' }}</span>
            </button>
          </div>
        </div>

        <p v-if="qrMessage" class="qr-note">{{ qrMessage }}</p>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { Check, Copy, Download, Loader2, QrCode } from 'lucide-vue-next'
import { getTargetDefinition, normalizeTargetId } from '../../shared/targets.js'

const props = defineProps({
  result: {
    type: String,
    default: ''
  }
})

const copied = ref(false)
const shortCopied = ref(false)
const downloading = ref(false)
const showQR = ref(false)
const qrLoading = ref(false)
const qrValueCopied = ref(false)
const error = ref('')
const qrMessage = ref('')
const qrItems = ref([])
const activeQrIndex = ref(0)
const urlInput = ref(null)
const shortUrlInput = ref(null)
const qrCanvas = ref(null)

const shortLink = ref('')
const shortLinkLoading = ref(false)

const SHARE_LINK_TARGETS = new Set(['shadowrocket', 'v2rayn', 'v2rayng', 'v2rayu'])

const target = computed(() => {
  try {
    return normalizeTargetId(new URL(props.result).searchParams.get('target')) || 'config'
  } catch {
    return 'config'
  }
})

const clientLabel = computed(() => getTargetDefinition(target.value)?.name || target.value)
const activeQrItem = computed(() => qrItems.value[activeQrIndex.value])

const copyLink = async () => {
  await copyText(props.result, urlInput)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1800)
}

const copyShortLink = async () => {
  await copyText(shortLink.value, shortUrlInput)
  shortCopied.value = true
  setTimeout(() => {
    shortCopied.value = false
  }, 1800)
}

const copyQrValue = async () => {
  if (!activeQrItem.value) return
  await copyText(activeQrItem.value.value, null)
  qrValueCopied.value = true
  setTimeout(() => {
    qrValueCopied.value = false
  }, 1600)
}

const copyText = async (text, inputRef) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    if (inputRef && inputRef.value) {
      inputRef.value.select()
      document.execCommand('copy')
    }
  }
}

const downloadConfig = async () => {
  error.value = ''
  downloading.value = true
  try {
    const response = await fetch(props.result)
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `HTTP ${response.status}`)
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `${target.value}-config.${extensionFor(target.value)}`
    a.click()
    URL.revokeObjectURL(objectUrl)
  } catch (err) {
    error.value = err.message || '下载失败'
  } finally {
    downloading.value = false
  }
}

const extensionFor = (client) => {
  return getTargetDefinition(client)?.extension || 'txt'
}

const toggleQR = async () => {
  showQR.value = !showQR.value
  if (showQR.value) {
    await prepareQrItems()
    await renderActiveQr()
  }
}

const prepareQrItems = async () => {
  qrLoading.value = true
  qrMessage.value = ''
  activeQrIndex.value = 0
  qrItems.value = [{
    id: 'subscription',
    shortTitle: '订阅',
    title: `${clientLabel.value} 订阅导入`,
    description: '适合支持扫描订阅地址的客户端，移动端导入最稳定。',
    value: props.result
  }]

  try {
    if (SHARE_LINK_TARGETS.has(target.value)) {
      const response = await fetch(props.result)
      if (!response.ok) throw new Error(`加载转换结果失败：HTTP ${response.status}`)
      const encoded = await response.text()
      const links = decodeBase64Lines(encoded)
      qrItems.value.push(...links.map((link, index) => ({
        id: `node-${index + 1}`,
        shortTitle: `节点 ${index + 1}`,
        title: nodeTitle(link, index),
        description: '单节点分享链接二维码，适合支持直接扫码导入节点的客户端。',
        value: link
      })))
      if (!links.length) {
        qrMessage.value = '当前输出没有解析到单节点分享链接。'
      }
    } else {
      qrMessage.value = '该客户端推荐扫描订阅地址二维码；完整 YAML/JSON 通常过大，不适合直接生成二维码。'
    }
  } catch (err) {
    qrMessage.value = err.message || '无法加载更多二维码，订阅地址二维码仍可使用。'
  } finally {
    qrLoading.value = false
  }
}

const decodeBase64Lines = (value) => {
  try {
    const normalized = value.trim().replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return new TextDecoder()
      .decode(bytes)
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.includes('://'))
  } catch {
    return []
  }
}

const nodeTitle = (link, index) => {
  try {
    const hash = link.includes('#') ? decodeURIComponent(link.split('#').pop()) : ''
    return hash || `节点 ${index + 1}`
  } catch {
    return `节点 ${index + 1}`
  }
}

const renderActiveQr = async () => {
  await nextTick()
  if (!showQR.value || !activeQrItem.value || !qrCanvas.value) return
  try {
    await QRCode.toCanvas(qrCanvas.value, activeQrItem.value.value, {
      width: 236,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#071018', light: '#ffffff' }
    })
  } catch {
    qrMessage.value = '二维码内容过长，建议扫描订阅地址二维码或直接下载配置。'
  }
}

watch(activeQrIndex, renderActiveQr)

const generateShortLink = async () => {
  if (!props.result) return
  shortLink.value = ''
  shortLinkLoading.value = true
  try {
    const response = await fetch('/api/shortlink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: props.result })
    })
    
    const data = await response.json()
    if (response.ok && !data.error) {
      shortLink.value = data.shortUrl
    }
  } catch (err) {
    console.error('自动生成短链接失败:', err)
  } finally {
    shortLinkLoading.value = false
  }
}

watch(() => props.result, () => {
  showQR.value = false
  qrItems.value = []
  activeQrIndex.value = 0
  generateShortLink()
}, { immediate: true })
</script>

<style scoped>
.result-url {
  position: relative;
  display: flex;
  align-items: center;
}

.shortlink-box {
  display: grid;
  gap: 8px;
  padding-top: 4px;
}

.shortlink-box .result-url {
  gap: 8px;
}

.loader-icon {
  position: absolute;
  left: 12px;
  color: var(--text-soft);
}

.pl-36 {
  padding-left: 36px !important;
}

.compact-copy {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
}

.result-panel {
  display: grid;
  gap: 14px;
}

.result-head,
.qr-header,
.qr-card {
  display: flex;
  gap: 16px;
}

.result-head,
.qr-header {
  align-items: center;
  justify-content: space-between;
}

h2,
h3 {
  margin: 0;
  color: var(--text);
}

h2 {
  font-size: 1.18rem;
}

h3 {
  font-size: 1rem;
}

.result-actions,
.qr-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-button,
.copy-qr-value,
.qr-tabs button {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--text-soft);
  background: var(--overlay);
  cursor: pointer;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.icon-button:hover,
.copy-qr-value:hover,
.qr-tabs button:hover,
.qr-tabs button.active {
  border-color: var(--line-strong);
  color: var(--accent);
  background: var(--overlay-hover);
}

.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.qr-panel {
  display: grid;
  gap: 14px;
  padding-top: 4px;
}

.qr-header > span {
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: 0.78rem;
  font-weight: 900;
}

.qr-tabs button {
  min-height: 34px;
  padding: 0 11px;
  font-size: 0.84rem;
  font-weight: 900;
}

.qr-card {
  align-items: center;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--overlay);
}

.qr-card canvas {
  flex: 0 0 auto;
  padding: 10px;
  border-radius: var(--radius);
  background: #ffffff;
}

.qr-meta {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.qr-meta strong {
  color: var(--text);
}

.qr-meta p,
.qr-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.65;
}

.copy-qr-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: fit-content;
  min-height: 36px;
  padding: 0 11px;
  font-size: 0.84rem;
  font-weight: 900;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .result-head,
  .qr-header,
  .qr-card {
    align-items: stretch;
    flex-direction: column;
  }

  .qr-card canvas {
    align-self: center;
  }
}
</style>
