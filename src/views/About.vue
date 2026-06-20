<template>
  <main class="page">
    <section class="page-shell stack">
      <section class="grid-2">
        <article class="panel code-card">
          <div class="card-head">
            <div>
              <p class="section-label">ONE COMMAND</p>
              <h2>服务器一键部署</h2>
            </div>
            <button class="btn btn-secondary" type="button" @click="copyCommand(commands.install, 'install')">
              <Copy :size="16" />
              <span>{{ copied === 'install' ? '已复制' : '复制' }}</span>
            </button>
          </div>
          <pre><code>{{ commands.install }}</code></pre>
        </article>

        <article class="panel">
          <div class="card-head">
            <div>
              <p class="section-label">DEFAULTS</p>
              <h2>默认部署参数</h2>
            </div>
            <Container :size="22" />
          </div>
            <div class="kv-list">
              <div><span>镜像</span><strong>sub-converter:latest</strong></div>
              <div><span>安装目录</span><strong>/opt/sub-converter</strong></div>
              <div><span>数据目录</span><strong>/opt/sub-converter/data</strong></div>
            <div><span>默认端口</span><strong>3000</strong></div>
          </div>
        </article>
      </section>

      <section class="panel">
        <div class="card-head">
          <div>
            <p class="section-label">OPS COMMANDS</p>
            <h2>维护命令</h2>
          </div>
          <TerminalSquare :size="22" />
        </div>

        <div class="command-grid">
          <article v-for="item in commandCards" :key="item.key" class="command-card">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
            <pre><code>{{ item.command }}</code></pre>
            <button class="btn btn-secondary" type="button" @click="copyCommand(item.command, item.key)">
              <Copy :size="16" />
              <span>{{ copied === item.key ? '已复制' : '复制命令' }}</span>
            </button>
          </article>
        </div>
      </section>

      <section class="grid-2">
        <article class="panel">
          <div class="card-head">
            <div>
              <p class="section-label">CLIENTS</p>
              <h2>目标客户端</h2>
            </div>
            <Route :size="22" />
          </div>
          <div class="pill-grid">
            <span v-for="item in clients" :key="item">{{ item }}</span>
          </div>
        </article>

        <article class="panel">
          <div class="card-head">
            <div>
              <p class="section-label">PROTOCOLS</p>
              <h2>输入协议</h2>
            </div>
            <FileJson :size="22" />
          </div>
          <div class="pill-grid">
            <span v-for="item in protocols" :key="item">{{ item }}</span>
          </div>
        </article>
      </section>

      <section class="panel">
        <div class="card-head">
          <div>
            <p class="section-label">HTTP API</p>
            <h2>接口清单</h2>
          </div>
          <Code2 :size="22" />
        </div>

        <div class="api-grid">
          <article v-for="api in apis" :key="api.path" class="api-card">
            <span>{{ api.method }}</span>
            <strong>{{ api.path }}</strong>
            <p>{{ api.body }}</p>
          </article>
        </div>
      </section>

      <section class="panel">
        <div class="card-head">
          <div>
            <p class="section-label">RELEASE CHECK</p>
            <h2>生产校验</h2>
          </div>
          <CheckCircle2 :size="22" />
        </div>

        <div class="check-grid">
          <article v-for="item in checklist" :key="item" class="check-row">
            <CheckCircle2 :size="18" />
            <span>{{ item }}</span>
          </article>
        </div>


      </section>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import {
  CheckCircle2,
  Code2,
  Container,
  Copy,
  FileJson,
  Github,
  Route,
  ShieldCheck,
  TerminalSquare
} from 'lucide-vue-next'
import { TARGET_DEFINITIONS } from '../../shared/targets.js'
import { copyText } from '../utils/clipboard.js'

const copied = ref('')

const commands = {
  install: 'docker-compose up -d --build',
  port: '修改 docker-compose.yml 的端口映射',
  update: 'docker-compose pull && docker-compose up -d',
  status: 'docker-compose ps',
  logs: 'docker-compose logs -f --tail 200',
  uninstall: 'docker-compose down'
}

const commandCards = [
  { key: 'port', title: '指定端口安装', desc: '把外部访问端口改成 8080。', command: commands.port },
  { key: 'update', title: '更新镜像', desc: '拉取最新 GHCR 镜像并重启容器。', command: commands.update },
  { key: 'status', title: '查看状态', desc: '查看 Docker Compose 服务状态。', command: commands.status },
  { key: 'logs', title: '查看日志', desc: '持续跟踪最近 200 行运行日志。', command: commands.logs },
  { key: 'uninstall', title: '卸载容器', desc: '停止并移除容器，保留数据目录。', command: commands.uninstall }
]

