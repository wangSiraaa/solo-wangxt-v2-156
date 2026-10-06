<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Data } from 'plotly.js'
import { useStore } from '../lib/store'
import { scanWavelength, scanAngle, computeAt } from '../lib/physics'
import PlotSpectrum from './PlotSpectrum.vue'

const store = useStore()
const { state } = store

const showBothPol = ref(true)
const probeWl = ref(550)
const angleScanEnd = ref(89)

/** s、p 两条谱各扫一次（点数可控，开销小） */
const scan = computed(() => {
  const p = state.params
  const s = scanWavelength(store.stackModel.value, p.wlStart, p.wlEnd, p.wlPoints, p.angleDeg, 's')
  const pScan =
    p.polarization === 's'
      ? scanWavelength(store.stackModel.value, p.wlStart, p.wlEnd, p.wlPoints, p.angleDeg, 'p')
      : null
  return { s, pScan }
})

const specData = computed<Data[]>(() => {
  const { s, pScan } = scan.value
  const wl = s.points.map((q) => q.wl)
  const main = state.params.polarization === 's' ? s : pScan!
  const pol = state.params.polarization
  const traces: Data[] = [
    { x: wl, y: main.points.map((q) => q.R), type: 'scatter', mode: 'lines',
      name: `R (${pol})`, line: { color: '#ef6b6b', width: 2 } },
    { x: wl, y: main.points.map((q) => q.T), type: 'scatter', mode: 'lines',
      name: `T (${pol})`, line: { color: '#43c08a', width: 2 } },
    { x: wl, y: main.points.map((q) => q.A), type: 'scatter', mode: 'lines',
      name: `A=1−R−T (${pol})`, line: { color: '#e8b341', width: 1.5, dash: 'dash' } }
  ]
  if (showBothPol.value) {
    const other = pol === 's' ? pScan! : s
    const otherPol = pol === 's' ? 'p' : 's'
    traces.push({ x: wl, y: other.points.map((q) => q.R), type: 'scatter', mode: 'lines',
      name: `R (${otherPol}) 对照`, line: { color: '#c77bff', width: 1, dash: 'dot' } })
  }
  return traces
})

const specLayout = computed(() => ({
  title: { text: `反射/透射/吸收谱（入射角 ${state.params.angleDeg}°）` },
  xaxis: { title: { text: '波长 (nm)' }, range: [state.params.wlStart, state.params.wlEnd] },
  yaxis: { title: { text: '能量比 R, T, A' }, range: [0, 1.02] },
  hovermode: 'x unified' as const
}))

/** 角度扫描（固定探针波长） */
const angleData = computed<Data[]>(() => {
  const end = Math.min(89.9, Math.max(1, angleScanEnd.value))
  const ss = scanAngle(store.stackModel.value, probeWl.value, end, 361, 's')
  const pp = scanAngle(store.stackModel.value, probeWl.value, end, 361, 'p')
  return [
    {
      x: ss.map((q) => q.angleDeg),
      y: ss.map((q) => q.R),
      type: 'scatter', mode: 'lines', name: 'R_s',
      line: { color: '#ef6b6b', width: 2 }
    },
    {
      x: pp.map((q) => q.angleDeg),
      y: pp.map((q) => q.R),
      type: 'scatter', mode: 'lines', name: 'R_p',
      line: { color: '#c77bff', width: 2 }
    },
    {
      x: ss.map((q) => q.angleDeg),
      y: ss.map((q) => q.T),
      type: 'scatter', mode: 'lines', name: 'T_s',
      line: { color: '#43c08a', width: 1.5, dash: 'dash' }
    },
    {
      x: pp.map((q) => q.angleDeg),
      y: pp.map((q) => q.T),
      type: 'scatter', mode: 'lines', name: 'T_p',
      line: { color: '#7fd1ff', width: 1.5, dash: 'dash' }
    }
  ]
})

const angleLayout = computed(() => ({
  title: { text: `角扫描（固定波长 ${probeWl.value} nm）：掠入射 / 布儒斯特角` },
  xaxis: { title: { text: '入射角 (度)' }, range: [0, angleScanEnd.value] },
  yaxis: { title: { text: '能量比' }, range: [0, 1.02] },
  hovermode: 'x unified' as const
}))

/** 探针波长处的单点数值，供“谱峰→参数”追踪 */
const probe = computed(() => {
  const wl = Math.min(Math.max(probeWl.value, state.params.wlStart), state.params.wlEnd)
  const p = state.params
  return {
    wl,
    s: computeAt(store.stackModel.value, wl, p.angleDeg, 's'),
    p: computeAt(store.stackModel.value, wl, p.angleDeg, 'p')
  }
})

/** 扫描范围内最大偏离 |R+T−1| —— 无损时应为数值误差，有吸收时为真实缺口 */
const conservation = computed(() => {
  const pts = (state.params.polarization === "s" ? scan.value.s : scan.value.pScan!).points
  let maxGap = 0
  let gapWl = pts[0]?.wl ?? 0
  let anyAbsorb = false
  for (const q of pts) {
    const gap = Math.abs(1 - q.R - q.T)
    if (gap > maxGap) {
      maxGap = gap
      gapWl = q.wl
    }
    if (q.A > 1e-6) anyAbsorb = true
  }
  return { maxGap, gapWl, anyAbsorb }
})

