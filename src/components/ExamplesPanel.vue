<script setup lang="ts">
import { ref } from 'vue'
import { useStore } from '../lib/store'
import { EXAMPLES, type CheckItem, type ExamplePreset } from '../lib/examples'
import { computeAt } from '../lib/physics'

const store = useStore()
const activeId = ref<string | null>(null)
const checkedId = ref<string | null>(null)
const results = ref<Record<string, CheckStatus>>({})

interface CheckStatus {
  pass: boolean
  detail: string
}

function load(ex: ExamplePreset) {
  // 把预设整体写入 store（保留材料 id 一致性）
  store.applyPreset(ex)
  activeId.value = ex.id
}

function runChecks(ex: ExamplePreset) {
  const model = store.stackModel.value
  const out: Record<string, CheckStatus> = {}
  for (const c of ex.checks) {
    if (c.referenceOnly) continue
    const p = computeAt(model, c.wl, c.angleDeg, c.pol)
    if (c.type === 'analytic') {
      const got = c.kind === 'R' ? p.R : p.T
      const ok = Math.abs(got - c.expected) <= c.tol
      out[c.label] = {
        pass: ok,
        detail: `数值 ${got.toFixed(4)} / 解析 ${c.expected.toFixed(4)}，偏差 ${Math.abs(got - c.expected).toExponential(1)}`
      }
    } else if (c.type === 'conservation') {
      const sum = p.R + p.T
      const ok = Math.abs(sum - c.expected) <= c.tol
      out[c.label] = {
        pass: ok,
        detail: `R+T = ${sum.toFixed(5)}（期望 1 ± ${c.tol}），A = ${p.A.toExponential(1)}`
      }
    } else if (c.type === 'absorption') {
      const min = c.minAbsorbed ?? 0.05
      const ok = p.A >= min
      out[c.label] = {
        pass: ok,
        detail: `R=${p.R.toFixed(3)}, T=${p.T.toFixed(3)}, A=${p.A.toFixed(3)}（要求 A>${min}，确认存在真实能量缺口）`
      }
    }
  }
  results.value = out
  checkedId.value = ex.id
}

const active = () => EXAMPLES.find((e) => e.id === activeId.value) ?? null
const isChecked = (ex: ExamplePreset) => checkedId.value === ex.id
</script>

<template>
  <div class="panel">
    <h2>解析算例与基准核对</h2>
    <p class="note">
      以下算例用<strong>独立的闭式公式</strong>给出参考值（非同一套矩阵代码自证）。
      载入后可随意修改膜层参数观察偏离；当条件超出闭式公式适用范围时，核对项会直接失败——
      那是模型边界提示，不是程序错误。
    </p>

    <div v-for="ex in EXAMPLES" :key="ex.id" style="border-bottom: 1px solid var(--border); padding: 8px 0">
      <div class="row" style="justify-content: space-between; align-items: center">
        <strong>{{ ex.title }}</strong>
        <div class="row shrink" style="gap: 4px">
          <button class="mini-btn" @click="load(ex)">载入</button>
          <button class="mini-btn primary" @click="load(ex); runChecks(ex)">载入并核对</button>
        </div>
      </div>
      <div v-if="active()?.id === ex.id">
        <p class="note" style="margin: 6px 0">{{ ex.description }}</p>
        <ul class="note" style="margin: 4px 0; padding-left: 18px">
          <li v-for="(a, i) in ex.assumptions" :key="i">适用条件：{{ a }}</li>
        </ul>
        <div v-if="isChecked(ex)" style="margin-top: 6px">
          <template v-for="c in ex.checks" :key="c.label">
            <div v-if="!c.referenceOnly" class="check-row">
              <span style="flex: 1">
                <span :class="results[c.label]?.pass ? 'badge-ok' : 'badge-err'">
                  {{ results[c.label]?.pass ? '✔ 通过' : '✘ 未通过' }}
                </span>
                {{ c.label }}
                <div class="note mono">{{ results[c.label]?.detail }}</div>
              </span>
            </div>
            <div v-else class="check-row">
              <span style="flex: 1">
                <span class="tag">参考值</span>
                {{ c.label }}：<span class="mono">R = {{ c.expected.toFixed(4) }}</span>
                <div class="note">{{ c.referenceHint }}</div>
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
