<script setup lang="ts">
import { computed } from 'vue'
import { state, pickedX, pickedLambdaTheta } from '../store/state'
import { computeRT, diagnoseLayers } from '../optics/matrix'

const info = computed(() => {
  const lt = pickedLambdaTheta()
  if (!lt) return null
  const { lambdaNm, thetaDeg } = lt
  const s = computeRT(state.stack, lambdaNm, thetaDeg, 's')
  const p = computeRT(state.stack, lambdaNm, thetaDeg, 'p')
  return {
    lambdaNm, thetaDeg, s, p,
    layers: diagnoseLayers(state.stack, lambdaNm, thetaDeg),
  }
})

const fmt = (x: number, d = 4) => x.toFixed(d)
</script>

<template>
  <section class="panel">
    <h2>谱峰溯源 <span class="unit-note">点击谱图任意点，反查该处各膜层参数</span></h2>
    <p v-if="!info" class="hint">尚未拾取谱点。在右侧谱图上点击，例如点击某个反射峰/透射谷。</p>
    <template v-else>
      <p>
        拾取点：λ = <b>{{ fmt(info.lambdaNm, 1) }} nm</b>，θ = <b>{{ fmt(info.thetaDeg, 2) }}°</b>
        <button class="clear" @click="pickedX = null">清除</button>
      </p>
      <table class="rta">
        <thead><tr><th>偏振</th><th>R</th><th>T</th><th>A = 1−R−T</th><th>R+T</th></tr></thead>
        <tbody>
          <tr>
            <td>s</td><td>{{ fmt(info.s.R) }}</td><td>{{ fmt(info.s.T) }}</td>
            <td :class="{ neg: info.s.A < -1e-9 }">{{ fmt(info.s.A, 6) }}</td>
            <td>{{ fmt(info.s.R + info.s.T, 8) }}</td>
          </tr>
          <tr>
            <td>p</td><td>{{ fmt(info.p.R) }}</td><td>{{ fmt(info.p.T) }}</td>
            <td :class="{ neg: info.p.A < -1e-9 }">{{ fmt(info.p.A, 6) }}</td>
            <td>{{ fmt(info.p.R + info.p.T, 8) }}</td>
          </tr>
        </tbody>
      </table>

      <h3>各膜层在该波长的光学厚度</h3>
      <table class="rta" v-if="info.layers.length">
        <thead>
          <tr><th>#</th><th>材料</th><th>n</th><th>κ</th><th>n·d / nm</th>
            <th>λ/4 倍数 q</th><th>判据</th></tr>
        </thead>
        <tbody>
          <tr v-for="l in info.layers" :key="l.layerIndex">
            <td>{{ l.layerIndex }}</td><td>{{ l.materialName }}</td>
            <td>{{ fmt(l.n) }}</td><td>{{ l.k.toExponential(2) }}</td>
            <td>{{ fmt(l.opticalThicknessNm, 1) }}</td>
            <td>{{ fmt(l.quarterWaveUnits, 3) }}</td>
            <td>
              <span v-if="l.complexPhase" class="tag warn">吸收层：复相位，q 为正入射近似</span>
              <span v-else-if="l.nearQuarterWave" class="tag qw">≈ 四分之一波层（相长/相消干涉主导）</span>
              <span v-else-if="l.nearHalfWave" class="tag hw">≈ 半波层（该波长处光学上“缺席”）</span>
              <span v-else class="tag">失谐</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">无膜层 —— 谱形完全由基底界面的 Fresnel 系数决定。</p>
      <p class="hint">
        用法：谱峰/谷的位置由满足四分之一波（或半波）条件的波长决定。调整某层厚度使 q 接近奇数（λ/4 奇数倍）
        可增强该层对谱形的控制；q 接近偶数时该层在该波长近乎透明（半波缺席层）。
      </p>
    </template>
  </section>
</template>

<style scoped>
.rta { border-collapse: collapse; font-size: 13px; margin: 8px 0; }
.rta th, .rta td { border: 1px solid #334155; padding: 3px 8px; }
.neg { color: #f87171; }
.tag { font-size: 12px; padding: 1px 6px; border-radius: 4px; background: #334155; }
.tag.qw { background: #1d4ed8; color: #fff; }
.tag.hw { background: #15803d; color: #fff; }
.tag.warn { background: #92400e; color: #fff; }
.clear { margin-left: 12px; font-size: 12px; }
</style>
