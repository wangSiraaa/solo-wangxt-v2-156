import { complex } from 'mathjs'
import type { Layer, Material, Polarization, PointResult } from '../types'
import { materialNk } from './interpolation'
import { computeStack } from './tmm'

export interface StackModel {
  incident: Layer
  layers: Layer[]
  substrate: Layer
  materials: Material[]
}

export interface ScanPoint extends PointResult {
  wl: number
}

export interface ScanResult {
  points: ScanPoint[]
  /** 任意一点查询色散表越界（数据按端点钳制，谱线可能失真） */
  extrapolated: boolean
  /** 入射介质在扫描范围内出现吸收（标准 R/T 定义不适用） */
  incidentAbsorbing: boolean
}

function matOf(model: StackModel, id: string): Material {
  const m = model.materials.find((x) => x.id === id)
  if (!m) throw new Error(`找不到材料: ${id}`)
  return m
}

/** 计算单一波长、单一偏振的 R/T/A */
export function computeAt(
  model: StackModel,
  wl: number,
  angleDeg: number,
  pol: Polarization
): PointResult & { extrapolated: boolean } {
  const ordered = [model.incident, ...model.layers, model.substrate]
  const nList = ordered.map((l) => {
    const q = materialNk(matOf(model, l.materialId), wl)
    return complex(q.n, q.k)
  })
  const dList = model.layers.map((l) => l.thickness)
  const out = computeStack({
    nList,
    dList,
    wl,
    angleRad: (angleDeg * Math.PI) / 180,
    pol
  })
  const extrapolated = ordered.some((l) => materialNk(matOf(model, l.materialId), wl).outOfRange)
  return {
    R: out.R,
    T: out.T,
    A: out.A,
    cosTheta0: out.cosThetas[0].re,
    extrapolated
  }
}

/** 波长扫描 */
export function scanWavelength(
  model: StackModel,
  wlStart: number,
  wlEnd: number,
  points: number,
  angleDeg: number,
  pol: Polarization
): ScanResult {
  const out: ScanPoint[] = []
  let extrapolated = false
  const n = Math.max(2, Math.floor(points))
  for (let i = 0; i < n; i++) {
    const wl = wlStart + ((wlEnd - wlStart) * i) / (n - 1)
    const p = computeAt(model, wl, angleDeg, pol)
    extrapolated = extrapolated || p.extrapolated
    out.push({ wl, R: p.R, T: p.T, A: p.A, cosTheta0: p.cosTheta0 })
  }
  // 入射介质是否在任意采样点有吸收
  const incMat = matOf(model, model.incident.materialId)
  const incidentAbsorbing = out.some((p) => Math.abs(materialNk(incMat, p.wl).k) > 1e-9)
  return { points: out, extrapolated, incidentAbsorbing }
}

export interface AnglePoint extends PointResult {
  angleDeg: number
  /** 是否超过临界角（仅在入射侧光学密度高于基底时有意义） */
  tir: boolean
}

/** 入射角扫描（0–90°），用于掠入射/布儒斯特角分析 */
export function scanAngle(
  model: StackModel,
  wl: number,
  angleEndDeg: number,
  points: number,
  pol: Polarization
): AnglePoint[] {
  const out: AnglePoint[] = []
  const n = Math.max(2, Math.floor(points))
  // 临界角参考：忽略膜层，用入射/基底实折射率估算
  const incNk = materialNk(matOf(model, model.incident.materialId), wl)
  const subNk = materialNk(matOf(model, model.substrate.materialId), wl)
  const sinCrit = subNk.n / incNk.n
  const crit = incNk.n > subNk.n ? (Math.asin(sinCrit) * 180) / Math.PI : NaN
  for (let i = 0; i < n; i++) {
    const a = (angleEndDeg * i) / (n - 1)
    const p = computeAt(model, wl, a, pol)
    out.push({ ...p, angleDeg: a, tir: !Number.isNaN(crit) && a > crit })
  }
  return out
}
