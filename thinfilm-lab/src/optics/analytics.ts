import type { Polarization } from './types'

/**
 * 解析参考解 —— 用于核对数值求解器，也作为课程算例。
 * 全部为无损、正入射（除掠入射/布儒斯特外）的封闭公式。
 */

/** 单界面 Fresnel 反射率（无损，任意角度） */
export function interfaceR(
  n1: number,
  n2: number,
  theta1Deg: number,
  pol: Polarization,
): { R: number; theta2Deg: number } {
  const t1 = (theta1Deg * Math.PI) / 180
  const sin2 = (n1 / n2) * Math.sin(t1)
  if (sin2 > 1) return { R: 1, theta2Deg: NaN } // 全反射
  const t2 = Math.asin(sin2)
  const c1 = Math.cos(t1)
  const c2 = Math.cos(t2)
  const R =
    pol === 's'
      ? ((n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2)) ** 2
      : ((n2 * c1 - n1 * c2) / (n2 * c1 + n1 * c2)) ** 2
  return { R, theta2Deg: (t2 * 180) / Math.PI }
}

/**
 * 算例 1：单层四分之一波膜，正入射。
 * n1·d1 = λ0/4 时，在 λ0 处 R = ((n0·ns − n1²)/(n0·ns + n1²))²。
 */
export function quarterWaveSingleLayerR(n0: number, n1: number, ns: number): number {
  return ((n0 * ns - n1 * n1) / (n0 * ns + n1 * n1)) ** 2
}

/**
 * 算例 2：对称多层高反堆 (HL)^p H，每层均为 λ0/4，正入射。
 * 在 λ0 处等效导纳 Y = n_H^(2p+2) / (n_L^(2p)·ns)，R = ((n0 − Y)/(n0 + Y))²。
 */
export function symmetricStackR(
  n0: number,
  nH: number,
  nL: number,
  ns: number,
  p: number,
): number {
  const Y = Math.pow(nH, 2 * p + 2) / (Math.pow(nL, 2 * p) * ns)
  return ((n0 - Y) / (n0 + Y)) ** 2
}

/**
 * 算例 3：掠入射边界 —— 任意有限折射率对比下，θ→90° 时 R_s→1 且 R_p→1。
 * 无封闭常数，但给出单调趋近的解析上界说明：用 Fresnel 公式直接求值即解析解。
 * 此处返回给定角度的 Fresnel 反射率供对比。
 */
export function grazingFresnelR(n1: number, n2: number, thetaDeg: number, pol: Polarization): number {
  return interfaceR(n1, n2, thetaDeg, pol).R
}

/** 布儒斯特角（度）：无损界面 R_p = 0 */
export function brewsterDeg(n1: number, n2: number): number {
  return (Math.atan2(n2, n1) * 180) / Math.PI
}
