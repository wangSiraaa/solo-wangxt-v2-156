import { create, all, type Complex } from 'mathjs'
import type { Polarization, RTResult, Stack } from './types'
import { getMaterial, nkAt } from './materials'

const math = create(all)

type C = Complex
const c = (re: number, im = 0): C => math.complex(re, im)

/**
 * 特征（传输）矩阵法求解多层膜振幅反射/透射系数。
 *
 * 约定与单位：
 * - 波长 lambdaNm、厚度 d 均以 nm 输入，相位 δ = (2π/λ)·ñ·d·cosθ̃ 无量纲；
 * - 入射角 thetaDeg 以【度】输入，内部转弧度；
 * - 材料数据为 (n, κ)，κ>0 表示吸收；内部采用 Macleod 约定 ñ = n − iκ
 *   （时间因子 e^{iωt}），与特征矩阵的标准形式一致——若误用 n + iκ，
 *   吸收层会变为增益（A<0），测试用例对此有防护；
 * - 复折射角由 Snell 定律 ñ_j sinθ̃_j = ñ_0 sinθ_0 确定（吸收介质中 θ̃ 为复数），
 *   平方根分支取 Im(ñ·cosθ̃) ≤ 0（衰减波）；
 * - 光学导纳（自由空间导纳为单位）：
 *     s 偏振(TE)：η_j = ñ_j cosθ̃_j
 *     p 偏振(TM)：η_j = ñ_j / cosθ̃_j
 * - 每层特征矩阵 M_j = [[cosδ, i·sinδ/η], [i·η·sinδ, cosδ]]；
 * - [B;C] = (∏M_j)·[1; η_sub]，r = (η₀B − C)/(η₀B + C)，t = 2η₀/(η₀B + C)；
 * - R = |r|²，T = Re(η_sub)/Re(η₀)·|t|²，A = 1 − R − T。
 *
 * 能量守恒：仅当所有介质 κ=0 时 R+T=1（在数值误差内）；含吸收时 A>0，
 * 本模块【不会】对吸收情形强制 R+T=1。
 */
