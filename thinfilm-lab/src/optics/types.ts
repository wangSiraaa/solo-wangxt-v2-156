/** 偏振态：s（TE，电矢量垂直入射面）/ p（TM，电矢量平行入射面） */
export type Polarization = 's' | 'p'

/**
 * 膜层定义。
 * 厚度单位：nm（物理厚度，非光学厚度）。
 * materialId 指向材料库条目，折射率 ñ = n + iκ 由材料色散数据插值得到。
 */
export interface Layer {
  id: string
  materialId: string
  /** 物理厚度，单位 nm */
  thicknessNm: number
}

/** 完整膜系：入射介质 / 膜层序列 / 基底 */
export interface Stack {
  ambientId: string
  substrateId: string
  layers: Layer[]
}

/** 材料在某波长的复折射率 ñ = n + iκ（κ>0 表示吸收，e^{-iωt} 约定） */
export interface Material {
  id: string
  name: string
  /** 色散数据：按波长升序的 (λ[nm], n, κ) 表格；null 表示用户自定义常数 */
  table: DispersionPoint[] | null
  /** table 为 null 时使用的常数折射率 */
  constantN?: number
  constantK?: number
  /** 数据来源说明，诚实标注“示例参考数据，非实测保证” */
  note: string
}

export interface DispersionPoint {
  /** 波长，单位 nm */
  lambdaNm: number
  n: number
  k: number
}

/** 单点计算结果 */
export interface RTResult {
  R: number
  T: number
  /** A = 1 - R - T，吸收介质中 ≥ 0；无损时应为 0（数值误差量级） */
  A: number
  r: { re: number; im: number }
  t: { re: number; im: number }
}
