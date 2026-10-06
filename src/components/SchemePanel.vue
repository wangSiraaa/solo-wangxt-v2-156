<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useStore } from '../lib/store'

const store = useStore()
const { state } = store
const name = ref('')
const message = ref('')
const busy = ref(false)

onMounted(async () => {
  try {
    await store.refreshSchemes()
  } catch (e) {
    message.value = `读取本地库失败：${(e as Error).message}（隐私模式下 IndexedDB 可能被禁用）`
  }
})

async function save() {
  busy.value = true
  message.value = ''
  try {
    await store.saveScheme(name.value.trim())
    message.value = '已保存到浏览器 IndexedDB（无后端，数据不出本机）'
    name.value = ''
  } catch (e) {
    message.value = `保存失败：${(e as Error).message}`
  } finally {
    busy.value = false
  }
}

async function saveAs() {
  busy.value = true
  message.value = ''
  try {
    await store.saveAsNew(name.value.trim() || `副本 ${new Date().toLocaleString()}`)
    message.value = '已另存为新方案'
    name.value = ''
  } catch (e) {
    message.value = `保存失败：${(e as Error).message}`
  } finally {
    busy.value = false
  }
}

async function remove(id: string) {
  if (!confirm('确定从本地库删除该方案？')) return
  await store.removeScheme(id)
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="panel">
    <h2>方案存档（IndexedDB，本地）</h2>
    <div class="row">
      <input type="text" v-model="name" placeholder="方案名称，例如：532nm 双层增透" @keyup.enter="save" />
      <button class="primary shrink" :disabled="busy" @click="save">保存/更新</button>
      <button class="shrink" :disabled="busy" @click="saveAs">另存</button>
    </div>
    <p v-if="message" class="info-box">{{ message }}</p>

    <h3>已存方案（{{ state.schemes.length }}）</h3>
    <div v-if="!state.schemes.length" class="note">暂无。存档包含膜系、材料库副本与扫描参数。</div>
    <div v-for="s in state.schemes" :key="s.id" class="scheme-item">
      <div style="min-width: 0">
        <div :title="s.name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
          {{ s.name }}
          <span v-if="s.id === state.currentSchemeId" class="tag">当前</span>
        </div>
        <div class="note">{{ s.layers.length }} 层膜 · {{ fmtDate(s.updatedAt) }}</div>
      </div>
      <div class="row shrink" style="gap: 4px">
        <button class="mini-btn" @click="store.loadScheme(s)">载入</button>
        <button class="mini-btn danger" @click="remove(s.id)">删除</button>
      </div>
    </div>
  </div>
</template>
