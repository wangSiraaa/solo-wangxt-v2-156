import { create, all, type Complex, type MathJsInstance } from 'mathjs'

/**
 * 薄膜光学特征矩阵法（MacLeod《Thin-Film Optical Filters》标准形式）。
 *
 * 物理约定：
 *  - 时间因子 e^{-iωt}，复折射率 ñ = n + i k（k>0 表示吸收）；
 *  - 膜系：半无限入射介质(0) | 膜层 1..m | 半无限基底(s)，z 指向膜内；
 *  - 膜层 j 的相位厚度 δ_j = (2π/λ) ñ_j d_j cosθ_j，
 *    光学导纳 η_j：s 偏振 ñ_j cosθ_j，p 偏振 ñ_j / cosθ_j（μ=1）；
 *  - 每层特征矩阵把膜层左界面的切向场 [E; H] 与右界面联系：
 *        M_j = [[cosδ_j,        i sinδ_j / η_j],
 *               [i η_j sinδ_j,  cosδ_j      ]]
 *  - 总矩阵 M=M₁M₂…M_m 满足 [B; C] = M [1; η_s]，
 *    r = (η₀ B − C)/(η₀ B + C)，t = 2η₀/(η₀ B + C)（电场振幅系数）；
 *  - R=|r|²；T = (Re(η_s)/Re(η₀))·|t|²（法向能流比，s/p 统一）；
 *  - A=1−R−T 为吸收份额。无损时 R+T=1；有吸收时 R+T<1，绝不强制归一。
 */

const math: MathJsInstance = create(all)
const { complex, multiply, add, subtract, divide, cos: ccos, sin: csin, sqrt: csqrt, conj } =
  {
    complex: math.complex,
    multiply: math.multiply,
    add: math.add,
    subtract: math.subtract,
    divide: math.divide,
    cos: math.cos,
    sin: math.sin,
    sqrt: math.sqrt,
    conj: math.conj
  } as const

type C = Complex

/** 2×2 复矩阵，元素行优先 [m11,m12;m21,m22] */
type Mat2 = [C, C, C, C]

function matMul(a: Mat2, b: Mat2): Mat2 {
  return [
    add(multiply(a[0], b[0]), multiply(a[1], b[2])) as C,
    add(multiply(a[0], b[1]), multiply(a[1], b[3])) as C,
    add(multiply(a[2], b[0]), multiply(a[3], b[2])) as C,
    add(multiply(a[2], b[1]), multiply(a[3], b[3])) as C
  ]
}

function matVec(m: Mat2, v: [C, C]): [C, C] {
  return [
    add(multiply(m[0], v[0]), multiply(m[1], v[1])) as C,
    add(multiply(m[2], v[0]), multiply(m[3], v[1])) as C
  ]
}

/** 光学导纳（非磁介质 μ=1）：η_s = ñ cosθ，η_p = ñ / cosθ */
function admittance(nTilde: C, cosTheta: C, pol: 's' | 'p'): C {
  return pol === 's' ? (multiply(nTilde, cosTheta) as C) : (divide(nTilde, cosTheta) as C)
}

export interface TMMInput {
  /** 各介质复折射率：[入射介质, 膜层..., 基底] */
  nList: C[]
  /** 各膜层几何厚度 nm：长度 = nList.length - 2 */
  dList: number[]
  /** 真空波长 nm */
  wl: number
  /** 入射角（弧度，相对法线） */
  angleRad: number
  pol: 's' | 'p'
}

export interface TMMResult {
  r: C
  t: C
  R: number
  T: number
  A: number
  cosThetas: C[]
}

export function computeStack(input: TMMInput): TMMResult {
  const { nList, dList, wl, angleRad, pol } = input
  const n0 = nList[0]
  const k0 = (2 * Math.PI) / wl

  // 横向波矢守恒：ñ_j sinθ_j = ñ_0 sinθ_0（广义 Snell，复数）
  const beta = multiply(n0, csin(complex(angleRad, 0))) as C

  const cosThetas: C[] = nList.map((nj) => {
    const q = divide(beta, nj) as C
    const c = csqrt(subtract(1, multiply(q, q)) as C) as C
    // 取正向能流分支（实部为正）
    return c.re >= 0 ? c : complex(-c.re, -c.im)
  })

  const eta = nList.map((nj, j) => admittance(nj, cosThetas[j], pol))
  const eta0 = eta[0]
  const etaS = eta[eta.length - 1]

  // 各膜层特征矩阵连乘 M = M₁ M₂ … M_m。
  // 注意非对角元为 -i：本工具采用 e^{-iωt} 约定（场 ~ e^{i k₀ ñ z}，k>0 自动衰减），
  // 与部分教材 e^{+iωt} 形式（+i）恰好相反；符号必须与折射率约定一致，否则吸收层结果非物理。
  let M: Mat2 = [complex(1, 0), complex(0, 0), complex(0, 0), complex(1, 0)]
  for (let j = 1; j < nList.length - 1; j++) {
    const delta = multiply(multiply(k0, multiply(nList[j], cosThetas[j])), dList[j - 1]) as C
    const c = ccos(delta) as C
    const s = csin(delta) as C
    const etaJ = eta[j]
    const Mj: Mat2 = [
      c,
      divide(multiply(complex(0, -1), s), etaJ) as C,
      multiply(complex(0, -1), multiply(etaJ, s)) as C,
      c
    ]
    M = matMul(M, Mj)
  }

  // [B; C] = M [1; η_s]
  const [B, C] = matVec(M, [complex(1, 0), etaS])

  // 振幅反射/透射系数
  const denom = add(multiply(eta0, B), C) as C
  const r = divide(subtract(multiply(eta0, B), C), denom) as C
  const t = divide(multiply(2, eta0), denom) as C

  const R = (multiply(r, conj(r)) as C).re
  // 法向时间平均能流之比 Re(η_s)/Re(η_0)；入射介质须无损，η₀ 才为实数。
  const fluxRatio = etaS.re / eta0.re
  const T = Math.max(0, fluxRatio * (multiply(t, conj(t)) as C).re)
  // 无损时该值为 0（数值舍入）；有吸收时为正的能量缺口。
  // 不做 Math.max 钳制，使“算出负吸收”这类非物理结果能暴露约定/参数错误。
  const A = 1 - R - T

  return { r, t, R, T, A, cosThetas }
}
