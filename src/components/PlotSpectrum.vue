<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { Data, Layout } from 'plotly.js'

const props = defineProps<{
  data: Data[]
  layout?: Partial<Layout>
}>()

const el = ref<HTMLElement | null>(null)

function darkLayout(): Partial<Layout> {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#c8d2e8', family: 'inherit', size: 12 },
    margin: { l: 56, r: 16, t: 30, b: 46 },
    xaxis: { gridcolor: '#2c3854', zerolinecolor: '#2c3854', linecolor: '#3c4a6e' },
    yaxis: { gridcolor: '#2c3854', zerolinecolor: '#2c3854', linecolor: '#3c4a6e' },
    legend: { bgcolor: 'rgba(24,31,48,0.8)', orientation: 'h', y: -0.18 }
  }
}

function render() {
  if (!el.value) return
  Plotly.react(el.value, props.data, { ...darkLayout(), ...props.layout }, {
    responsive: true,
    displaylogo: false
  })
}

onMounted(render)
watch(() => [props.data, props.layout], render, { deep: true })

onBeforeUnmount(() => {
  if (el.value) Plotly.purge(el.value)
})
</script>

<template>
  <div ref="el" class="plot-inner" style="width: 100%; height: 100%"></div>
</template>
