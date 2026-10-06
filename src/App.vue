<script setup lang="ts">
import { ref } from 'vue'
import StackEditor from './components/StackEditor.vue'
import ScanControls from './components/ScanControls.vue'
import MaterialManager from './components/MaterialManager.vue'
import ResultsPanel from './components/ResultsPanel.vue'
import ExamplesPanel from './components/ExamplesPanel.vue'
import SchemePanel from './components/SchemePanel.vue'
import { useStore } from './lib/store'

const store = useStore()
const leftTab = ref<'stack' | 'materials' | 'examples'>('stack')
</script>

<template>
  <header style="margin-bottom: 10px">
    <h1>多层薄膜 反射/透射 实验台 <span class="tag">纯浏览器 · 传输矩阵法 · Vue 3 + mathjs + Plotly</span></h1>
    <div class="note">
      单位约定：波长与厚度 = nm，入射角 = 度（相对界面法线），折射率 ñ = n + i k（k&gt;0 为吸收）。
      s(TE)/p(TM) 偏振分别计算；色散材料按数据表线性插值。
      本工具计算的是<strong>理想相干平面波模型</strong>，不等于任何实物镀膜的实测结果。
    </div>
  </header>

  <div class="layout">
    <div class="col">
      <div class="tabs">
        <button :class="{ active: leftTab === 'stack' }" @click="leftTab = 'stack'">膜层与参数</button>
        <button :class="{ active: leftTab === 'materials' }" @click="leftTab = 'materials'">材料库</button>
        <button :class="{ active: leftTab === 'examples' }" @click="leftTab = 'examples'">算例核对</button>
      </div>

      <template v-if="leftTab === 'stack'">
        <StackEditor />
        <ScanControls />
        <SchemePanel />
      </template>
      <MaterialManager v-else-if="leftTab === 'materials'" />
      <ExamplesPanel v-else />

      <div class="panel">
        <h2>模型能力边界（先读这里，再下结论）</h2>
        <ul class="note" style="margin: 0; padding-left: 18px">
          <li>每层为<strong>均匀、各向同性、非磁性</strong>的平面平行膜，界面理想平整；不包含粗糙度散射、厚度不均匀、膜层扩散/氧化。</li>
          <li>全相干计算：厚基底、宽谱光源中的干涉条纹与实测（常含非相干平均）不一致时属模型预期，不是 bug。</li>
          <li>材料 n,k 只在数据表覆盖波段可靠；内置金属数据为教学选点，精度不足以做镀膜定量设计。</li>
          <li>不处理磁光、各向异性、非线性、增益介质、倏逝波耦合结构（棱镜耦合/SPP 近场）、有限光束与锥形入射。</li>
          <li>入射介质必须无损，否则 R/T 失去标准定义；此时界面会明确警告而非给出貌似正常的数字。</li>
          <li>结果用于课程原理验证与参数趋势分析。<strong>不能冒充真实镀膜的成品性能</strong>；实物结果以实测光谱为准。</li>
        </ul>
        <div class="row" style="margin-top: 8px">
          <button @click="store.resetAll()" class="danger">恢复默认膜系（空气|MgF₂|BK7）</button>
        </div>
      </div>
    </div>

    <ResultsPanel />
  </div>
</template>
