import { reactive, computed } from 'vue'
import type { Layer, Material, ScanParams, Scheme } from '../types'
import { BUILTIN_MATERIALS } from './materials'
import { deleteScheme, getAllSchemes, putScheme } from './db'

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

interface State {
  materials: Material[]
  incident: Layer
  layers: Layer[]
  substrate: Layer
  params: ScanParams
  schemes: Scheme[]
  currentSchemeId: string | null
}

const defaultParams: ScanParams = {
  wlStart: 400,
  wlEnd: 1000,
  wlPoints: 301,
  angleDeg: 0,
  polarization: 's'
}

function defaultState(): State {
  // 默认膜系：空气 | MgF₂ λ/4 @550nm | BK7 —— 经典单层增透膜
  return {
    materials: BUILTIN_MATERIALS.map((m) => ({ ...m, table: m.table.map((p) => ({ ...p })) })),
    incident: { id: uid('lay'), materialId: 'mat-air', thickness: 0 },
    layers: [{ id: uid('lay'), materialId: 'mat-mgf2', thickness: 99.6 }],
    substrate: { id: uid('lay'), materialId: 'mat-bk7', thickness: 0 },
    params: { ...defaultParams },
    schemes: [],
    currentSchemeId: null
  }
}

const state = reactive<State>(defaultState())

export function useStore() {
  function materialById(id: string): Material | undefined {
    return state.materials.find((m) => m.id === id)
  }

  function addMaterial(mat?: Partial<Material>): Material {
    const m: Material = {
      id: uid('mat'),
      name: mat?.name ?? '新材料',
      kind: mat?.kind ?? 'constant',
      n: mat?.n ?? 1.5,
      k: mat?.k ?? 0,
      table: mat?.table ?? []
    }
    state.materials.push(m)
    return m
  }

  function removeMaterial(id: string) {
    const used =
      state.incident.materialId === id ||
      state.substrate.materialId === id ||
      state.layers.some((l) => l.materialId === id)
    if (used) throw new Error('该材料正被膜层使用，无法删除')
    const i = state.materials.findIndex((m) => m.id === id)
    if (i >= 0 && !state.materials[i].builtin) state.materials.splice(i, 1)
  }

  function addLayer(index?: number) {
    const layer: Layer = { id: uid('lay'), materialId: state.materials[0].id, thickness: 100 }
    const at = index === undefined ? state.layers.length : index
    state.layers.splice(at, 0, layer)
  }

  function removeLayer(index: number) {
    state.layers.splice(index, 1)
  }

  function moveLayer(index: number, dir: -1 | 1) {
    const j = index + dir
    if (j < 0 || j >= state.layers.length) return
    const tmp = state.layers[index]
    state.layers[index] = state.layers[j]
    state.layers[j] = tmp
  }

  function snapshot(name: string): Scheme {
    const now = Date.now()
    return {
      id: state.currentSchemeId ?? uid('sch'),
      name,
      createdAt: now,
      updatedAt: now,
      incident: JSON.parse(JSON.stringify(state.incident)),
      layers: JSON.parse(JSON.stringify(state.layers)),
      substrate: JSON.parse(JSON.stringify(state.substrate)),
      materials: JSON.parse(JSON.stringify(state.materials)),
      params: JSON.parse(JSON.stringify(state.params))
    }
  }

  async function saveScheme(name: string) {
    const existing = state.schemes.find((s) => s.id === state.currentSchemeId)
    const scheme = snapshot(name || existing?.name || '未命名方案')
    if (existing) scheme.createdAt = existing.createdAt
    await putScheme(scheme)
    state.currentSchemeId = scheme.id
    await refreshSchemes()
  }

  async function saveAsNew(name: string) {
    state.currentSchemeId = null
    await saveScheme(name)
  }

  function loadScheme(scheme: Scheme) {
    state.materials = JSON.parse(JSON.stringify(scheme.materials))
    state.incident = JSON.parse(JSON.stringify(scheme.incident))
    state.layers = JSON.parse(JSON.stringify(scheme.layers))
    state.substrate = JSON.parse(JSON.stringify(scheme.substrate))
    state.params = JSON.parse(JSON.stringify(scheme.params))
    state.currentSchemeId = scheme.id
  }

  async function removeScheme(id: string) {
    await deleteScheme(id)
    if (state.currentSchemeId === id) state.currentSchemeId = null
    await refreshSchemes()
  }

  async function refreshSchemes() {
    state.schemes = await getAllSchemes()
  }

  function resetAll() {
    const fresh = defaultState()
    Object.assign(state, fresh)
  }

  /** 载入算例预设（ExamplePreset 结构与 Scheme 的膜系部分一致） */
  function applyPreset(preset: {
    materials: Material[]
    incident: Layer
    layers: Layer[]
    substrate: Layer
    params: ScanParams
  }) {
    state.materials = JSON.parse(JSON.stringify(preset.materials))
    state.incident = JSON.parse(JSON.stringify(preset.incident))
    state.layers = JSON.parse(JSON.stringify(preset.layers))
    state.substrate = JSON.parse(JSON.stringify(preset.substrate))
    state.params = JSON.parse(JSON.stringify(preset.params))
    state.currentSchemeId = null
  }

  const stackModel = computed(() => ({
    incident: state.incident,
    layers: state.layers,
    substrate: state.substrate,
    materials: state.materials
  }))

  return {
    state,
    materialById,
    addMaterial,
    removeMaterial,
    addLayer,
    removeLayer,
    moveLayer,
    saveScheme,
    saveAsNew,
    loadScheme,
    removeScheme,
    refreshSchemes,
    resetAll,
    applyPreset,
    stackModel
  }
}
