<template>
  <main class="page">
    <section class="page-shell stack">

      <section class="metric-grid">
        <article v-for="metric in metrics" :key="metric.label" class="metric-card">
          <component :is="metric.icon" :size="20" />
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </section>

      <section class="module-grid">
        <router-link v-for="item in modules" :key="item.to" :to="item.to" class="module-card">
          <div class="module-icon">
            <component :is="item.icon" :size="22" />
          </div>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </div>
          <ArrowRight :size="18" />
        </router-link>
      </section>

      <section class="grid-2">
        <div class="panel">
          <div class="panel-heading">
            <div>
              <p class="section-label">PROTOCOL MATRIX</p>
              <h2 class="title-lg">协议输入覆盖</h2>
            </div>
            <Activity :size="22" />
          </div>
          <div class="pill-grid">
            <span v-for="item in protocols" :key="item">{{ item }}</span>
          </div>
        </div>

        <div class="panel">
          <div class="panel-heading">
            <div>
              <p class="section-label">CLIENT TARGETS</p>
              <h2 class="title-lg">客户端输出覆盖</h2>
            </div>
            <MonitorSmartphone :size="22" />
          </div>
          <div class="pill-grid">
            <span v-for="item in clients" :key="item">{{ item }}</span>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import {
  Activity,
  ArrowRight,
  GitMerge,
  HeartPulse,
  Link,
  MonitorSmartphone,
  QrCode,
  Rocket,
  Server,
  ShieldCheck,
  Waypoints
} from 'lucide-vue-next'

const terminalLines = [
  { label: 'API', value: 'Express /api ready' },
  { label: 'Docker', value: 'GHCR multi-arch' },
  { label: 'Storage', value: 'persistent shortlinks' },
  { label: 'Security', value: 'private URL guard' }
]

const metrics = [
  { label: '输入协议', value: '13+', icon: Waypoints },
  { label: '目标客户端', value: '20+', icon: MonitorSmartphone },
  { label: '部署方式', value: 'Docker', icon: Server },
  { label: '安全审计', value: '0 vuln', icon: ShieldCheck }
]

const modules = [
  { to: '/converter', title: '订阅转换', desc: '输入订阅地址，生成目标客户端可导入配置、下载文件或二维码。', icon: Rocket },
  { to: '/merge', title: '订阅合并', desc: '批量拉取多个订阅，去重、排序、加地区标识并导出。', icon: GitMerge },
  { to: '/health', title: '节点检测', desc: '从服务器侧检测 TCP 连通性，导出在线节点配置。', icon: HeartPulse },
  { to: '/shortlink', title: '短链接管理', desc: '把长订阅地址变成固定短码，支持访问统计和删除。', icon: Link },
  { to: '/about', title: '部署和 API', desc: '查看一键部署脚本、Docker、API 和生产维护命令。', icon: Server },
  { to: '/converter', title: '二维码导入', desc: '转换结果可生成订阅二维码，分享链格式支持单节点二维码。', icon: QrCode }
]

const protocols = ['SS', 'SSR', 'VMess', 'VLESS', 'VLESS Reality', 'Trojan', 'Hysteria', 'Hysteria2', 'TUIC', 'Snell', 'AnyTLS', 'HTTP', 'SOCKS5', 'Clash YAML', 'sing-box JSON']

const clients = ['Clash', 'Clash Meta', 'Mihomo', 'Stash', 'Surge', 'Surfboard', 'Loon', 'Quantumult X', 'Shadowrocket', 'V2RayN', 'V2RayNG', 'V2RayU', 'NekoBox', 'Hiddify', 'sing-box', 'SFA', 'SFI', 'SFM']
</script>

<style scoped>
.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 22px;
  align-items: stretch;
  min-width: 0;
}

.hero-copy {
  display: grid;
  align-content: center;
  min-width: 0;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}

.command-panel {
  position: relative;
  min-width: 0;
  min-height: 340px;
  overflow: hidden;
  border: 1px solid rgba(49, 214, 255, 0.25);
  border-radius: var(--radius);
  background:
    linear-gradient(180deg, rgba(7, 15, 24, 0.96), rgba(3, 8, 14, 0.96)),
    linear-gradient(rgba(49, 214, 255, 0.08) 1px, transparent 1px);
  box-shadow: inset 0 0 60px rgba(49, 214, 255, 0.06);
}

.terminal-head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(135, 160, 185, 0.14);
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.terminal-head span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.76;
}

.terminal-head span:nth-child(2) {
  background: var(--warning);
}

.terminal-head span:nth-child(3) {
  background: var(--accent-2);
}

.terminal-head strong {
  margin-left: auto;
}

.terminal-body {
  display: grid;
  gap: 13px;
  padding: 20px;
}

.terminal-line {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--overlay);
  font-family: var(--mono);
}

.terminal-line span {
  color: var(--text-muted);
}

.terminal-line strong {
  color: var(--accent-2);
  text-align: right;
  overflow-wrap: anywhere;
}

.scanline {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 80px;
  background: linear-gradient(to bottom, transparent, rgba(49, 214, 255, 0.08), transparent);
  animation: scan 4.2s ease-in-out infinite;
}

.metric-grid,
.module-grid {
  display: grid;
  gap: 12px;
}

.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-card,
.module-card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel-bg);
}

.metric-card {
  display: grid;
  gap: 7px;
  padding: 16px;
}

.metric-card svg {
  color: var(--accent);
}

.metric-card span {
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 900;
}

.metric-card strong {
  color: var(--text);
  font-size: 1.6rem;
  line-height: 1;
}

.module-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.module-card {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  min-height: 112px;
  padding: 16px;
  color: var(--text-soft);
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.module-card:hover {
  border-color: var(--line-strong);
  background: rgba(49, 214, 255, 0.07);
  transform: translateY(-2px);
}

.module-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(49, 214, 255, 0.25);
  border-radius: var(--radius);
  color: var(--accent);
  background: rgba(49, 214, 255, 0.08);
}

.module-card strong {
  color: var(--text);
  font-size: 1.02rem;
}

.module-card p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}

.module-card > svg {
  color: var(--text-muted);
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-heading svg {
  color: var(--accent);
}

.pill-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill-grid span {
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid rgba(49, 214, 255, 0.2);
  border-radius: var(--radius);
  color: var(--text-soft);
  background: rgba(49, 214, 255, 0.055);
  font-size: 0.84rem;
  font-weight: 900;
}

@keyframes scan {
  0%, 100% {
    transform: translateY(-90px);
  }
  50% {
    transform: translateY(350px);
  }
}

@media (max-width: 980px) {
  .home-hero,
  .module-grid {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .metric-grid,
  .module-card {
    grid-template-columns: 1fr;
  }

  .module-card > svg {
    display: none;
  }

  .terminal-line {
    flex-direction: column;
    gap: 4px;
  }

  .terminal-line strong {
    text-align: left;
  }
}
</style>
