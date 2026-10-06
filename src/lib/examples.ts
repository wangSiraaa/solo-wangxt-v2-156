import type { Layer, Material, Polarization, ScanParams } from '../types'
import { BUILTIN_MATERIALS } from './materials'
import { quarterWaveReflectance, fresnelRs, fresnelRp, brewsterAngle } from './analytic'

/** 算例检查项：在指定波长/角度/偏振下，TMM 数值应与闭式值一致 */
export interface CheckItem {
  label: string
  wl: number
  angleDeg: number
  pol: Polarization
  /** conservation: 无损介质 R+T 应≈1；absorption: 有吸收时 R+T 应 < 1−minAbsorbed */
  type: 'analytic' | 'conservation' | 'absorption'
  /** analytic: 期望值（R 或 1−R 视 kind）；absorption: 最小吸收率 */
  expected: number
  tol: number
  kind?: 'R' | 'T'
  minAbsorbed?: number
  /** 仅作参考值展示，不对当前载入膜系自动判定（例如需要用户先手动加层） */
  referenceOnly?: boolean
  /** 参考值的人类可读说明 */
  referenceHint?: string
}

export interface ExamplePreset {
  id: string
  title: string
  description: string
  /** 模型适用边界说明（不满足条件时结论无效） */
  assumptions: string[]
  materials: Material[]
  incident: Layer
  layers: Layer[]
  substrate: Layer
  params: ScanParams
  checks: CheckItem[]
}

const matRef = (id: string): Material => {
  const m = BUILTIN_MATERIALS.find((x) => x.id === id)!
  return JSON.parse(JSON.stringify(m))
}
const lay = (materialId: string, thickness: number): Layer => ({
  id: `lay-${materialId}-${Math.random().toString(36).slice(2, 7)}`,
  materialId,
  thickness
})

const nAt = (id: string, wl: number): number => {
  const m = matRef(id)
  if (m.kind === 'constant') return m.n
  const t = [...m.table].sort((a, b) => a.wl - b.wl)
  const f = t.find((p) => p.wl === wl)
  if (f) return f.n
  // 线性插值
  for (let i = 0; i < t.length - 1; i++) {
    if (wl > t[i].wl && wl < t[i + 1].wl) {
      const a = t[i]
      const b = t[i + 1]
      return a.n + ((wl - a.wl) / (b.wl - a.wl)) * (b.n - a.n)
    }
  }
  return m.n
}

// ---------- 算例 1：单层四分之一波增透膜 ----------
function exampleQW(): ExamplePreset {
  const wl = 550
  const nMGF2 = nAt('mat-mgf2', wl) // 1.38
  const nGlass = nAt('mat-bk7', wl) // ≈1.5185
  const d = wl / (4 * nMGF2) // ≈ 99.6 nm
  const expectedR = quarterWaveReflectance({
    n0: 1,
    nSub: nGlass,
    nLayers: [nMGF2],
    quarters: [1]
  })
  return {
    id: 'ex-qw-ar',
    title: '单层 λ/4 增透膜：空气 | MgF₂ | BK7',
    description:
      '550 nm 处 MgF₂ 光学厚度为 λ/4。正入射时膜面与膜底两束反射光相位差 π 并部分相消，' +
      '反射率由四分之一波闭式公式 R=[(n₀Y−n_s)/(n₀Y+n_s)]² 给出（Y=n₁²/n_s）。' +
      '改变厚度或材料 n，可直接在谱图上看到反射谷如何移动、加深——这就是“从谱峰追到膜层参数”。',
    assumptions: [
      '所有介质无损（k=0），正入射，膜层为非磁各向同性',
      '闭式公式取 550 nm 处插值后的实折射率，与数值模型使用同一 n 值'
    ],
    materials: BUILTIN_MATERIALS.map((m) => JSON.parse(JSON.stringify(m))),
    incident: lay('mat-air', 0),
    layers: [lay('mat-mgf2', d)],
    substrate: lay('mat-bk7', 0),
    params: { wlStart: 400, wlEnd: 1000, wlPoints: 601, angleDeg: 0, polarization: 's' },
    checks: [
      { label: '550 nm 反射率 vs λ/4 闭式公式', wl, angleDeg: 0, pol: 's', type: 'analytic', kind: 'R', expected: expectedR, tol: 2e-3 },
      { label: '无损能量守恒 R+T=1（550 nm）', wl, angleDeg: 0, pol: 's', type: 'conservation', expected: 1, tol: 2e-3 }
    ]
  }
}

