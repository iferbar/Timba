/**
 * Sonidos propios (grabados o elegidos del móvil) en IndexedDB: localStorage
 * es demasiado pequeño para audio. Clave = momento de la partida.
 */
const DB_NAME = 'timba'
const STORE = 'sounds'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadStoredSounds(): Promise<Map<string, Blob>> {
  const keys = await run('readonly', (s) => s.getAllKeys())
  const blobs = await run('readonly', (s) => s.getAll())
  return new Map(keys.map((k, i) => [String(k), blobs[i] as Blob]))
}

export function saveStoredSound(key: string, blob: Blob): Promise<IDBValidKey> {
  return run('readwrite', (s) => s.put(blob, key))
}

export function deleteStoredSound(key: string): Promise<undefined> {
  return run('readwrite', (s) => s.delete(key))
}
