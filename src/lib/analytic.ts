/**
 * 解析算例：对“实折射率、无损”的膜系用闭式公式独立计算 R，
 * 与传输矩阵数值结果互相核对（不应只信同一套代码的自洽性）。
 *
 * 公式来源：MacLeod, Thin-Film Optical Filters —— 四分之一波膜堆的导纳递推。
 * 限制：仅支持非磁、无损（k=0）、各层厚度 = 整数倍 λ₀/4n 的设计波长正入射情形；
 *       以及裸界面 s/p 菲涅耳公式。有吸收、任意厚度的一般情形无简单闭式式，
 *       超出范围时 checkExample 会明确标记 notApplicable。
 */

export interface QWSpec {
  n0: number
  nSub: number
  /** 从入射侧向基底排列的膜层实折射率 */
  nLayers: number[]
  /** 每层四分之一波的个数（1 = λ₀/4n 厚） */
  quarters: number[]
}

/**
 * 四分之一波膜堆在设计波长正入射的等效导纳递推。
 * 膜层 j（光学厚度 q·λ₀/4）使输入导纳 Y -> n_j²/Y（q 奇数次翻转，偶数次不变）。
 */
export function quarterWaveReflectance(spec: QWSpec): number {
  let Y = spec.nSub
  for (let j = spec.nLayers.length - 1; j >= 0; j--) {
    if (spec.quarters[j] % 2 === 1) Y = (spec.nLayers[j] ** 2) / Y
  }
  const r = (spec.n0 - Y) / (spec.n0 + Y)
  return r * r
}

/** 裸界面 s 偏振菲涅耳反射率（无损介质，角度单位度） */
export function fresnelRs(n1: number, n2: number, angleDeg: number): number {
  const th = (angleDeg * Math.PI) / 180
  const ct = Math.sqrt(1 - ((n1 / n2) * Math.sin(th)) ** 2)
  const a = n1 * Math.cos(th)
  const b = n2 * ct
  const rs = (a - b) / (a + b)
  return rs * rs
}

/** 裸界面 p 偏振菲涅耳反射率（无损介质，角度单位度；高于临界角返回 1） */
export function fresnelRp(n1: number, n2: number, angleDeg: number): number {
  const th = (angleDeg * Math.PI) / 180
  const sinT = (n1 / n2) * Math.sin(th)
  if (sinT > 1) return 1 // 全反射
  const ct = Math.sqrt(1 - sinT ** 2)
  const a = n2 * Math.cos(th)
  const b = n1 * ct
  const rp = (a - b) / (a + b)
  return rp * rp
}

/** 布儒斯特角（度）：p 偏振裸界面反射为零 */
export function brewsterAngle(n1: number, n2: number): number {
  return (Math.atan(n2 / n1) * 180) / Math.PI
}