// ---------- 算例 2：对称多层（HLH 奇数层 λ/4 堆） ----------
function exampleSymmetric(): ExamplePreset {
  const wl = 550
  const nH = nAt('mat-tio2', wl) // 2.3
  const nL = nAt('mat-mgf2', wl) // 1.38
  const nSub = nAt('mat-bk7', wl)
  // 对称结构 H L H（五层版本 H L H L H 由界面切换按钮可得）
  const dH = wl / (4 * nH)
  const dL = wl / (4 * nL)
  const expectedR3 = quarterWaveReflectance({
    n0: 1,
    nSub,
    nLayers: [nH, nL, nH],
    quarters: [1, 1, 1]
  })
  const expectedR5 = quarterWaveReflectance({
    n0: 1,
    nSub,
    nLayers: [nH, nL, nH, nL, nH],
    quarters: [1, 1, 1, 1, 1]
  })
  return {
    id: 'ex-symmetric',
    title: '对称 λ/4 多层膜：H L H（可扩展到 H L H L H）',
    description:
      '高/低折射率膜层交替、每层光学厚度 λ₀/4 的膜堆是滤光片与高反膜的基本单元。' +
      '对于奇数层 H L … H 的对称堆，等效导纳 Y = n_H²(n_H/n_L)^(2p) / n_s，' +
      '层数越多反射峰越高、阻带越宽。可在膜层表中把结构扩展为五层后对照闭式参考值。',
    assumptions: [
      '无损实折射率；正入射；每层恰为 λ₀/4（用 550 nm 折射率定厚）',
      '三层参考值 R₃ 与五层参考值 R₅ 由同一导纳递推给出，可分别核对'
    ],
    materials: BUILTIN_MATERIALS.map((m) => JSON.parse(JSON.stringify(m))),
    incident: lay('mat-air', 0),
    layers: [lay('mat-tio2', dH), lay('mat-mgf2', dL), lay('mat-tio2', dH)],
    substrate: lay('mat-bk7', 0),
    params: { wlStart: 400, wlEnd: 900, wlPoints: 601, angleDeg: 0, polarization: 's' },
    checks: [
      { label: '550 nm 三层 H L H 反射率 vs 导纳递推', wl, angleDeg: 0, pol: 's', type: 'analytic', kind: 'R', expected: expectedR3, tol: 2e-3 },
      { label: '无损能量守恒 R+T=1（550 nm）', wl, angleDeg: 0, pol: 's', type: 'conservation', expected: 1, tol: 2e-3 },
      {
        label: '（扩展为五层 H L H L H 后）R₅ 参考值',
        wl, angleDeg: 0, pol: 's', type: 'analytic', kind: 'R', expected: expectedR5, tol: 2e-3,
        referenceOnly: true,
        referenceHint:
          '此值不自动核对：请在膜层表中用“追加膜层”再补一组低/高折射率层（厚度同现有 L、H），' +
          '然后用探针在 550 nm 读取 s 偏振 R 自行对照。'
      }
    ]
  }
}

// ---------- 算例 3：掠入射 / 布儒斯特 / 全反射边界 ----------
function exampleGrazing(): ExamplePreset {
  const wl = 550
  const nGlass = nAt('mat-bk7', wl)
  const checks: CheckItem[] = [
    {
      label: '空气→玻璃 89° 掠入射：R_s ≈ 1',
      wl, angleDeg: 89, pol: 's', type: 'analytic', kind: 'R',
      expected: fresnelRs(1, nGlass, 89), tol: 2e-3
    },
    {
      label: '空气→玻璃 89° 掠入射：R_p ≈ 1',
      wl, angleDeg: 89, pol: 'p', type: 'analytic', kind: 'R',
      expected: fresnelRp(1, nGlass, 89), tol: 2e-3
    },
    {
      label: `布儒斯特角 ${brewsterAngle(1, nGlass).toFixed(2)}°：裸玻璃 R_p = 0`,
      wl, angleDeg: brewsterAngle(1, nGlass), pol: 'p', type: 'analytic', kind: 'R',
      expected: 0, tol: 5e-3
    },
    {
      label: '无损能量守恒 R+T=1（45°, p 偏振）',
      wl, angleDeg: 45, pol: 'p', type: 'conservation', expected: 1, tol: 2e-3
    }
  ]
  return {
    id: 'ex-grazing',
    title: '掠入射、布儒斯特角与全反射边界：裸 BK7',
    description:
      '去掉膜层即为空气 | BK7 裸界面。随角度扫描可见：p 偏振在布儒斯特角反射降为零，' +
      's 偏振单调上升；两种偏振在 90° 掠入射都趋于 R=1。' +
      '把入射介质换成 BK7、基底换成空气并取 45°，则超过临界角后发生全内反射（T=0, R=1）。',
    assumptions: [
      '界面两侧均无损、各向同性、半无限；无膜层',
      '角度相对界面法线；菲涅耳公式与 TMM 独立实现以便互检'
    ],
    materials: BUILTIN_MATERIALS.map((m) => JSON.parse(JSON.stringify(m))),
    incident: lay('mat-air', 0),
    layers: [],
    substrate: lay('mat-bk7', 0),
    params: { wlStart: 400, wlEnd: 900, wlPoints: 301, angleDeg: 89, polarization: 's' },
    checks
  }
}

// ---------- 算例 4：吸收介质（金膜）—— R+T<1 ----------
function exampleAbsorbing(): ExamplePreset {
  const wl = 600
  return {
    id: 'ex-absorbing',
    title: '吸收介质：空气 | 50 nm 金膜 | 玻璃',
    description:
      '金在可见光为复折射率（本算例 600 nm 处 n≈0.27, k≈2.95，数据来自 Johnson-Christy 选点）。' +
      '此时 R+T<1，缺口 A=1−R−T 就是膜层吸收（并含反射相移造成的干涉）。' +
      '本工具不会对吸收膜强制 R+T=1；若强行把金当成 k=0 的常数，结果将完全错误。',
    assumptions: [
      '金的 n,k 仅在 450–1000 nm 选点表内可靠，越界查询按端点钳置并给出警告',
      '入射介质必须无损；相干平面波、正入射、膜厚均匀'
    ],
    materials: BUILTIN_MATERIALS.map((m) => JSON.parse(JSON.stringify(m))),
    incident: lay('mat-air', 0),
    layers: [lay('mat-au', 50)],
    substrate: lay('mat-bk7', 0),
    params: { wlStart: 450, wlEnd: 1000, wlPoints: 551, angleDeg: 0, polarization: 's' },
    checks: [
      {
        label: '600 nm：吸收率 A=1−R−T > 0.10（能量缺口，不强制守恒）',
        wl, angleDeg: 0, pol: 's', type: 'absorption', expected: 0, tol: 0, minAbsorbed: 0.1
      }
    ]
  }
}

export const EXAMPLES: ExamplePreset[] = [
  exampleQW(),
  exampleSymmetric(),
  exampleGrazing(),
  exampleAbsorbing()
]
