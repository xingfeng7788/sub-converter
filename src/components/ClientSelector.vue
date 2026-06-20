<template>
  <section class="panel client-selector">
    <div class="selector-head">
      <div>
        <p class="section-label">TARGET CLIENT</p>
        <h2>选择输出客户端</h2>
      </div>
      <span>{{ clients.length }} 个目标</span>
    </div>

    <div class="chip-group">
      <button
        v-for="client in clients"
        :key="client.id"
        type="button"
        class="chip"
        :class="{ active: modelValue === client.id }"
        @click="$emit('update:modelValue', client.id)"
      >
        <component :is="client.icon" :size="14" />
        <span>{{ client.name }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { Box, Flame, Gem, Monitor, Radio, Rocket, Shield, Smartphone, Sparkles, Waves, Zap } from 'lucide-vue-next'
import { TARGET_DEFINITIONS } from '../../shared/targets.js'

defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue'])

const clients = TARGET_DEFINITIONS.map(client => ({
  ...client,
  icon: iconFor(client.id)
}))

function iconFor(id) {
  if (['clashmeta', 'mihomo'].includes(id)) return Sparkles
  if (id === 'clash') return Flame
  if (['stash', 'nekobox'].includes(id)) return Box
  if (id === 'singbox') return Radio
  if (id === 'hiddify') return Shield
  if (['surge', 'surfboard'].includes(id)) return Waves
  if (id === 'quantumultx') return Gem
  if (id === 'shadowrocket') return Rocket
  if (id === 'loon') return Zap
  if (['v2rayng', 'sfa', 'sfi'].includes(id)) return Smartphone
  return Monitor
}
</script>

<style scoped>
.client-selector {
  display: grid;
  gap: 14px;
}

.selector-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.selector-head h2 {
  margin: 0;
  color: var(--text);
  font-size: 1.18rem;
}

.selector-head > span {
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: 0.78rem;
  font-weight: 900;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-soft);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: var(--line-strong);
  color: var(--text);
  background: var(--surface-2);
}

.chip.active {
  border-color: var(--text-soft);
  background: var(--text);
  color: var(--bg);
  font-weight: 700;
}

.chip.active svg {
  color: var(--bg);
}

.chip svg {
  color: var(--text-muted);
}
</style>
