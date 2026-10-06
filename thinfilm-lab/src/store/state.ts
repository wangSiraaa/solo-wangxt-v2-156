import { computed, reactive, ref } from 'vue'
import type { Stack } from '../optics/types'
import { runSweep, type SweepConfig } from '../optics/sweep'
import { exampleQuarterWave } from '../optics/examples'

/** 全局实验台状态（单例，纯浏览器，无后端） */
export const state = reactive({
  stack: exampleQuarterWave.buildStack() as Stack,
  sweep: exampleQuarterWave.buildSweep() as SweepConfig,
  /** 自定义材料计数，用于触发材料下拉刷新 */
  materialsVersion: 0,
})

/** 谱线计算结果（响应式，膜系/扫描参数变化即重算） */
export const sweepResult = computed(() => runSweep(state.stack, state.sweep))

/** 谱图上拾取的点（x 为波长 nm 或角度 °，取决于扫描模式） */
export const pickedX = ref<number | null>(null)

/** 由拾取点得到实际计算用 (λ, θ) */
export function pickedLambdaTheta(): { lambdaNm: number; thetaDeg: number } | null {
  if (pickedX.value === null) return null
  const s = state.sweep
  return s.mode === 'wavelength'
    ? { lambdaNm: pickedX.value, thetaDeg: s.fixedAngleDeg }
    : { lambdaNm: s.fixedLambdaNm, thetaDeg: pickedX.value }
}
