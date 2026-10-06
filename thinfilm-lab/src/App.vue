<script setup lang="ts">
import { onMounted } from 'vue'
import { state, sweepResult, pickedX } from './store/state'
import { EXAMPLES } from './optics/examples'
import { loadCustomMaterials } from './optics/materials'
import LayerEditor from './components/LayerEditor.vue'
import SweepConfig from './components/SweepConfig.vue'
import SpectrumChart from './components/SpectrumChart.vue'
import PeakInspector from './components/PeakInspector.vue'
import DesignLibrary from './components/DesignLibrary.vue'
import ValidationPanel from './components/ValidationPanel.vue'
import LimitsPanel from './components/LimitsPanel.vue'

onMounted(loadCustomMaterials)

function loadExample(id: string) {
  const ex = EXAMPLES.find((e) => e.id === id)
  if (!ex) return
  state.stack = ex.buildStack()
  state.sweep = ex.buildSweep()
  pickedX.value = null
}
</script>

<template>
  <header>
    <h1>多层薄膜反射/透射实验台</h1>
    <p class="sub">
      复数特征矩阵法 · s/p 偏振分别计算 · 色散查表插值 · 纯浏览器运行（Vue 3 + TS + mathjs + Plotly + IndexedDB），无后端
    </p>
  </header>

  <div class="examples">
    <span>解析算例：</span>
    <button v-for="ex in EXAMPLES" :key="ex.id" @click="loadExample(ex.id)" :title="ex.description">
      {{ ex.title }}
    </button>
  </div>
  <p class="exdesc" v-if="EXAMPLES.length">
    {{ EXAMPLES.map(e => e.analyticNote).join('　｜　') }}
  </p>

  <main>
    <div class="left">
      <LayerEditor />
      <SweepConfig />
      <DesignLibrary />
      <ValidationPanel />
      <LimitsPanel />
    </div>
    <div class="right">
      <div class="energy" :class="{ absorb: sweepResult.hasAbsorption }">
        <template v-if="sweepResult.hasAbsorption">
          ⚠ 膜系含吸收介质：A = 1−R−T ≥ 0，<b>不强制 R+T=1</b>（谱图中已绘出 A 曲线）
        </template>
        <template v-else-if="sweepResult.energyResidual !== null">
          ✓ 无损膜系能量守恒：max|R+T−1| = {{ sweepResult.energyResidual.toExponential(2) }}
        </template>
      </div>
      <div v-for="w in sweepResult.rangeWarnings" :key="w" class="warn">⚠ {{ w }}</div>
      <SpectrumChart />
      <PeakInspector />
    </div>
  </main>
</template>

<style scoped>
header { padding: 16px 24px 8px; }
h1 { font-size: 20px; margin: 0; }
.sub { color: #94a3b8; font-size: 13px; margin: 4px 0 0; }
.examples { padding: 8px 24px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.exdesc { padding: 0 24px; font-size: 12px; color: #64748b; margin: 0 0 4px; }
main { display: grid; grid-template-columns: minmax(420px, 5fr) 7fr; gap: 16px; padding: 8px 24px 24px; }
@media (max-width: 1100px) { main { grid-template-columns: 1fr; } }
.left, .right { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.energy { padding: 8px 12px; border-radius: 6px; background: #052e16; color: #4ade80; font-size: 13px; }
.energy.absorb { background: #451a03; color: #fbbf24; }
.warn { padding: 6px 12px; border-radius: 6px; background: #422006; color: #fbbf24; font-size: 12px; }
</style>