/** 谱峰/谷定位：当前偏振 R 的极大/极小 */
const extrema = computed(() => {
  const pts = (state.params.polarization === "s" ? scan.value.s : scan.value.pScan!).points
  const peaks: { wl: number; R: number }[] = []
  const valleys: { wl: number; R: number }[] = []
  for (let i = 2; i < pts.length - 2; i++) {
    const win = [pts[i - 2].R, pts[i - 1].R, pts[i].R, pts[i + 1].R, pts[i + 2].R]
    if (win[2] === Math.max(...win)) peaks.push({ wl: pts[i].wl, R: pts[i].R })
    if (win[2] === Math.min(...win)) valleys.push({ wl: pts[i].wl, R: pts[i].R })
  }
  return {
    peaks: peaks.sort((a, b) => b.R - a.R).slice(0, 5),
    valleys: valleys.sort((a, b) => a.R - b.R).slice(0, 5)
  }
})
</script>

<template>
  <div class="col">
    <div class="panel">
      <div class="row" style="justify-content: space-between">
        <h2 style="margin: 0">光谱</h2>
        <label class="row shrink note" style="align-items: center; gap: 4px; margin: 0">
          <input type="checkbox" v-model="showBothPol" style="width: auto" />
          叠加另一偏振的 R 作对照
        </label>
      </div>
      <div class="plot plot-tall">
        <PlotSpectrum :data="specData" :layout="specLayout" />
      </div>

      <div v-if="scan.s.extrapolated" class="warn-box">
        部分波长超出了色散表数据范围，折射率按最近端点钳制——该波段谱线不可作为定量结论。
        请在材料库中扩展数据点，或缩小扫描波段。
      </div>
      <div v-if="scan.s.incidentAbsorbing" class="warn-box">
        入射介质存在吸收，R/T 的标准能量定义不适用（见膜层编辑区说明）。
      </div>

      <div class="info-box">
        <strong>能量守恒核对：</strong>
        当前偏振扫描中最大 |1 − R − T| =
        <span class="mono">{{ conservation.maxGap.toExponential(2) }}</span>
        （出现于 {{ conservation.gapWl.toFixed(1) }} nm）。
        <template v-if="conservation.anyAbsorb">
          膜系含吸收材料，R+T&lt;1 是物理正确的能量缺口 A，
          <strong>不会</strong>被强制归一；A 曲线（虚线）即膜层吸收份额。
        </template>
        <template v-else>
          全部介质无损，R+T 在数值精度内等于 1（1e-6 量级为计算舍入）。
        </template>
      </div>
    </div>

    <div class="panel">
      <h2>谱峰/谱谷定位与探针（从谱线追到膜层参数）</h2>
      <div class="row">
        <div>
          <label>探针波长 (nm)</label>
          <input type="number" v-model.number="probeWl" :min="state.params.wlStart" :max="state.params.wlEnd" />
        </div>
        <div class="shrink" style="flex: 2">
          <label>探针读数（入射角 {{ state.params.angleDeg }}°）</label>
          <table>
            <thead>
              <tr><th>偏振</th><th>R</th><th>T</th><th>A</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>s</td>
                <td class="mono">{{ probe.s.R.toFixed(4) }}</td>
                <td class="mono">{{ probe.s.T.toFixed(4) }}</td>
                <td class="mono">{{ probe.s.A.toFixed(4) }}</td>
              </tr>
              <tr>
                <td>p</td>
                <td class="mono">{{ probe.p.R.toFixed(4) }}</td>
                <td class="mono">{{ probe.p.T.toFixed(4) }}</td>
                <td class="mono">{{ probe.p.A.toFixed(4) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="row" style="margin-top: 8px" v-if="extrema.peaks.length || extrema.valleys.length">
        <div>
          <h3>R 的主要峰（点击探针定位）</h3>
          <div v-for="(e, i) in extrema.peaks" :key="'p' + i">
            <button class="mini-btn" style="width: 100%; text-align: left" @click="probeWl = e.wl">
              {{ e.wl.toFixed(1) }} nm，R={{ e.R.toFixed(4) }}
            </button>
          </div>
        </div>
        <div>
          <h3>R 的主要谷</h3>
          <div v-for="(e, i) in extrema.valleys" :key="'v' + i">
            <button class="mini-btn" style="width: 100%; text-align: left" @click="probeWl = e.wl">
              {{ e.wl.toFixed(1) }} nm，R={{ e.R.toFixed(4) }}
            </button>
          </div>
        </div>
      </div>
      <p class="note">
        用法：点击峰/谷按钮把探针移到该波长，再回膜层表调整对应层厚度或换材料，
        观察峰位移动与峰高变化（例如 λ/4 膜的谷位 λ₀ ≈ 4 n d）。
      </p>
    </div>

    <div class="panel">
      <h2>角扫描（掠入射边界）</h2>
      <label>角度扫描上限 (度)</label>
      <input type="number" min="1" max="89.99" step="1" v-model.number="angleScanEnd" style="max-width: 160px" />
      <div class="plot">
        <PlotSpectrum :data="angleData" :layout="angleLayout" />
      </div>
      <p class="note">
        裸界面上可找到 p 偏振反射为零的布儒斯特角；两种偏振在 90° 极限都趋于全反射。
        若入射侧折射率大于基底（如玻璃→空气），超过临界角后 T=0、R=1（全内反射）。
      </p>
    </div>
  </div>
</template>
