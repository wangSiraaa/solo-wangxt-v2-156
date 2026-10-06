import { interpNk, materialNk } from '../src/lib/interpolation'
import { BUILTIN_MATERIALS } from '../src/lib/materials'

let fails = 0
function check(name: string, got: number, expected: number, tol: number) {
  const ok = Math.abs(got - expected) <= tol
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got=${got} expected=${expected}`)
}
function checkTrue(name: string, cond: boolean, detail = '') {
  if (!cond) fails++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`)
}

// 中点线性插值
const tab = [
  { wl: 400, n: 1.5, k: 0 },
  { wl: 600, n: 1.6, k: 0.1 }
]
const mid = interpNk(tab, 500)
check('n 中点插值', mid.n, 1.55, 1e-12)
check('k 中点插值', mid.k, 0.05, 1e-12)

// 乱序表应排序后插值
const unsorted = interpNk([...tab].reverse(), 500)
check('乱序表排序', unsorted.n, 1.55, 1e-12)

// 越界钳制 + 标记
const below = interpNk(tab, 300)
check('越下界钳制 n', below.n, 1.5, 1e-12)
checkTrue('越下界标记', below.outOfRange)
const atEdge = interpNk(tab, 400)
checkTrue('端点不算越界', !atEdge.outOfRange)

// 内置材料查询
const sio2 = BUILTIN_MATERIALS.find((m) => m.id === 'mat-sio2')!
const q = materialNk(sio2, 525)
checkTrue('SiO₂ 525nm 在 1.46 附近', q.n > 1.455 && q.n < 1.465, `n=${q.n}`)
checkTrue('SiO₂ 无吸收', q.k === 0)
const au = BUILTIN_MATERIALS.find((m) => m.id === 'mat-au')!
checkTrue('Au 600nm 有强吸收 k≈2.95', Math.abs(materialNk(au, 600).k - 2.95) < 0.01)
checkTrue('Au 300nm 越界警告', materialNk(au, 300).outOfRange)

console.log(fails === 0 ? '\n插值测试全部通过 ✔' : `\n${fails} 项失败 ✘`)
if (fails) process.exit(1)
