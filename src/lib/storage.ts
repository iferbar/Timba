import { useCallback, useSyncExternalStore, type SetStateAction } from 'react'
import type { AlertEvent } from './announcer'
import type { ChipSet, StackMode } from './chips'
import { DEFAULT_SETS } from './defaults'
import type { Roster } from './roster'
import type { Game } from './timer'

export interface ChipConfig {
  sets: ChipSet[]
  selectedSetId: string
  players: number
  stackMode: StackMode
  customStack: number
}

export interface BlindConfig {
  levelMinutes: number
  durationMinutes: number
}

export interface AlertConfig {
  /** Silencia sonidos y voz (la vibración va aparte) */
  muted: boolean
  /** Leer en voz alta las ciegas al subir de nivel */
  voice: boolean
  vibration: boolean
  /** Aviso antes de que suba el nivel, en minutos (0 = sin aviso) */
  warnMinutes: number
  /** Sonido elegido para cada momento; sin elegir, el de serie (ver soundChoice.ts) */
  sounds: Partial<Record<AlertEvent, string>>
}

const DEFAULT_CHIP_CONFIG: ChipConfig = {
  sets: DEFAULT_SETS,
  selectedSetId: DEFAULT_SETS[0].id,
  players: 6,
  stackMode: 'normal',
  customStack: 400,
}

const DEFAULT_BLIND_CONFIG: BlindConfig = {
  levelMinutes: 20,
  durationMinutes: 150,
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  muted: false,
  voice: true,
  vibration: true,
  warnMinutes: 1,
  sounds: {},
}

function load<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return { ...fallback, ...JSON.parse(raw) }
  } catch {
    // Sin almacenamiento disponible: se usa la configuración por defecto
  }
  return fallback
}

// Una sola copia de cada clave para toda la app: si Inicio cambia los jugadores,
// el plan de partida y la calculadora lo ven al momento
const cache = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()

/** Estado guardado en el móvil para la próxima partida */
function usePersistentState<T extends object>(key: string, fallback: T) {
  if (!cache.has(key)) cache.set(key, load(key, fallback))

  const subscribe = useCallback(
    (onChange: () => void) => {
      const set = listeners.get(key) ?? new Set()
      listeners.set(key, set)
      set.add(onChange)
      return () => set.delete(onChange)
    },
    [key],
  )
  const value = useSyncExternalStore(subscribe, () => cache.get(key) as T)

  const setValue = useCallback(
    (next: SetStateAction<T>) => {
      const prev = cache.get(key) as T
      const value = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
      if (value === prev) return
      cache.set(key, value)
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // Ignorado: la app sigue funcionando sin guardar
      }
      listeners.get(key)?.forEach((notify) => notify())
    },
    [key],
  )
  return [value, setValue] as const
}

export function useChipConfig() {
  return usePersistentState('timba:chips', DEFAULT_CHIP_CONFIG)
}

export function useBlindConfig() {
  return usePersistentState('timba:blinds', DEFAULT_BLIND_CONFIG)
}

export function useAlertConfig() {
  return usePersistentState('timba:alerts', DEFAULT_ALERT_CONFIG)
}

/** Amigos habituales y quién juega hoy */
export function useRoster() {
  return usePersistentState<Roster>('timba:roster', { names: [], playing: [] })
}

export function useGameStore() {
  return usePersistentState<{ game: Game | null }>('timba:game', { game: null })
}

let counter = 0
export function newId(prefix: string): string {
  counter++
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}
