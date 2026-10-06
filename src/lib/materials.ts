import type { Material } from '../types'

/**
 * 内置材料库。
 * 色散表数据来源（表中波长单位 nm，折射率 ñ = n + i k，k>0 为吸收）：
 *  - 熔融石英(SiO₂)、BK7 玻璃：由标准 Sellmeier 系数在 300–1100 nm 每 50 nm 采样生成
 *    （SiO₂: Malitson 1965；BK7: Schott Sellmeier），n 精度约 1e-4；
 *  - 金(Au)：Johnson & Christy (1972) 实测 n,k 选点，仅覆盖表列波段；
 *  - 硅(Si)：常见实测 n,k 教学选点，仅覆盖表列波段。
 * 金属/半导体 k 远非 0 —— 切勿把它们当作无吸收常数处理。
 */
export const BUILTIN_MATERIALS: Material[] = [
  {
    id: 'mat-air',
    name: '空气 (vacuum/air)',
    kind: 'constant',
    n: 1.0,
    k: 0,
    table: [],
    builtin: true
  },
  {
    id: 'mat-sio2',
    name: '熔融石英 SiO₂ (Sellmeier 采样)',
    kind: 'table',
    n: 1.46,
    k: 0,
    builtin: true,
    table: [
      { wl: 300, n: 1.4878, k: 0 },
      { wl: 350, n: 1.4769, k: 0 },
      { wl: 400, n: 1.4701, k: 0 },
      { wl: 450, n: 1.4656, k: 0 },
      { wl: 500, n: 1.4623, k: 0 },
      { wl: 550, n: 1.4599, k: 0 },
      { wl: 600, n: 1.458, k: 0 },
      { wl: 650, n: 1.4565, k: 0 },
      { wl: 700, n: 1.4553, k: 0 },
      { wl: 750, n: 1.4542, k: 0 },
      { wl: 800, n: 1.4533, k: 0 },
      { wl: 850, n: 1.4525, k: 0 },
      { wl: 900, n: 1.4518, k: 0 },
      { wl: 950, n: 1.4511, k: 0 },
      { wl: 1000, n: 1.4504, k: 0 },
      { wl: 1050, n: 1.4498, k: 0 },
      { wl: 1100, n: 1.4492, k: 0 }
    ]
  },
  {
    id: 'mat-bk7',
    name: 'BK7 玻璃 (Sellmeier 采样)',
    kind: 'table',
    n: 1.52,
    k: 0,
    builtin: true,
    table: [
      { wl: 300, n: 1.5528, k: 0 },
      { wl: 350, n: 1.5392, k: 0 },
      { wl: 400, n: 1.5308, k: 0 },
      { wl: 450, n: 1.5253, k: 0 },
      { wl: 500, n: 1.5214, k: 0 },
      { wl: 550, n: 1.5185, k: 0 },
      { wl: 600, n: 1.5163, k: 0 },
      { wl: 650, n: 1.5145, k: 0 },
      { wl: 700, n: 1.5131, k: 0 },
      { wl: 750, n: 1.5118, k: 0 },
      { wl: 800, n: 1.5108, k: 0 },
      { wl: 850, n: 1.5098, k: 0 },
      { wl: 900, n: 1.509, k: 0 },
      { wl: 950, n: 1.5082, k: 0 },
      { wl: 1000, n: 1.5075, k: 0 },
      { wl: 1050, n: 1.5068, k: 0 },
      { wl: 1100, n: 1.5062, k: 0 }
    ]
  },
  {
    id: 'mat-mgf2',
    name: '氟化镁 MgF₂ (教学用常数)',
    kind: 'constant',
    n: 1.38,
    k: 0,
    table: [],
    builtin: true
  },
  {
    id: 'mat-tio2',
    name: '二氧化钛 TiO₂ (教学用常数)',
    kind: 'constant',
    n: 2.3,
    k: 0,
    table: [],
    builtin: true
  },
  {
    id: 'mat-au',
    name: '金 Au (Johnson-Christy 选点)',
    kind: 'table',
    n: 0.3,
    k: 3,
    builtin: true,
    table: [
      { wl: 450, n: 1.623, k: 1.957 },
      { wl: 500, n: 0.94, k: 1.96 },
      { wl: 550, n: 0.424, k: 2.354 },
      { wl: 600, n: 0.272, k: 2.95 },
      { wl: 650, n: 0.21, k: 3.55 },
      { wl: 700, n: 0.165, k: 4.11 },
      { wl: 750, n: 0.155, k: 4.56 },
      { wl: 800, n: 0.16, k: 4.96 },
      { wl: 850, n: 0.18, k: 5.33 },
      { wl: 900, n: 0.2, k: 5.7 },
      { wl: 950, n: 0.23, k: 6.06 },
      { wl: 1000, n: 0.26, k: 6.4 }
    ]
  },
  {
    id: 'mat-si',
    name: '硅 Si (可见光实测选点)',
    kind: 'table',
    n: 4,
    k: 0.04,
    builtin: true,
    table: [
      { wl: 400, n: 5.58, k: 0.39 },
      { wl: 450, n: 4.67, k: 0.09 },
      { wl: 500, n: 4.3, k: 0.06 },
      { wl: 550, n: 4.08, k: 0.04 },
      { wl: 600, n: 3.94, k: 0.02 },
      { wl: 650, n: 3.85, k: 0.01 },
      { wl: 700, n: 3.78, k: 0.01 },
      { wl: 750, n: 3.73, k: 0.007 },
      { wl: 800, n: 3.69, k: 0.005 },
      { wl: 900, n: 3.64, k: 0 },
      { wl: 1000, n: 3.57, k: 0 },
      { wl: 1100, n: 3.54, k: 0 }
    ]
  },
  {
    id: 'mat-ge',
    name: '锗 Ge (1550 nm 附近教学常数)',
    kind: 'constant',
    n: 4.0,
    k: 0,
    table: [],
    builtin: true
  }
]
