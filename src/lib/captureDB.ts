const DB_NAME = 'cubbyhole'
const STORE_NAME = 'captures'
const DB_VERSION = 2  // v2: Blob fields removed; cloudUrl + cloud array fields added

export type CaptureRecord = {
  id: string
  mode: string          // CaptureMode id, e.g. 'artwork2d'
  type: string          // human-readable label, e.g. '2D Masterpiece'
  title?: string
  creator?: string
  captureDate?: string
  captureTime?: string
  location?: string
  description?: string
  mediaType: 'image' | 'video'
  timestamp: number
  cloudUrl: string             // primary asset cloud URL
  cloudPages?: string[]        // document mode: page cloud URLs
  cloudFrames?: string[]       // scan3d mode: 8-frame cloud URLs
  cloudReliefFrames?: string[] // relief180 mode: 5-frame lenticular cloud URLs
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      // Drop v1 Blob-heavy store and recreate with lightweight schema
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME)
      }
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
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

export async function getAllCaptures(): Promise<CaptureRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      db.close()
      const all = req.result as CaptureRecord[]
      all.sort((a, b) => b.timestamp - a.timestamp)
      resolve(all)
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

export async function deleteCapture(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function updateCapture(
  id: string,
  updates: Partial<Pick<CaptureRecord, 'title' | 'creator' | 'captureDate' | 'captureTime' | 'location' | 'description'>>,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => {
      const record = req.result as CaptureRecord | undefined
      if (!record) { db.close(); reject(new Error('Record not found')); return }
      store.put({ ...record, ...updates })
    }
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}
