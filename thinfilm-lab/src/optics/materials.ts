import type { DispersionPoint, Material } from './types'

/**
 * 内置材料库。
 * 所有数据为文献量级的【教学示例数据】，仅用于方法验证，不代表任何实际镀膜产品的实测值。
 * 色散通过对表格做线性插值获得；κ 恒为 0 的材料在数据范围内视为无损。
 * 超出表格波长范围时：取端点值并给出 outOfRange 警告（不外推、不假装知道）。
 */
export const MATERIALS: Material[] = [
  {
    id: 'air',
    name: '空气 Air',
    table: null,
    constantN: 1.0,
    constantK: 0,
    note: 'n=1，无损',
  },
  {
    id: 'sio2',
    name: 'SiO₂ 熔石英',
    table: [
      { lambdaNm: 400, n: 1.4701, k: 0 },
      { lambdaNm: 500, n: 1.4624, k: 0 },
      { lambdaNm: 600, n: 1.4580, k: 0 },
      { lambdaNm: 700, n: 1.4553, k: 0 },
      { lambdaNm: 800, n: 1.4533, k: 0 },
      { lambdaNm: 900, n: 1.4518, k: 0 },
      { lambdaNm: 1000, n: 1.4504, k: 0 },
    ],
    note: '教学示例数据（量级参考熔石英），400–1000 nm 内视为无损',
  },
  {
    id: 'mgf2',
    name: 'MgF₂ 氟化镁',
    table: [
      { lambdaNm: 400, n: 1.393, k: 0 },
      { lambdaNm: 550, n: 1.385, k: 0 },
      { lambdaNm: 700, n: 1.379, k: 0 },
      { lambdaNm: 1000, n: 1.375, k: 0 },
    ],
    note: '教学示例数据，常用增透膜材料，400–1000 nm 内视为无损',
  },
  {
    id: 'tio2',
    name: 'TiO₂ 二氧化钛',
    table: [
      { lambdaNm: 380, n: 2.90, k: 0.01 },
      { lambdaNm: 400, n: 2.75, k: 0.002 },
      { lambdaNm: 500, n: 2.55, k: 0 },
      { lambdaNm: 600, n: 2.45, k: 0 },
      { lambdaNm: 700, n: 2.40, k: 0 },
      { lambdaNm: 800, n: 2.36, k: 0 },
      { lambdaNm: 1000, n: 2.32, k: 0 },
    ],
    note: '教学示例数据；短波端有弱吸收（κ>0），非恒定折射率',
  },
  {
    id: 'ta2o5',
    name: 'Ta₂O₅ 五氧化二钽',
    table: [
      { lambdaNm: 400, n: 2.27, k: 0 },
      { lambdaNm: 550, n: 2.18, k: 0 },
      { lambdaNm: 800, n: 2.13, k: 0 },
      { lambdaNm: 1000, n: 2.11, k: 0 },
    ],
    note: '教学示例数据，常用高折射率无损膜料',
  },
  {
    id: 'bk7',
    name: 'BK7 玻璃（基底）',
    table: [
      { lambdaNm: 400, n: 1.5308, k: 0 },
      { lambdaNm: 500, n: 1.5214, k: 0 },
      { lambdaNm: 600, n: 1.5163, k: 0 },
      { lambdaNm: 700, n: 1.5131, k: 0 },
      { lambdaNm: 800, n: 1.5108, k: 0 },
      { lambdaNm: 1000, n: 1.5075, k: 0 },
    ],
    note: '教学示例数据，可见光区视为无损',
  },
  {
    id: 'ag',
    name: 'Ag 银（吸收金属）',
    table: [
      { lambdaNm: 400, n: 0.075, k: 1.93 },
      { lambdaNm: 500, n: 0.130, k: 2.92 },
      { lambdaNm: 600, n: 0.140, k: 3.91 },
      { lambdaNm: 700, n: 0.150, k: 4.60 },
      { lambdaNm: 800, n: 0.150, k: 5.10 },
      { lambdaNm: 1000, n: 0.220, k: 6.90 },
    ],
    note: '教学示例数据（量级参考 Johnson & Christy），强吸收：R+T<1，A=1-R-T',
  },
]

export function getMaterial(id: string): Material {
  const m = MATERIALS.find((x) => x.id === id)
  if (!m) throw new Error(`未知材料: ${id}`)
  return m
}

/* ---------- 用户自定义材料（常数 n、κ，存 localStorage） ---------- */
const LS_KEY = 'thinfilm-lab:custom-materials'

export function loadCustomMaterials(): void {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return
    for (const m of JSON.parse(raw) as Material[]) {
      if (!MATERIALS.some((x) => x.id === m.id)) MATERIALS.push(m)
    }
  } catch {
    /* 损坏数据忽略 */
  }
}

/** 添加自定义常数折射率材料；κ 由用户显式给出（不默认无吸收） */
export function addCustomMaterial(name: string, n: number, k: number): Material {
  const m: Material = {
    id: `custom_${Date.now().toString(36)}`,
    name: `${name}（自定义）`,
    table: null,
    constantN: n,
    constantK: k,
    note: '用户自定义常数折射率，无色散数据',
  }
  MATERIALS.push(m)
  persistCustom()
  return m
}

function persistCustom(): void {
  if (typeof localStorage === 'undefined') return
  const custom = MATERIALS.filter((m) => m.id.startsWith('custom_'))
  localStorage.setItem(LS_KEY, JSON.stringify(custom))
}

export interface NkResult {
  n: number
  k: number
  /** 波长超出材料数据范围，结果取端点值 */
  outOfRange: boolean
}

/**
 * 由色散表线性插值得到 (n, κ)。
 * 不做任何外推：超出范围取最近端点并置 outOfRange。
 * 常数材料（table=null）直接返回用户/库给定的 n、κ —— 是否含吸收由数据本身决定，
 * 程序不会把任何材料默认当作无吸收常数。
 */
export function nkAt(material: Material, lambdaNm: number): NkResult {
  if (!material.table) {
    return { n: material.constantN ?? 1, k: material.constantK ?? 0, outOfRange: false }
  }
  const t = material.table
  if (lambdaNm <= t[0].lambdaNm) {
    return { n: t[0].n, k: t[0].k, outOfRange: lambdaNm < t[0].lambdaNm }
  }
  const last = t[t.length - 1]
  if (lambdaNm >= last.lambdaNm) {
    return { n: last.n, k: last.k, outOfRange: lambdaNm > last.lambdaNm }
  }
  for (let i = 0; i < t.length - 1; i++) {
    const a: DispersionPoint = t[i]
    const b: DispersionPoint = t[i + 1]
    if (lambdaNm >= a.lambdaNm && lambdaNm <= b.lambdaNm) {
      const f = (lambdaNm - a.lambdaNm) / (b.lambdaNm - a.lambdaNm)
      return { n: a.n + f * (b.n - a.n), k: a.k + f * (b.k - a.k), outOfRange: false }
    }
  }
  // 不可达
  return { n: last.n, k: last.k, outOfRange: true }
}

/** 材料在数据范围内是否含吸收（用于能量守恒判据的说明） */
export function isAbsorbing(material: Material, lambdaNm: number): boolean {
  return nkAt(material, lambdaNm).k > 1e-12
}
