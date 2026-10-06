<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import Plotly, { type PlotlyHTMLElement } from 'plotly.js-dist-min'
import { state, sweepResult, pickedX } from '../store/state'

const plotEl = ref<HTMLElement | null>(null)
let gd: PlotlyHTMLElement | null = null
let clickBound = false

function buildTraces(): Record<string, unknown>[] {
  const res = sweepResult.value
  const xs = res.points.map((p) => p.x)
  const traces: Record<string, unknown>[] = []
  const push = (name: string, ys: (number | undefined)[], color: string, dash: string) =>
    traces.push({ x: xs, y: ys, name, mode: 'lines', line: { color, dash }, hovertemplate: '%{y:.5f}' })
  const s = state.sweep
  if (s.pol === 's' || s.pol === 'both') {
    push('R_s', res.points.map((p) => p.Rs), '#3b82f6', 'solid')
    push('T_s', res.points.map((p) => p.Ts), '#22c55e', 'solid')
    if (res.hasAbsorption) push('A_s', res.points.map((p) => p.As), '#ef4444', 'solid')
  }
  if (s.pol === 'p' || s.pol === 'both') {
    push('R_p', res.points.map((p) => p.Rp), '#3b82f6', 'dash')
    push('T_p', res.points.map((p) => p.Tp), '#22c55e', 'dash')
    if (res.hasAbsorption) push('A_p', res.points.map((p) => p.Ap), '#ef4444', 'dash')
  }
  return traces
}

function render() {
  if (!plotEl.value) return
  const s = state.sweep
  const xTitle = s.mode === 'wavelength' ? '波长 λ / nm' : '入射角 θ / °'
  const layout: Record<string, unknown> = {
    margin: { t: 30, r: 20, b: 50, l: 60 },
    xaxis: { title: xTitle, gridcolor: '#1e293b', color: '#94a3b8' },
    yaxis: { title: 'R / T / A', range: [0, 1.02], gridcolor: '#1e293b', color: '#94a3b8' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    legend: { orientation: 'h', y: 1.12, font: { color: '#cbd5e1' } },
    shapes:
      pickedX.value === null
        ? []
        : [{
            type: 'line', x0: pickedX.value, x1: pickedX.value, y0: 0, y1: 1.02,
            line: { color: '#fbbf24', width: 1.5, dash: 'dot' },
          }],
  }
  Plotly.react(plotEl.value, buildTraces(), layout, {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  }).then((g) => {
    gd = g
    if (!clickBound) {
      clickBound = true
      gd.on('plotly_click', (ev) => {
        if (ev.points.length > 0) pickedX.value = ev.points[0].x
      })
    }
  })
}

onMounted(render)
watch([sweepResult, pickedX], render)
</script>

<template>
  <div ref="plotEl" class="plot"></div>
</template>

<style scoped>
.plot { width: 100%; height: 460px; }
</style>