const protocols = ['SS', 'SSR', 'VMess', 'VLESS', 'VLESS Reality', 'Trojan', 'Hysteria', 'Hysteria2', 'TUIC', 'Snell', 'AnyTLS', 'HTTP', 'SOCKS5', 'Clash YAML', 'sing-box JSON']

const clients = TARGET_DEFINITIONS.map(client => client.name)

const apis = [
  { method: 'GET', path: '/api/convert', body: '订阅转换，输出目标客户端格式。' },
  { method: 'POST', path: '/api/merge', body: '多订阅拉取、合并、过滤、去重并导出。' },
  { method: 'POST', path: '/api/merge/preview', body: '预览多订阅合并后的节点统计。' },
  { method: 'POST', path: '/api/health/check', body: '检测节点连通性并导出在线节点。' },
  { method: 'POST', path: '/api/shortlink', body: '创建持久化短链接。' },
  { method: 'GET', path: '/api/shortlink/list', body: '列出短链接和访问次数。' },
  { method: 'GET', path: '/api/shortlink/:code/stats', body: '读取单个短链接统计。' },
  { method: 'DELETE', path: '/api/shortlink/:code', body: '删除短链接。' },
  { method: 'GET', path: '/api/targets', body: '返回支持的目标客户端列表。' },
  { method: 'GET', path: '/api/rules/presets', body: '返回可用的 YAML 规则模板。' },
  { method: 'GET', path: '/api/health/ping', body: '检测单个公网节点的 TCP 连通性。' },
  { method: 'GET', path: '/healthz', body: '服务健康检查。' }
]

const checklist = [
  'Docker 镜像包含前端静态资源、后端 API 和短链接持久化目录。',
  '数据目录固定使用 UID/GID 10001，升级脚本会自动修复旧目录权限。',
  '订阅拉取默认阻止 localhost / 内网地址，降低公开部署 SSRF 风险。',
  '21 个目标客户端、短链接生命周期、合并和节点检测均纳入自动化测试。',
  '生产构建使用 Vite 8，依赖审计当前为 0 漏洞。',
  '一键脚本支持安装、更新、状态、日志和卸载。'
]

const copyCommand = async (text, key) => {
  try {
    await copyText(text)
    copied.value = key
    window.setTimeout(() => {
      if (copied.value === key) copied.value = ''
    }, 1400)
  } catch {
    copied.value = ''
  }
}
</script>

<style scoped>
.deploy-hero,
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.deploy-hero > svg,
.card-head > svg {
  flex: 0 0 auto;
  color: var(--accent);
}

.card-head {
  margin-bottom: 14px;
}

.card-head h2 {
  margin: 0;
  color: var(--text);
  font-size: 1.16rem;
}

.code-card pre,
.command-card pre {
  margin: 0;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(3, 8, 14, 0.78);
}

.code-card pre {
  padding: 15px;
}

code {
  color: var(--accent-2);
  font-family: var(--mono);
  font-size: 0.84rem;
  line-height: 1.7;
}

.kv-list {
  display: grid;
  gap: 10px;
}

.kv-list div {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.035);
}

.kv-list span {
  color: var(--text-muted);
  font-weight: 900;
}

.kv-list strong {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text);
  font-family: var(--mono);
  font-size: 0.86rem;
}

.command-grid,
.api-grid,
.check-grid {
  display: grid;
  gap: 12px;
}

.command-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.command-card,
.api-card,
.check-row {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.035);
}

.command-card {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.command-card strong {
  color: var(--text);
}

.command-card p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.command-card pre {
  padding: 12px;
}

.pill-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill-grid span {
  padding: 7px 10px;
  border: 1px solid rgba(49, 214, 255, 0.2);
  border-radius: var(--radius);
  color: var(--text-soft);
  background: var(--overlay);
  font-family: var(--mono);
  font-weight: 900;
}

.api-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.api-card {
  min-height: 136px;
  padding: 14px;
}

.api-card span {
  display: inline-block;
  margin-bottom: 9px;
  color: var(--accent);
  font-family: var(--mono);
  font-size: 0.76rem;
  font-weight: 900;
}

.api-card strong {
  display: block;
  color: var(--text);
  font-family: var(--mono);
  font-size: 0.92rem;
}

.api-card p,
.check-row span {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.65;
}

.check-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 14px;
}

.check-row {
  display: flex;
  gap: 10px;
  padding: 13px;
}

.check-row svg {
  flex: 0 0 auto;
  color: var(--accent-2);
}

.repo-link {
  width: fit-content;
}

@media (max-width: 980px) {
  .command-grid,
  .api-grid,
  .check-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .deploy-hero,
  .card-head {
    flex-direction: column;
  }

  .command-grid,
  .api-grid,
  .check-grid {
    grid-template-columns: 1fr;
  }

  .kv-list div {
    grid-template-columns: 1fr;
  }
}
</style>
