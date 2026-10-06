/* 物理基准核对（Node 环境，非浏览器）：
 * 1. 裸界面正入射菲涅耳
 * 2. 单层 λ/4 膜：TMM vs 闭式导纳
 * 3. 无损多层：R+T=1（s/p、斜入射）
 * 4. 布儒斯特角 R_p≈0
 * 5. 吸收金膜：R+T<1
 * 6. 全内反射边界
 */
import { complex } from 'mathjs'
import { computeStack } from '../src/lib/tmm'
import { quarterWaveReflectance, fresnelRs, fresnelRp, brewsterAngle } from '../src/lib/analytic'

let fails = 0
function check(name: string, got: number, expected: number, tol: number) {
  const ok = Math.abs(got - expected) <= tol
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got=${got.toExponential(4)} expected=${expected.toExponential(4)}`)
}
function checkTrue(name: string, cond: boolean, detail = '') {
  if (!cond) fails++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`)
}

const C = (n: number, k = 0) => complex(n, k)

// 1. 裸界面 空气(1)-玻璃(1.52) 正入射：R = ((1-1.52)/(1+1.52))^2
{
  const r = computeStack({ nList: [C(1), C(1.52)], dList: [], wl: 500, angleRad: 0, pol: 's' })
  const f = ((1 - 1.52) / (1 + 1.52)) ** 2
  check('裸界面正入射 R', r.R, f, 1e-12)
  check('裸界面正入射 T', r.T, 1 - f, 1e-12)
}

// 2. 单层 λ/4：n0=1, n1=1.38, ns=1.5185, d=550/(4*1.38)
{
  const wl = 550
  const n1 = 1.38
  const ns = 1.5185
  const d = wl / (4 * n1)
  const r = computeStack({ nList: [C(1), C(n1), C(ns)], dList: [d], wl, angleRad: 0, pol: 's' })
  const expected = quarterWaveReflectance({ n0: 1, nSub: ns, nLayers: [n1], quarters: [1] })
  check('λ/4 增透膜 R vs 闭式', r.R, expected, 1e-9)
  check('λ/4 能量守恒', r.R + r.T, 1, 1e-9)
}

// 3. 三层 HLH 无损，45°，s/p 守恒
{
  const wl = 550
  const nH = 2.3
  const nL = 1.38
  const stack = {
    nList: [C(1), C(nH), C(nL), C(nH), C(1.52)],
    dList: [wl / (4 * nH), wl / (4 * nL), wl / (4 * nH)],
    wl,
    angleRad: Math.PI / 4,
    pol: 's' as const
  }
  const rs = computeStack(stack)
  const rp = computeStack({ ...stack, pol: 'p' })
  check('HLH 45° s: R+T=1', rs.R + rs.T, 1, 1e-9)
  check('HLH 45° p: R+T=1', rp.R + rp.T, 1, 1e-9)
  const exp3 = quarterWaveReflectance({ n0: 1, nSub: 1.52, nLayers: [nH, nL, nH], quarters: [1, 1, 1] })
  const r0 = computeStack({ ...stack, angleRad: 0, pol: 's' })
  check('HLH 正入射 R vs 导纳递推', r0.R, exp3, 1e-9)
}

// 4. 布儒斯特角：空气->1.5185，p 偏振裸界面 R≈0
{
  const n2 = 1.5185
  const ang = brewsterAngle(1, n2)
  const r = computeStack({ nList: [C(1), C(n2)], dList: [], wl: 550, angleRad: (ang * Math.PI) / 180, pol: 'p' })
  check('布儒斯特角 R_p=0', r.R, 0, 1e-9)
  check('裸界面 89° s 偏振 vs Fresnel',
    computeStack({ nList: [C(1), C(n2)], dList: [], wl: 550, angleRad: (89 * Math.PI) / 180, pol: 's' }).R,
    fresnelRs(1, n2, 89), 1e-9)
  check('裸界面 89° p 偏振 vs Fresnel',
    computeStack({ nList: [C(1), C(n2)], dList: [], wl: 550, angleRad: (89 * Math.PI) / 180, pol: 'p' }).R,
    fresnelRp(1, n2, 89), 1e-9)
}

// 5. 吸收金膜 50nm @600: n=0.272 k=2.95，玻璃基底；R+T 必须 <1
{
  const r = computeStack({ nList: [C(1), C(0.272, 2.95), C(1.52)], dList: [50], wl: 600, angleRad: 0, pol: 's' })
  checkTrue('金膜 R+T<1（存在吸收缺口）', r.R + r.T < 0.99, `R=${r.R.toFixed(3)} T=${r.T.toFixed(3)} A=${r.A.toFixed(3)}`)
  checkTrue('金膜 A>0', r.A > 0.05, `A=${r.A.toFixed(3)}`)
  checkTrue('R,T 物理范围', r.R >= 0 && r.T >= 0 && r.R <= 1 && r.T <= 1)
}

// 6. 全内反射：玻璃(1.52)->空气，45° > 临界角 41.14°，R=1, T=0
{
  const rs = computeStack({ nList: [C(1.52), C(1)], dList: [], wl: 550, angleRad: Math.PI / 4, pol: 's' })
  const rp = computeStack({ nList: [C(1.52), C(1)], dList: [], wl: 550, angleRad: Math.PI / 4, pol: 'p' })
  check('TIR 45° R_s=1', rs.R, 1, 1e-9)
  check('TIR 45° R_p=1', rp.R, 1, 1e-9)
  check('TIR 45° T_s=0', rs.T, 0, 1e-9)
}

// 7. 零厚度膜层不应改变裸界面结果
{
  const bare = computeStack({ nList: [C(1), C(1.52)], dList: [], wl: 700, angleRad: 0.3, pol: 'p' })
  const zero = computeStack({ nList: [C(1), C(2.0), C(1.52)], dList: [0], wl: 700, angleRad: 0.3, pol: 'p' })
  check('零厚度层等价无层', zero.R, bare.R, 1e-12)
}

// 8. 吸收层斜入射（s/p）：R,T 物理范围且 R+T<1
{
  for (const pol of ['s', 'p'] as const) {
    const r = computeStack({ nList: [C(1), C(0.272, 2.95), C(1.52)], dList: [50], wl: 600, angleRad: Math.PI / 6, pol })
    checkTrue(`金膜 30° ${pol}: 0≤R,T≤1`, r.R >= 0 && r.R <= 1 && r.T >= 0 && r.T <= 1,
      `R=${r.R.toFixed(3)} T=${r.T.toFixed(3)}`)
    checkTrue(`金膜 30° ${pol}: A>0`, r.A > 0.02, `A=${r.A.toFixed(3)}`)
  }
}

// 9. 厚吸收层：透射应趋零，反射接近半无限金属界面
{
  const thick = computeStack({ nList: [C(1), C(0.272, 2.95), C(1.52)], dList: [10000], wl: 600, angleRad: 0, pol: 's' })
  const semiInf = computeStack({ nList: [C(1), C(0.272, 2.95)], dList: [], wl: 600, angleRad: 0, pol: 's' })
  check('10 µm 金膜 T≈0', thick.T, 0, 1e-6)
  check('厚金膜反射 ≈ 半无限金属界面', thick.R, semiInf.R, 1e-4)
}

console.log(fails === 0 ? '\n全部基准通过 ✔' : `\n${fails} 项失败 ✘`)
if (fails) process.exit(1)
