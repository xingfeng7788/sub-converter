<template>
  <section class="client-selector">
    <div class="section-heading">
      <p>目标客户端</p>
      <span>{{ clients.length }} 个客户端</span>
    </div>

    <div class="client-grid">
      <button
        v-for="client in clients"
        :key="client.id"
        class="client-card"
        :class="{ active: modelValue === client.id }"
        @click="$emit('update:modelValue', client.id)"
      >
        <component :is="client.icon" :size="20" />
        <span>
          <strong>{{ client.name }}</strong>
          <small>{{ client.platform }}</small>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { Box, Flame, Gem, Monitor, Radio, Rocket, Shield, Smartphone, Sparkles, Waves, Zap } from 'lucide-vue-next'

defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue'])

const clients = [
  { id: 'clashmeta', name: 'Clash Meta', platform: '完整 YAML 配置', icon: Sparkles },
  { id: 'mihomo', name: 'Mihomo', platform: 'Meta 内核配置', icon: Sparkles },
  { id: 'stash', name: 'Stash', platform: 'iOS / macOS', icon: Box },
  { id: 'singbox', name: 'sing-box', platform: '通用 JSON 配置', icon: Radio },
  { id: 'hiddify', name: 'Hiddify', platform: 'sing-box JSON', icon: Shield },
  { id: 'clash', name: 'Clash', platform: '经典 YAML 配置', icon: Flame },
  { id: 'clashverge', name: 'Clash Verge', platform: '桌面客户端', icon: Monitor },
  { id: 'flclash', name: 'FlClash', platform: 'Flutter 客户端', icon: Monitor },
  { id: 'surge', name: 'Surge', platform: 'iOS / macOS', icon: Waves },
  { id: 'quantumultx', name: 'Quantumult X', platform: 'iOS 客户端', icon: Gem },
  { id: 'shadowrocket', name: 'Shadowrocket', platform: 'iOS 客户端', icon: Rocket },
  { id: 'loon', name: 'Loon', platform: 'iOS 客户端', icon: Zap },
  { id: 'v2rayn', name: 'V2RayN', platform: 'Windows 客户端', icon: Monitor },
  { id: 'v2rayng', name: 'V2RayNG', platform: 'Android 客户端', icon: Smartphone },
  { id: 'v2rayu', name: 'V2RayU', platform: 'macOS 客户端', icon: Monitor },
  { id: 'nekobox', name: 'NekoBox', platform: 'Android 客户端', icon: Box },
  { id: 'surfboard', name: 'Surfboard', platform: 'Android 客户端', icon: Waves },
  { id: 'sfa', name: 'SFA', platform: 'Android sing-box', icon: Smartphone },
  { id: 'sfi', name: 'SFI', platform: 'iOS sing-box', icon: Smartphone },
  { id: 'sfm', name: 'SFM', platform: 'macOS sing-box', icon: Monitor }
]
</script>

<style scoped>
.client-selector {
  display: grid;
  gap: 12px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 0.86rem;
  font-weight: 800;
}

.section-heading p {
  color: #f8fafc;
  font-size: 0.94rem;
}

.client-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(176px, 1fr));
  gap: 10px;
}

.client-card {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  min-height: 74px;
  padding: 13px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.62);
  cursor: pointer;
  text-align: left;
}

.client-card:hover {
  border-color: rgba(34, 211, 238, 0.58);
  color: #ffffff;
}

.client-card.active {
  border-color: #22d3ee;
  color: #ffffff;
  background: linear-gradient(135deg, rgba(8, 145, 178, 0.28), rgba(79, 70, 229, 0.22));
}

.client-card svg {
  color: #67e8f9;
}

.client-card span {
  min-width: 0;
}

.client-card strong,
.client-card small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-card strong {
  font-size: 0.95rem;
  line-height: 1.25;
}

.client-card small {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 0.78rem;
  line-height: 1.35;
}
</style>
