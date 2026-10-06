<script setup lang="ts">
import { computed } from 'vue'
import { computeRT } from '../optics/matrix'
import { getMaterial, nkAt } from '../optics/materials'
import {
  quarterWaveSingleLayerR, symmetricStackR, interfaceR, brewsterDeg,
} from '../optics/analytics'
import { exampleQuarterWave, exampleSymmetricStack } from '../optics/examples'

const nAt = (id: string, l: number) => nkAt(getMaterial(id), l).n

interface Check { name: string; numeric: number; analytic: number; diff: number }

/** 三个解析算例的实时核对：数值求解器 vs 封闭公式 */
const checks = computed<Check[]>(() => {
  const out: Check[] = []
  const push = (name: string, numeric: number, analytic: number) =>
    out.push({ name, numeric, analytic, diff: Math.abs(numeric - analytic) })

  // 算例 1：四分之一波单层
  const s1 = exampleQuarterWave.buildStack()
  push(
    '¼波单层 R(550nm, 0°)',
    computeRT(s1, 550, 0, 's').R,
    quarterWaveSingleLayerR(1, nAt('mgf2', 550), nAt('bk7', 550)),
  )
  // 算例 2：对称多层 (HL)^5 H
  const s2 = exampleSymmetricStack.buildStack()
  push(
    '(HL)⁵H 高反堆 R(550nm, 0°)',
    computeRT(s2, 550, 0, 's').R,
    symmetricStackR(1, nAt('ta2o5', 550), nAt('sio2', 550), nAt('bk7', 550), 5),
  )
  // 算例 3：掠入射 + 布儒斯特
  const bare = { ambientId: 'air', substrateId: 'bk7', layers: [] }
  const nb = nAt('bk7', 550)
  push('布儒斯特角 R_p', computeRT(bare, 550, brewsterDeg(1, nb), 'p').R, 0)
  push('掠入射 R_s(89.9°)', computeRT(bare, 550, 89.9, 's').R, interfaceR(1, nb, 89.9, 's').R)
  push('掠入射 R_p(89.9°)', computeRT(bare, 550, 89.9, 'p').R, interfaceR(1, nb, 89.9, 'p').R)
  return out
})
</script>

<template>
  <section class="panel">
    <h2>解析验证 <span class="unit-note">数值求解器 vs 封闭公式（实时核对）</span></h2>
    <table class="chk">
      <thead><tr><th>算例</th><th>数值解</th><th>解析解</th><th>|差|</th><th></th></tr></thead>
      <tbody>
        <tr v-for="c in checks" :key="c.name">
          <td>{{ c.name }}</td>
          <td>{{ c.numeric.toFixed(10) }}</td>
          <td>{{ c.analytic.toFixed(10) }}</td>
          <td>{{ c.diff.toExponential(2) }}</td>
          <td :class="c.diff < 1e-8 ? 'ok' : 'bad'">{{ c.diff < 1e-8 ? '✓' : '✗' }}</td>
        </tr>
      </tbody>
    </table>
    <p class="hint">
      以上核对在每次材料数据变化后自动重算；同样的断言也以自动化测试（vitest，12 例）随源码提供，
      包括无损膜系 R+T=1（斜入射、双偏振）与吸收膜 A&gt;0 且不强制 R+T=1。
    </p>
  </section>
</template>

<style scoped>
.chk { border-collapse: collapse; font-size: 12px; width: 100%; }
.chk th, .chk td { border: 1px solid #334155; padding: 3px 6px; }
.ok { color: #4ade80; } .bad { color: #f87171; }
</style>
