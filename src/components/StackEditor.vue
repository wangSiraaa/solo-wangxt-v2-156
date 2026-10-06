<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '../lib/store'
import { materialNk } from '../lib/interpolation'

const store = useStore()
const { state } = store

/** 在当前扫描中点波长处预览材料折射率，便于辨认吸收材料 */
const previewWl = computed(() => (state.params.wlStart + state.params.wlEnd) / 2)

function nkLabel(matId: string): string {
  const m = store.materialById(matId)
  if (!m) return '?'
  const q = materialNk(m, previewWl.value)
  const kTxt = Math.abs(q.k) > 1e-6 ? `, k=${q.k.toFixed(3)}` : ', k=0'
  return `n=${q.n.toFixed(3)}${kTxt}${q.outOfRange ? ' ⚠表外' : ''}`
}

const incidentAbsorbing = computed(() => {
  const m = store.materialById(state.incident.materialId)
  if (!m) return false
  for (let i = 0; i <= 10; i++) {
    const wl = state.params.wlStart + ((state.params.wlEnd - state.params.wlStart) * i) / 10
    if (Math.abs(materialNk(m, wl).k) > 1e-9) return true
  }
  return false
})
</script>

<template>
  <div class="panel">
    <h2>膜层结构</h2>

    <table>
      <thead>
        <tr>
          <th>位置</th>
          <th>材料</th>
          <th style="width: 92px">厚度 (nm)</th>
          <th style="width: 78px">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr class="layer-row">
          <td>
            入射介质
            <span class="tag">半无限</span>
          </td>
          <td>
            <select v-model="state.incident.materialId">
              <option v-for="m in state.materials" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <div class="note mono">{{ nkLabel(state.incident.materialId) }}</div>
          </td>
          <td><span class="note">—</span></td>
          <td></td>
        </tr>
        <tr v-for="(layer, i) in state.layers" :key="layer.id" class="layer-row">
          <td>
            膜层 {{ i + 1 }}
          </td>
          <td>
            <select v-model="layer.materialId">
              <option v-for="m in state.materials" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <div class="note mono">{{ nkLabel(layer.materialId) }}</div>
          </td>
          <td>
            <input type="number" min="0" step="1" v-model.number="layer.thickness" />
          </td>
          <td>
            <div class="row" style="gap: 2px">
              <button class="mini-btn shrink" :disabled="i === 0" @click="store.moveLayer(i, -1)">↑</button>
              <button class="mini-btn shrink" :disabled="i === state.layers.length - 1" @click="store.moveLayer(i, 1)">↓</button>
              <button class="mini-btn shrink danger" @click="store.removeLayer(i)">×</button>
            </div>
          </td>
        </tr>
        <tr class="layer-row">
          <td>
            基底
            <span class="tag">半无限</span>
          </td>
          <td>
            <select v-model="state.substrate.materialId">
              <option v-for="m in state.materials" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <div class="note mono">{{ nkLabel(state.substrate.materialId) }}</div>
          </td>
          <td><span class="note">—</span></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class="row" style="margin-top: 8px">
      <button @click="store.addLayer()">＋ 追加膜层</button>
      <button @click="store.addLayer(0)">＝ 在顶部插入</button>
    </div>

    <div v-if="incidentAbsorbing" class="warn-box">
      入射介质在扫描波段内有吸收（k≠0）。此时“入射能流”定义不成立，R/T 的标准含义失效，
      结果仅供研究参考——实验上光也无法在有耗介质深处建立明确的入射平面波。
    </div>

    <p class="note" style="margin-bottom: 0">
      厚度单位 nm；入射角在扫描参数中设置（度，相对法线）。折射率在扫描中点
      {{ previewWl.toFixed(0) }} nm 处预览；色散材料的 n,k 随波长变化。
    </p>
  </div>
</template>
