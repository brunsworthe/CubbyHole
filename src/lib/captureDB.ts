const DB_NAME = 'cubbyhole'
const STORE_NAME = 'captures'
const DB_VERSION = 1

export type CaptureRecord = {
  id: string
  mode: string          // CaptureMode id, e.g. 'artwork2d'
  type: string          // human-readable label, e.g. '2D Masterpiece'
  asset: Blob
  mediaType: 'image' | 'video'
  timestamp: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveCapture(record: CaptureRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function getLatestCapture(): Promise<CaptureRecord | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      db.close()
      const all = req.result as CaptureRecord[]
      if (!all.length) { resolve(null); return }
      all.sort((a, b) => b.timestamp - a.timestamp)
      resolve(all[0])
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

export async function clearCaptures(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}
