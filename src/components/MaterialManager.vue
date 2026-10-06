<script setup lang="ts">
import { ref } from 'vue'
import { useStore } from '../lib/store'
import type { Material } from '../types'

const store = useStore()
const { state } = store

const selectedId = ref<string | null>(null)
const csvText = ref('')
const csvError = ref('')

const selected = () => state.materials.find((m) => m.id === selectedId.value) ?? null

function createConstant() {
  const m = store.addMaterial({ name: '自定义常数材料', kind: 'constant', n: 1.5, k: 0 })
  selectedId.value = m.id
}

function createTable() {
  const m = store.addMaterial({
    name: '自定义色散材料',
    kind: 'table',
    n: 1.5,
    k: 0,
    table: [{ wl: 400, n: 1.5, k: 0 }, { wl: 700, n: 1.49, k: 0 }]
  })
  selectedId.value = m.id
}

function addRow(m: Material) {
  const last = m.table[m.table.length - 1]
  m.table.push({ wl: (last?.wl ?? 500) + 50, n: last?.n ?? m.n, k: last?.k ?? m.k })
}

function removeRow(m: Material, i: number) {
  m.table.splice(i, 1)
}

/** 解析粘贴的色散数据：每行 "wl,n,k"（逗号/空白/制表符分隔），忽略 # 开头注释 */
function importCsv(m: Material) {
  csvError.value = ''
  const rows: { wl: number; n: number; k: number }[] = []
  const lines = csvText.value.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const parts = line.split(/[\s,;\t]+/).filter(Boolean)
    if (parts.length < 2) {
      csvError.value = `无法解析行：${line}`
      return
    }
    const wl = Number(parts[0])
    const n = Number(parts[1])
    const k = parts.length >= 3 ? Number(parts[2]) : 0
    if (![wl, n, k].every(Number.isFinite)) {
      csvError.value = `行中存在非数值：${line}`
      return
    }
    rows.push({ wl, n, k })
  }
  if (rows.length < 2) {
    csvError.value = '至少需要 2 个数据点才能插值'
    return
  }
  rows.sort((a, b) => a.wl - b.wl)
  m.table = rows
  m.n = rows[0].n
  m.k = rows[0].k
  csvText.value = ''
}

function exportCsv(m: Material) {
  csvText.value = m.table.map((p) => `${p.wl},${p.n},${p.k}`).join('\n')
}

function tryRemove(m: Material) {
  try {
    store.removeMaterial(m.id)
    if (selectedId.value === m.id) selectedId.value = null
  } catch (e) {
    alert((e as Error).message)
  }
}
</script>

<template>
  <div class="panel">
    <h2>材料库</h2>
    <div class="row">
      <select v-model="selectedId">
        <option :value="null">— 选择材料查看/编辑 —</option>
        <option v-for="m in state.materials" :key="m.id" :value="m.id">
          {{ m.name }}{{ m.builtin ? '（内置）' : '' }}
        </option>
      </select>
    </div>
    <div class="row" style="margin-top: 6px">
      <button @click="createConstant">＋ 常复数材料</button>
      <button @click="createTable">＋ 色散表材料</button>
      <button v-if="selected()" class="danger" @click="tryRemove(selected()!)">删除</button>
    </div>

    <template v-if="selected()">
      <label>名称</label>
      <input type="text" v-model="selected()!.name" :disabled="selected()!.builtin" />

      <template v-if="selected()!.kind === 'constant'">
        <div class="row">
          <div>
            <label>折射率 n（实数部分）</label>
            <input type="number" step="0.01" v-model.number="selected()!.n" />
          </div>
          <div>
            <label>消光系数 k（吸收）</label>
            <input type="number" step="0.01" v-model.number="selected()!.k" />
          </div>
        </div>
        <p class="note">
          ñ = n + i k。k=0 为无损介质；k&gt;0 表示吸收（e<sup>−iωt</sup> 约定）。
          金属在可见光 k 通常远大于 n，请勿填 0 冒充无损。
        </p>
      </template>

      <template v-else>
        <p class="note">
          色散表：每行一个波长点，对 n 与 k 分别做线性插值；扫描超出表范围时按端点钳制并在结果区警告。
        </p>
        <table>
          <thead>
            <tr>
              <th>波长 (nm)</th>
              <th>n</th>
              <th>k</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in selected()!.table" :key="i">
              <td><input type="number" v-model.number="p.wl" /></td>
              <td><input type="number" step="0.01" v-model.number="p.n" /></td>
              <td><input type="number" step="0.01" v-model.number="p.k" /></td>
              <td><button class="mini-btn danger" @click="removeRow(selected()!, i)">×</button></td>
            </tr>
          </tbody>
        </table>
        <button style="margin-top: 6px" @click="addRow(selected()!)">＋ 数据点</button>

        <h3>批量导入 / 导出（每行：波长nm, n, k）</h3>
        <textarea v-model="csvText" placeholder="400,1.52,0&#10;550,1.518,0&#10;700,1.513,0"></textarea>
        <p v-if="csvError" class="warn-box">{{ csvError }}</p>
        <div class="row" style="margin-top: 6px">
          <button @click="importCsv(selected()!)">导入替换表格</button>
          <button @click="exportCsv(selected()!)">把表格导出到文本框</button>
        </div>
      </template>
    </template>
  </div>
</template>