export function computeRT(
  stack: Stack,
  lambdaNm: number,
  thetaDeg: number,
  pol: Polarization,
): RTResult {
  const theta0 = (thetaDeg * Math.PI) / 180
  if (theta0 >= Math.PI / 2) {
    throw new Error('入射角必须 < 90°（90° 时传播方向与界面平行，模型奇异）')
  }

  const amb = getMaterial(stack.ambientId)
  const sub = getMaterial(stack.substrateId)
  const nAmb = nkAt(amb, lambdaNm)
  const nSub = nkAt(sub, lambdaNm)
  if (nAmb.k > 1e-12) {
    throw new Error('入射介质必须无损（κ=0），否则入射/反射光强定义不适用')
  }

  const N0 = c(nAmb.n, -nAmb.k)
  const Ns = c(nSub.n, -nSub.k)
  const sin0 = Math.sin(theta0)

  // cosθ̃_j = sqrt(1 − (N0·sinθ0/N_j)²)，取使 Im(ñ·cosθ̃) ≤ 0 的分支（衰减波）
  const cosTheta = (N: C): C => {
    const s = math.divide(math.multiply(N0, sin0), N) as C
    let ct = math.sqrt(math.subtract(c(1), math.multiply(s, s)) as C) as C
    const kz = math.multiply(N, ct) as C
    if (kz.im > 0 || (Math.abs(kz.im) < 1e-15 && kz.re < 0)) {
      ct = math.unaryMinus(ct) as C
    }
    return ct
  }

  // 光学导纳
  const admittance = (N: C, ct: C): C =>
    pol === 's' ? (math.multiply(N, ct) as C) : (math.divide(N, ct) as C)

  const eta0 = admittance(N0, c(Math.cos(theta0)))
  const etaS = admittance(Ns, cosTheta(Ns))

  // 连乘特征矩阵 M = M1·M2·…·Mk（2×2 复矩阵，手开避免通用矩阵开销）
  let m11: C = c(1), m12: C = c(0), m21: C = c(0), m22: C = c(1)
  for (const layer of stack.layers) {
    const mat = getMaterial(layer.materialId)
    const { n, k } = nkAt(mat, lambdaNm)
    const N = c(n, -k)
    const ct = cosTheta(N)
    const eta = admittance(N, ct)
    const delta = math.multiply(N, ct, (2 * Math.PI * layer.thicknessNm) / lambdaNm) as C
    const cosD = math.cos(delta) as unknown as C
    const sinD = math.sin(delta) as unknown as C
    const a: C = cosD
    const b: C = math.multiply(math.i, math.divide(sinD, eta) as C) as C
    const cc: C = math.multiply(math.i, eta, sinD) as C
    const d: C = cosD
    // M ← M · M_j
    const n11 = math.add(math.multiply(m11, a), math.multiply(m12, cc)) as C
    const n12 = math.add(math.multiply(m11, b), math.multiply(m12, d)) as C
    const n21 = math.add(math.multiply(m21, a), math.multiply(m22, cc)) as C
    const n22 = math.add(math.multiply(m21, b), math.multiply(m22, d)) as C
    m11 = n11; m12 = n12; m21 = n21; m22 = n22
  }

  const B = math.add(m11, math.multiply(m12, etaS)) as C
  const Cm = math.add(m21, math.multiply(m22, etaS)) as C
  const denom = math.add(math.multiply(eta0, B), Cm) as C
  const r = math.divide(math.subtract(math.multiply(eta0, B), Cm) as C, denom) as C
  const t = math.divide(math.multiply(2, eta0) as C, denom) as C

  const R = (math.abs(r) as number) ** 2
  const T = ((etaS.re / eta0.re) * (math.abs(t) as number) ** 2)
  return {
    R,
    T,
    A: 1 - R - T,
    r: { re: r.re, im: r.im },
    t: { re: t.re, im: t.im },
  }
}

/** 逐层光学诊断：用于“从谱峰追到膜层参数” */
export interface LayerDiagnostics {
  layerIndex: number
  materialName: string
  n: number
  k: number
  /** 光学厚度 n·d，单位 nm */
  opticalThicknessNm: number
  /**
   * 光学厚度以 λ/4 为单位。无损层含斜入射 cosθ̃ 修正（q = n·d·cosθ̃/(λ/4)）；
   * 吸收层相位为复数，退化为正入射近似并标记 complexPhase
   */
  quarterWaveUnits: number
  complexPhase: boolean
  /** 该层是否接近四分之一波（q ≈ 奇数）或半波（q ≈ 偶数），容差 0.15 */
  nearQuarterWave: boolean
  nearHalfWave: boolean
}

export function diagnoseLayers(stack: Stack, lambdaNm: number, thetaDeg = 0): LayerDiagnostics[] {
  const n0 = nkAt(getMaterial(stack.ambientId), lambdaNm).n
  const sin0 = Math.sin((thetaDeg * Math.PI) / 180)
  return stack.layers.map((layer, i) => {
    const mat = getMaterial(layer.materialId)
    const { n, k } = nkAt(mat, lambdaNm)
    const ot = n * layer.thicknessNm
    const lossless = k < 1e-12
    // 无损层：Snell 定律求实折射角并折算斜入射光程
    let cosT = 1
    if (lossless) {
      const s = (n0 * sin0) / n
      cosT = s <= 1 ? Math.sqrt(1 - s * s) : 0
    }
    const q = (lossless ? ot * cosT : ot) / (lambdaNm / 4)
    const frac = q % 2
    return {
      layerIndex: i + 1,
      materialName: mat.name,
      n, k,
      opticalThicknessNm: ot,
      quarterWaveUnits: q,
      complexPhase: !lossless,
      nearQuarterWave: Math.abs(frac - 1) < 0.15,
      nearHalfWave: Math.min(Math.abs(frac), Math.abs(frac - 2)) < 0.15,
    }
  })
}
