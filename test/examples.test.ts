/* 端到端算例核对（Node）：模拟 ExamplesPanel 的“载入并核对”逻辑，
 * 走 store.applyPreset + physics.computeAt（含色散插值），而非裸矩阵。 */
import { useStore } from '../src/lib/store'
import { EXAMPLES } from '../src/lib/examples'
import { computeAt } from '../src/lib/physics'

let fails = 0
for (const ex of EXAMPLES) {
  const store = useStore()
  store.applyPreset(ex)
  console.log(`\n【${ex.title}】`)
  for (const c of ex.checks) {
    if (c.referenceOnly) continue
    const p = computeAt(store.stackModel.value, c.wl, c.angleDeg, c.pol)
    let pass: boolean
    let detail: string
    if (c.type === 'analytic') {
      const got = c.kind === 'R' ? p.R : p.T
      pass = Math.abs(got - c.expected) <= c.tol
      detail = `${got.toFixed(5)} vs ${c.expected.toFixed(5)} (±${c.tol})`
    } else if (c.type === 'conservation') {
      pass = Math.abs(p.R + p.T - 1) <= c.tol
      detail = `R+T=${(p.R + p.T).toFixed(6)}, A=${p.A.toExponential(1)}`
    } else {
      const min = c.minAbsorbed ?? 0.05
      pass = p.A >= min
      detail = `R=${p.R.toFixed(3)} T=${p.T.toFixed(3)} A=${p.A.toFixed(3)} (需 A>${min})`
    }
    if (!pass) fails++
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${c.label}  [${detail}]`)
  }
}

// 额外：五层 H L H L H 扩展检查（对称算例中给出的 R₅ 参考）
{
  const ex = EXAMPLES.find((e) => e.id === 'ex-symmetric')!
  const store = useStore()
  store.applyPreset(ex)
  // 复制第 2、3 层追加为 L H，构造 H L H L H
  const layers = store.state.layers
  const l = layers[1]
  const h = layers[2]
  layers.push({ id: 'x1', materialId: l.materialId, thickness: l.thickness })
  layers.push({ id: 'x2', materialId: h.materialId, thickness: h.thickness })
  const check5 = ex.checks.find((c) => c.label.includes('五层'))!
  const p = computeAt(store.stackModel.value, check5.wl, 0, 's')
  const pass = Math.abs(p.R - check5.expected) <= check5.tol
  if (!pass) fails++
  console.log(`\n【对称扩展】\n  ${pass ? 'PASS' : 'FAIL'}  H L H L H: ${p.R.toFixed(5)} vs ${check5.expected.toFixed(5)}`)
}

console.log(fails === 0 ? '\n所有内置算例核对通过 ✔' : `\n${fails} 项失败 ✘`)
if (fails) process.exit(1)
