<template>
  <main class="home">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">订阅转换控制台</p>
        <h1>老王订阅转换器</h1>
        <p class="subtitle">
          面向 Clash Meta、Mihomo、Stash、sing-box、Surge、Quantumult X、Loon、Shadowrocket、V2RayN 等客户端，
          提供订阅转换、合并、健康检测、二维码导入和短链接管理。
        </p>
        <div class="actions">
          <router-link to="/converter" class="primary">开始转换</router-link>
          <router-link to="/health" class="secondary">检测节点</router-link>
        </div>
      </div>

      <div class="signal-panel">
        <div class="panel-top">
          <Activity :size="18" />
          <span>协议兼容矩阵</span>
        </div>
        <div class="matrix">
          <span>SS</span>
          <span>SSR</span>
          <span>VMess</span>
          <span>VLESS</span>
          <span>Trojan</span>
          <span>Hysteria2</span>
          <span>TUIC</span>
          <span>Snell</span>
          <span>AnyTLS</span>
          <span>HTTP / SOCKS5</span>
          <span>Clash / sing-box</span>
        </div>
      </div>
    </section>

    <section class="modules">
      <router-link v-for="item in modules" :key="item.to" :to="item.to" class="module">
        <component :is="item.icon" :size="22" />
        <strong>{{ item.title }}</strong>
        <span>{{ item.desc }}</span>
      </router-link>
    </section>
  </main>
</template>

<script setup>
import { Activity, GitMerge, HeartPulse, Link, RefreshCw } from 'lucide-vue-next'

const modules = [
  { to: '/converter', title: '订阅转换', desc: '生成目标客户端可直接导入的订阅地址。', icon: RefreshCw },
  { to: '/merge', title: '订阅合并', desc: '多订阅拉取、去重、预览并导出。', icon: GitMerge },
  { to: '/health', title: '节点检测', desc: '检测连通性和延迟，导出在线节点。', icon: HeartPulse },
  { to: '/shortlink', title: '短链接', desc: '为长订阅地址生成固定短码。', icon: Link }
]
</script>

<style scoped>
.home {
  min-height: 100vh;
  padding: 118px 24px 56px;
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.12), transparent 34%),
    linear-gradient(225deg, rgba(99, 102, 241, 0.14), transparent 42%),
    #020617;
}

.hero,
.modules {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
  gap: 20px;
  align-items: stretch;
}

.hero-copy,
.signal-panel,
.module {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.78);
}

.hero-copy {
  padding: clamp(28px, 4vw, 44px);
}

.eyebrow {
  margin-bottom: 12px;
  color: #22d3ee;
  font-size: 0.86rem;
  font-weight: 900;
}

h1 {
  max-width: 720px;
  color: #f8fafc;
  font-size: clamp(2.5rem, 5vw, 4.6rem);
  line-height: 1.05;
  letter-spacing: 0;
}

.subtitle {
  max-width: 720px;
  margin-top: 18px;
  color: #cbd5e1;
  font-size: 1.02rem;
  line-height: 1.85;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.primary,
.secondary {
  display: inline-flex;
  align-items: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 8px;
  font-weight: 900;
}

.primary {
  color: #03131a;
  background: #67e8f9;
}

.secondary {
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: #e5e7eb;
}

.signal-panel {
  display: grid;
  align-content: space-between;
  gap: 22px;
  min-height: 352px;
  padding: 22px;
  overflow: hidden;
}

.panel-top {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 900;
}

.panel-top svg {
  color: #67e8f9;
}

.matrix {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.matrix span {
  display: flex;
  align-items: center;
  min-height: 50px;
  padding: 12px 14px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  border-radius: 8px;
  color: #dbeafe;
  background: rgba(8, 47, 73, 0.45);
  font-size: 0.92rem;
  font-weight: 800;
}

.modules {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.module {
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 9px;
  min-height: 136px;
  padding: 18px;
  color: #cbd5e1;
}

.module:hover {
  border-color: rgba(34, 211, 238, 0.58);
}

.module svg {
  color: #67e8f9;
}

.module strong {
  color: #ffffff;
  font-size: 1.06rem;
}

.module span {
  color: #94a3b8;
  font-size: 0.92rem;
  line-height: 1.65;
}

@media (max-width: 900px) {
  .home {
    padding: 100px 14px 36px;
  }

  .hero,
  .modules {
    grid-template-columns: 1fr;
  }
}
</style>
