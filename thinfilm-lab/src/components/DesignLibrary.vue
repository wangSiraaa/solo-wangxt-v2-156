<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { state } from '../store/state'
import { saveDesign, listDesigns, deleteDesign, type SavedDesign } from '../store/db'
import { getMaterial } from '../optics/materials'

const designs = ref<SavedDesign[]>([])
const name = ref('')
const error = ref('')

async function refresh() {
  designs.value = await listDesigns()
}
async function save() {
  if (!name.value.trim()) return
  await saveDesign({
    name: name.value.trim(),
    savedAt: new Date().toISOString(),
    stack: JSON.parse(JSON.stringify(state.stack)),
    sweep: { ...state.sweep },
  })
  name.value = ''
  await refresh()
}
function load(d: SavedDesign) {
  error.value = ''
  try {
    // 校验方案引用的材料仍存在（自定义材料可能已被清除）
    for (const id of [d.stack.ambientId, d.stack.substrateId, ...d.stack.layers.map(l => l.materialId)]) {
      getMaterial(id)
    }
    state.stack = JSON.parse(JSON.stringify(d.stack))
    state.sweep = { ...d.sweep }
  } catch (e) {
    error.value = `方案「${d.name}」引用了不存在的材料（可能为已清除的自定义材料），无法载入。`
  }
}
async function remove(id?: number) {
  if (id === undefined) return
  await deleteDesign(id)
  await refresh()
}
onMounted(refresh)
</script>

<template>
  <section class="panel">
    <h2>方案库 <span class="unit-note">保存在浏览器 IndexedDB，不上传任何服务器</span></h2>
    <div class="row">
      <input v-model="name" placeholder="方案名称" @keyup.enter="save" />
      <button @click="save">保存当前方案</button>
    </div>
    <p v-if="error" class="err">{{ error }}</p>
    <ul class="designs">
      <li v-for="d in designs" :key="d.id">
        <span class="nm">{{ d.name }}</span>
        <span class="tm">{{ new Date(d.savedAt).toLocaleString() }}</span>
        <button @click="load(d)">载入</button>
        <button @click="remove(d.id)">删除</button>
      </li>
      <li v-if="designs.length === 0" class="hint">暂无已保存方案</li>
    </ul>
  </section>
</template>

<style scoped>
.row { display: flex; gap: 8px; }
.designs { list-style: none; padding: 0; margin: 8px 0 0; font-size: 13px; }
.designs li { display: flex; gap: 8px; align-items: center; padding: 4px 0; border-bottom: 1px solid #1e293b; }
.nm { flex: 1; }
.tm { color: #64748b; font-size: 12px; }
.err { color: #f87171; font-size: 13px; }
</style>
