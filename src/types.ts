// 全局类型定义

/** 色散数据点：波长(nm) -> 折射率 n + i k（k>0 表示吸收，按 e^{-iωt} 约定） */
export interface NkPoint {
  wl: number
  n: number
  k: number
}

/** 材料：常复数或色散表插值 */
export interface Material {
  id: string
  name: string
  kind: 'constant' | 'table'
  n: number
  k: number
  table: NkPoint[]
  builtin?: boolean
}

/** 膜层 */
export interface Layer {
  id: string
  materialId: string
  /** 几何厚度，单位 nm（0 表示无厚度的半无限介质，仅用于入射/基底侧） */
  thickness: number
}

export type Polarization = 's' | 'p'

/** 计算/扫描参数 */
export interface ScanParams {
  /** 起始波长 nm */
  wlStart: number
  /** 终止波长 nm */
  wlEnd: number
  /** 采样点数 */
  wlPoints: number
  /** 入射角，单位 度（相对法线，0=正入射） */
  angleDeg: number
  polarization: Polarization
}

/** 单点计算结果（能量量纲） */
export interface PointResult {
  R: number
  T: number
  A: number
  /** 入射侧复折射角余弦 cosθ₀ */
  cosTheta0: number
}

/** 保存到 IndexedDB 的方案 */
export interface Scheme {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  incident: Layer
  layers: Layer[]
  substrate: Layer
  materials: Material[]
  params: ScanParams
  note?: string
}
