<script setup lang="ts">
import { useStore } from '../lib/store'

const store = useStore()
const { state } = store
</script>

<template>
  <div class="panel">
    <h2>扫描参数</h2>
    <div class="row">
      <div>
        <label>起始波长 (nm)</label>
        <input type="number" min="1" step="10" v-model.number="state.params.wlStart" />
      </div>
      <div>
        <label>终止波长 (nm)</label>
        <input type="number" min="1" step="10" v-model.number="state.params.wlEnd" />
      </div>
    </div>
    <div class="row">
      <div>
        <label>采样点数</label>
        <input type="number" min="11" max="4001" step="10" v-model.number="state.params.wlPoints" />
      </div>
      <div>
        <label>入射角 (度，相对法线)</label>
        <input type="number" min="0" max="89.99" step="1" v-model.number="state.params.angleDeg" />
      </div>
    </div>
    <label>偏振</label>
    <div class="row">
      <button
        :class="{ primary: state.params.polarization === 's' }"
        @click="state.params.polarization = 's'"
      >
        s 偏振 (TE，电场垂直入射面)
      </button>
      <button
        :class="{ primary: state.params.polarization === 'p' }"
        @click="state.params.polarization = 'p'"
      >
        p 偏振 (TM，磁场垂直入射面)
      </button>
    </div>
    <p class="note">
      角度范围 0–89.99°；90° 为严格掠入射极限（反射率→1），可在角度扫描中逼近观察。
      非偏振光实验结果约为 s/p 两条谱的算术平均，本工具分别计算、不做混合。
    </p>
  </div>
</template>
