<script setup lang="ts">
import { computed, ref } from 'vue'
import { state } from '../store/state'
import { MATERIALS, nkAt, addCustomMaterial } from '../optics/materials'
import { newLayerId } from '../optics/examples'

const monitoringLambda = computed(() =>
  state.sweep.mode === 'wavelength'
    ? (state.sweep.start + state.sweep.end) / 2
    : state.sweep.fixedLambdaNm,
)

function nkOf(materialId: string) {
  const m = MATERIALS.find((x) => x.id === materialId)
  return m ? nkAt(m, monitoringLambda.value) : null
}

function addLayer() {
  state.stack.layers.push({ id: newLayerId(), materialId: 'sio2', thicknessNm: 100 })
}
function removeLayer(i: number) {
  state.stack.layers.splice(i, 1)
}
function moveLayer(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= state.stack.layers.length) return
  const [l] = state.stack.layers.splice(i, 1)
  state.stack.layers.splice(j, 0, l)
}

/* 自定义材料 */
const showCustom = ref(false)
const cName = ref('')
const cN = ref(1.5)
const cK = ref(0)
function addCustom() {
  if (!cName.value.trim() || cN.value <= 0 || cK.value < 0) return
  addCustomMaterial(cName.value.trim(), cN.value, cK.value)
  state.materialsVersion++
  cName.value = ''
  showCustom.value = false
}
</script>

<template>
  <section class="panel">
    <h2>膜系结构 <span class="unit-note">厚度单位：nm（物理厚度）</span></h2>

    <div class="row">
      <label>入射介质
        <select v-model="state.stack.ambientId">
          <option v-for="m in MATERIALS" :key="m.id" :value="m.id"
                  :disabled="!!m.table && m.table.some(p => p.k > 0)">
            {{ m.name }}{{ m.table && m.table.some(p => p.k > 0) ? '（吸收，不可作入射介质）' : '' }}
          </option>
        </select>
      </label>
      <label>基底（半无限）
        <select v-model="state.stack.substrateId">
          <option v-for="m in MATERIALS" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </label>
    </div>
    <p class="hint">入射介质须无损（κ=0 的材料才可作为入射介质），否则入射/反射光强无定义。</p>

    <table class="layers">
      <thead>
        <tr>
          <th>#</th><th>材料</th>
          <th>n @ {{ monitoringLambda.toFixed(0) }}nm</th><th>κ</th>
          <th>厚度 / nm</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(l, i) in state.stack.layers" :key="l.id">
          <td>{{ i + 1 }}</td>
          <td>
            <select v-model="l.materialId">
              <option v-for="m in MATERIALS" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </td>
          <td>{{ nkOf(l.materialId)?.n.toFixed(4) }}</td>
          <td :class="{ absorb: (nkOf(l.materialId)?.k ?? 0) > 1e-12 }">
            {{ nkOf(l.materialId)?.k.toExponential(2) }}
          </td>
          <td><input type="number" v-model.number="l.thicknessNm" min="0" step="1" class="num" /></td>
          <td class="ops">
            <button @click="moveLayer(i, -1)" title="上移">↑</button>
            <button @click="moveLayer(i, 1)" title="下移">↓</button>
            <button @click="removeLayer(i)" title="删除">✕</button>
          </td>
        </tr>
        <tr v-if="state.stack.layers.length === 0">
          <td colspan="6" class="hint">无膜层 —— 裸基底界面</td>
        </tr>
      </tbody>
    </table>
    <div class="row">
      <button @click="addLayer">＋ 添加膜层</button>
      <button @click="showCustom = !showCustom">自定义材料…</button>
    </div>

    <div v-if="showCustom" class="custom-mat">
      <p class="hint">常数折射率材料（无色散）。κ 为消光系数，<b>κ&gt;0 即吸收</b>，请按实际数据填写，不默认无损。</p>
      <label>名称 <input v-model="cName" placeholder="如：某聚合物" /></label>
      <label>n <input type="number" v-model.number="cN" step="0.01" min="0.01" class="num" /></label>
      <label>κ <input type="number" v-model.number="cK" step="0.001" min="0" class="num" /></label>
      <button @click="addCustom">添加</button>
    </div>
  </section>
</template>

<style scoped>
.layers { border-collapse: collapse; width: 100%; font-size: 13px; }
.layers th, .layers td { border: 1px solid #334155; padding: 3px 6px; text-align: left; }
.num { width: 80px; }
.ops button { margin-right: 2px; padding: 0 6px; }
.absorb { color: #f87171; font-weight: 600; }
.custom-mat { margin-top: 8px; padding: 8px; border: 1px dashed #475569; border-radius: 6px; display: flex; gap: 8px; flex-wrap: wrap; align-items: end; }
.row { display: flex; gap: 12px; margin: 8px 0; flex-wrap: wrap; }
</style>
