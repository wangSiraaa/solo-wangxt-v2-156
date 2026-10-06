<script setup lang="ts">
import { state } from '../store/state'
</script>

<template>
  <section class="panel">
    <h2>扫描设置</h2>
    <div class="grid">
      <label>扫描量
        <select v-model="state.sweep.mode">
          <option value="wavelength">波长（固定角度）</option>
          <option value="angle">入射角（固定波长）</option>
        </select>
      </label>
      <template v-if="state.sweep.mode === 'wavelength'">
        <label>λ 起点 / nm <input type="number" v-model.number="state.sweep.start" step="10" /></label>
        <label>λ 终点 / nm <input type="number" v-model.number="state.sweep.end" step="10" /></label>
        <label>入射角 θ / ° <input type="number" v-model.number="state.sweep.fixedAngleDeg" step="1" min="0" max="89.9" /></label>
      </template>
      <template v-else>
        <label>θ 起点 / ° <input type="number" v-model.number="state.sweep.start" step="1" min="0" max="89.9" /></label>
        <label>θ 终点 / ° <input type="number" v-model.number="state.sweep.end" step="1" min="0" max="89.9" /></label>
        <label>波长 λ / nm <input type="number" v-model.number="state.sweep.fixedLambdaNm" step="10" /></label>
      </template>
      <label>采样点数 <input type="number" v-model.number="state.sweep.points" min="2" max="2000" step="50" /></label>
      <label>偏振
        <select v-model="state.sweep.pol">
          <option value="both">s + p</option>
          <option value="s">仅 s（TE）</option>
          <option value="p">仅 p（TM）</option>
        </select>
      </label>
    </div>
    <p class="hint">单位约定：波长与厚度为 nm，入射角为度（°，自法线起算）。θ 上限 89.9°，90° 为模型奇异点。</p>
  </section>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px 16px; }
label { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
</style>
