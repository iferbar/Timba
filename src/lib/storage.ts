import { useEffect, useState } from 'react'
import type { ChipSet, StackMode } from './chips'
import { DEFAULT_SETS } from './defaults'
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

function load<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return { ...fallback, ...JSON.parse(raw) }
  } catch {
    // Sin almacenamiento disponible: se usa la configuración por defecto
  }
  return fallback
}

/** Estado guardado en el móvil para la próxima partida */
function usePersistentState<T extends object>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => load(key, fallback))
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignorado: la app sigue funcionando sin guardar
    }
  }, [key, value])
  return [value, setValue] as const
}

export function useChipConfig() {
  return usePersistentState('timba:chips', DEFAULT_CHIP_CONFIG)
}

export function useBlindConfig() {
  return usePersistentState('timba:blinds', DEFAULT_BLIND_CONFIG)
}

export function useGameStore() {
  return usePersistentState<{ game: Game | null }>('timba:game', { game: null })
}

let counter = 0
export function newId(prefix: string): string {
  counter++
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}
