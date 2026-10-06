import type { Scheme } from '../types'

/** 极简 IndexedDB 封装，无后端，全部数据仅存于浏览器本地 */
const DB_NAME = 'thin-film-lab'
const DB_VERSION = 1
const STORE = 'schemes'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      })
  )
}

export async function putScheme(scheme: Scheme): Promise<void> {
  await tx('readwrite', (s) => s.put(scheme))
}

export async function deleteScheme(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id))
}

export async function getAllSchemes(): Promise<Scheme[]> {
  const list = await tx<Scheme[]>('readonly', (s) => s.getAll())
  return list.sort((a, b) => b.updatedAt - a.updatedAt)
}
