import type { Stack } from '../optics/types'
import type { SweepConfig } from '../optics/sweep'

/** 保存的方案：膜系 + 扫描配置 + 时间戳 */
export interface SavedDesign {
  id?: number
  name: string
  savedAt: string
  stack: Stack
  sweep: SweepConfig
}

const DB_NAME = 'thinfilm-lab'
const STORE = 'designs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveDesign(d: SavedDesign): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).add(d)
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
  })
}

export async function listDesigns(): Promise<SavedDesign[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () =>
      resolve((req.result as SavedDesign[]).sort((a, b) => b.savedAt.localeCompare(a.savedAt)))
    req.onerror = () => reject(req.error)
  })
}

export async function deleteDesign(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
