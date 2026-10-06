import type { Polarization, Stack } from './types'
import { computeRT } from './matrix'
import { getMaterial, nkAt } from './materials'

export type SweepMode = 'wavelength' | 'angle'

export interface SweepConfig {
  mode: SweepMode
  /** wavelength 模式：固定角度（度），扫描波长 [start,end] nm */
  // angle 模式：固定波长（nm），扫描角度 [start,end] 度
  start: number
  end: number
  points: number
  fixedAngleDeg: number
  fixedLambdaNm: number
  pol: Polarization | 'both'
}

export interface SweepPoint {
  x: number // 波长 nm 或角度 度
  Rs?: number; Ts?: number; As?: number
  Rp?: number; Tp?: number; Ap?: number
}

export interface SweepResult {
  points: SweepPoint[]
  /** 无损校验：所有介质 κ=0 时 max|R+T−1|；含吸收时为 null（不适用） */
  energyResidual: number | null
  /** 扫描中涉及吸收介质 */
  hasAbsorption: boolean
  /** 波长超出某材料数据范围的警告 */
  rangeWarnings: string[]
}

export function runSweep(stack: Stack, cfg: SweepConfig): SweepResult {
  const points: SweepPoint[] = []
  let energyResidual: number | null = 0
  let hasAbsorption = false
  const warnings = new Set<string>()

  const checkMaterial = (id: string, lambdaNm: number) => {
    const m = getMaterial(id)
    const { k, outOfRange } = nkAt(m, lambdaNm)
    if (k > 1e-12) {
      hasAbsorption = true
      energyResidual = null // 含吸收：R+T=1 不适用，不强制
    }
    if (outOfRange) {
      warnings.add(`材料「${m.name}」在 λ=${lambdaNm.toFixed(0)} nm 超出数据范围，使用端点值（未外推）`)
    }
  }

  for (let i = 0; i < cfg.points; i++) {
    const f = cfg.points > 1 ? i / (cfg.points - 1) : 0
    const x = cfg.start + f * (cfg.end - cfg.start)
    const lambdaNm = cfg.mode === 'wavelength' ? x : cfg.fixedLambdaNm
    const thetaDeg = cfg.mode === 'wavelength' ? cfg.fixedAngleDeg : x

    checkMaterial(stack.ambientId, lambdaNm)
    checkMaterial(stack.substrateId, lambdaNm)
    for (const l of stack.layers) checkMaterial(l.materialId, lambdaNm)

    const p: SweepPoint = { x }
    const doPol = (pol: Polarization) => {
      const { R, T } = computeRT(stack, lambdaNm, thetaDeg, pol)
      if (energyResidual !== null) {
        energyResidual = Math.max(energyResidual, Math.abs(R + T - 1))
      }
      return { R, T, A: 1 - R - T }
    }
    if (cfg.pol === 's' || cfg.pol === 'both') {
      const { R, T, A } = doPol('s')
      p.Rs = R; p.Ts = T; p.As = A
    }
    if (cfg.pol === 'p' || cfg.pol === 'both') {
      const { R, T, A } = doPol('p')
      p.Rp = R; p.Tp = T; p.Ap = A
    }
    points.push(p)
  }
  return { points, energyResidual, hasAbsorption, rangeWarnings: [...warnings] }
}
