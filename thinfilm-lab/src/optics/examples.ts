import type { Stack } from './types'
import type { SweepConfig } from './sweep'
import { getMaterial, nkAt } from './materials'

export interface ExampleCase {
  id: string
  title: string
  description: string
  buildStack: () => Stack
  buildSweep: () => SweepConfig
  /** 解析参考：在监控波长处数值解应与解析公式一致 */
  analyticNote: string
}

let uid = 0
export const newLayerId = () => `L${Date.now().toString(36)}_${uid++}`

/** 算例 1：单层四分之一波增透膜 MgF2(λ0/4) / BK7，λ0=550 nm */
export const exampleQuarterWave: ExampleCase = {
  id: 'qw',
  title: '算例 1 · 单层四分之一波增透膜',
  description:
    '空气 / MgF₂(λ₀/4 @550nm) / BK7。解析：正入射 λ₀ 处 R = ((n₀·nₛ−n₁²)/(n₀·nₛ+n₁²))²。' +
    'MgF₂ n≈1.385 接近理想值 √nₛ≈1.232 不完全匹配，故 R 很小但不为零。',
  buildStack: () => {
    const n = nkAt(getMaterial('mgf2'), 550).n
    return {
      ambientId: 'air',
      substrateId: 'bk7',
      layers: [{ id: newLayerId(), materialId: 'mgf2', thicknessNm: 550 / (4 * n) }],
    }
  },
  buildSweep: () => ({
    mode: 'wavelength', start: 400, end: 800, points: 201,
    fixedAngleDeg: 0, fixedLambdaNm: 550, pol: 'both',
  }),
  analyticNote: 'R(550nm) 解析值 ≈ ((1·nₛ−n₁²)/(1·nₛ+n₁²))²，与曲线最小值逐点一致',
}

/** 算例 2：对称多层高反堆 (HL)^5 H，H=Ta2O5, L=SiO2，λ0=550 nm */
export const exampleSymmetricStack: ExampleCase = {
  id: 'hr',
  title: '算例 2 · 对称多层高反堆 (HL)⁵H',
  description:
    '空气 / (Ta₂O₅·SiO₂)⁵·Ta₂O₅（各 λ₀/4 @550nm）/ BK7。' +
    '解析：λ₀ 处等效导纳 Y = n_H¹²/(n_L¹⁰·nₛ)，R = ((n₀−Y)/(n₀+Y))²，高反带中心 R→1。',
  buildStack: () => {
    const nH = nkAt(getMaterial('ta2o5'), 550).n
    const nL = nkAt(getMaterial('sio2'), 550).n
    const layers = []
    for (let i = 0; i < 5; i++) {
      layers.push({ id: newLayerId(), materialId: 'ta2o5', thicknessNm: 550 / (4 * nH) })
      layers.push({ id: newLayerId(), materialId: 'sio2', thicknessNm: 550 / (4 * nL) })
    }
    layers.push({ id: newLayerId(), materialId: 'ta2o5', thicknessNm: 550 / (4 * nH) })
    return { ambientId: 'air', substrateId: 'bk7', layers }
  },
  buildSweep: () => ({
    mode: 'wavelength', start: 400, end: 800, points: 301,
    fixedAngleDeg: 0, fixedLambdaNm: 550, pol: 'both',
  }),
  analyticNote: 'R(550nm) 解析值 = ((1−Y)/(1+Y))²，Y=n_H¹²/(n_L¹⁰·nₛ)；阻带宽度 Δg = (2/π)·asin((n_H−n_L)/(n_H+n_L))',
}

/** 算例 3：掠入射边界 —— 裸 BK7 界面 0→89.5° 角扫描 */
export const exampleGrazing: ExampleCase = {
  id: 'grazing',
  title: '算例 3 · 掠入射边界（θ→90°）',
  description:
    '空气 / 裸 BK7（无膜），角度扫描 0→89.5°。解析：Fresnel 公式给出 R_s、R_p 均单调→1；' +
    '途中 R_p 在布儒斯特角 θ_B=atan(n₂/n₁)≈56.6° 处过零。θ=90° 本身模型奇异，不可计算。',
  buildStack: () => ({ ambientId: 'air', substrateId: 'bk7', layers: [] }),
  buildSweep: () => ({
    mode: 'angle', start: 0, end: 89.5, points: 300,
    fixedAngleDeg: 0, fixedLambdaNm: 550, pol: 'both',
  }),
  analyticNote: 'R_p(θ_B)=0；θ→90° 时 R_s、R_p→1（Fresnel 公式逐点对比）',
}

export const EXAMPLES = [exampleQuarterWave, exampleSymmetricStack, exampleGrazing]
