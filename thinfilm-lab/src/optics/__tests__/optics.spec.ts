import { describe, it, expect } from 'vitest'
import { computeRT } from '../matrix'
import { getMaterial, nkAt } from '../materials'
import {
  quarterWaveSingleLayerR,
  symmetricStackR,
  interfaceR,
  brewsterDeg,
} from '../analytics'
import { exampleQuarterWave, exampleSymmetricStack } from '../examples'
import type { Stack } from '../types'

const nAt = (id: string, l: number) => nkAt(getMaterial(id), l).n

describe('算例 1：单层四分之一波膜', () => {
  it('数值解 = 解析公式 R = ((n0·ns−n1²)/(n0·ns+n1²))²', () => {
    const stack = exampleQuarterWave.buildStack()
    const { R, T } = computeRT(stack, 550, 0, 's')
    const analytic = quarterWaveSingleLayerR(1, nAt('mgf2', 550), nAt('bk7', 550))
    expect(R).toBeCloseTo(analytic, 12)
    expect(R + T).toBeCloseTo(1, 12) // 无损：能量守恒
  })
  it('s/p 偏振在正入射时退化一致', () => {
    const stack = exampleQuarterWave.buildStack()
    const rs = computeRT(stack, 550, 0, 's')
    const rp = computeRT(stack, 550, 0, 'p')
    expect(rs.R).toBeCloseTo(rp.R, 12)
  })
})

describe('算例 2：对称多层高反堆 (HL)^5 H', () => {
  it('数值解 = 解析导纳公式', () => {
    const stack = exampleSymmetricStack.buildStack()
    const { R, T } = computeRT(stack, 550, 0, 's')
    const analytic = symmetricStackR(1, nAt('ta2o5', 550), nAt('sio2', 550), nAt('bk7', 550), 5)
    expect(R).toBeCloseTo(analytic, 10)
    expect(R).toBeGreaterThan(0.97) // 高反带中心（解析值 ≈0.977）
    expect(R + T).toBeCloseTo(1, 12)
  })
})

describe('算例 3：掠入射与布儒斯特边界', () => {
  const bare: Stack = { ambientId: 'air', substrateId: 'bk7', layers: [] }
  it('R_p 在布儒斯特角处为零', () => {
    const thetaB = brewsterDeg(1, nAt('bk7', 550))
    const { R } = computeRT(bare, 550, thetaB, 'p')
    expect(R).toBeLessThan(1e-12)
  })
  it('θ→90° 时 R_s、R_p 均 →1（与 Fresnel 解析式逐点一致）', () => {
    for (const theta of [80, 85, 89, 89.5, 89.9]) {
      const ns = nAt('bk7', 550)
      const rs = computeRT(bare, 550, theta, 's')
      const rp = computeRT(bare, 550, theta, 'p')
      expect(rs.R).toBeCloseTo(interfaceR(1, ns, theta, 's').R, 12)
      expect(rp.R).toBeCloseTo(interfaceR(1, ns, theta, 'p').R, 12)
    }
    expect(computeRT(bare, 550, 89.9, 's').R).toBeGreaterThan(0.97)
    expect(computeRT(bare, 550, 89.9, 'p').R).toBeGreaterThan(0.97)
  })
  it('θ=90° 被拒绝（模型奇异，不硬算）', () => {
    expect(() => computeRT(bare, 550, 90, 's')).toThrow()
  })
})

describe('能量守恒判据', () => {
  it('无损任意膜系：R+T=1（含斜入射、两种偏振）', () => {
    const stack = exampleSymmetricStack.buildStack()
    for (const theta of [0, 30, 60]) {
      for (const pol of ['s', 'p'] as const) {
        for (const lambda of [450, 550, 700]) {
          const { R, T } = computeRT(stack, lambda, theta, pol)
          expect(Math.abs(R + T - 1)).toBeLessThan(1e-10)
        }
      }
    }
  })
  it('吸收介质（Ag）：A = 1−R−T > 0，且【不】强制 R+T=1', () => {
    const stack: Stack = {
      ambientId: 'air',
      substrateId: 'bk7',
      layers: [{ id: 'x', materialId: 'ag', thicknessNm: 50 }],
    }
    const { R, T, A } = computeRT(stack, 600, 0, 's')
    expect(A).toBeGreaterThan(0.01)
    expect(R + T).toBeLessThan(0.99)
    expect(R + T + A).toBeCloseTo(1, 12) // A 的定义即 1−R−T
  })
  it('无损膜 + 半无限吸收基底：R+T=1 仍成立（T 为进入基底并被吸收的能流）', () => {
    const stack: Stack = {
      ambientId: 'air',
      substrateId: 'ag',
      layers: [{ id: 'x', materialId: 'sio2', thicknessNm: 100 }],
    }
    const { R, T, A } = computeRT(stack, 600, 45, 'p')
    // 膜层本身无损，A(膜)=0；进入基底的 T 最终在基底内耗散
    expect(Math.abs(R + T - 1)).toBeLessThan(1e-10)
    expect(A).toBeCloseTo(0, 10)
    expect(T).toBeGreaterThan(0)
  })
})

describe('色散插值', () => {
  it('表格点处精确命中，中间线性插值', () => {
    const m = getMaterial('sio2')
    expect(nkAt(m, 500).n).toBeCloseTo(1.4624, 12)
    expect(nkAt(m, 550).n).toBeCloseTo((1.4624 + 1.4580) / 2, 12)
  })
  it('超出范围取端点并置警告标志（不外推）', () => {
    const m = getMaterial('sio2')
    const r = nkAt(m, 1200)
    expect(r.outOfRange).toBe(true)
    expect(r.n).toBeCloseTo(1.4504, 12)
  })
  it('吸收材料 κ 随插值非零 —— 不默认无吸收', () => {
    const m = getMaterial('ag')
    expect(nkAt(m, 550).k).toBeGreaterThan(2)
  })
})
