import type { Material, NkPoint } from '../types'

export interface InterpResult {
  n: number
  k: number
  /** 查询波长是否超出表数据范围（此时按端点钳制，结果不可靠） */
  outOfRange: boolean
}

/** 对 n、k 分别按波长(nm)做线性插值；表外按最近端点钳制并标记 */
export function interpNk(table: NkPoint[], wl: number): InterpResult {
  if (table.length === 0) throw new Error('空色散表')
  const sorted = [...table].sort((a, b) => a.wl - b.wl)
  if (wl <= sorted[0].wl) {
    return { n: sorted[0].n, k: sorted[0].k, outOfRange: wl < sorted[0].wl }
  }
  const last = sorted[sorted.length - 1]
  if (wl >= last.wl) {
    return { n: last.n, k: last.k, outOfRange: wl > last.wl }
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (wl >= a.wl && wl <= b.wl) {
      const f = (wl - a.wl) / (b.wl - a.wl)
      return { n: a.n + (b.n - a.n) * f, k: a.k + (b.k - a.k) * f, outOfRange: false }
    }
  }
  return { n: last.n, k: last.k, outOfRange: true }
}

export function materialNk(mat: Material, wl: number): InterpResult {
  if (mat.kind === 'constant') {
    return { n: mat.n, k: mat.k, outOfRange: false }
  }
  return interpNk(mat.table, wl)
}

/** 在给定波长处该材料是否视为有吸收（|k| > 容差） */
export function isAbsorbing(mat: Material, wl: number, tol = 1e-9): boolean {
  return Math.abs(materialNk(mat, wl).k) > tol
}
