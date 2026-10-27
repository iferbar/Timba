import { blindStructure, type BlindLevel } from './blinds'
import { distribute, sortedChips, targetStackFor, type ChipColor, type ChipSet } from './chips'
import { useBlindConfig, useChipConfig } from './storage'

export interface GamePlan {
  set: ChipSet
  /** Fichas del set ordenadas de menor a mayor valor */
  chips: ChipColor[]
  players: number
  stack: number
  levelMinutes: number
  durationMinutes: number
  levels: BlindLevel[]
}

/** Partida tal como está configurada en Fichas y Ciegas, o null si no hay reparto válido */
export function useGamePlan(): GamePlan | null {
  const [chipConfig] = useChipConfig()
  const [blindConfig] = useBlindConfig()

  const set = chipConfig.sets.find((s) => s.id === chipConfig.selectedSetId) ?? chipConfig.sets[0]
  if (!set) return null
  const result = distribute(set, chipConfig.players, targetStackFor(set, chipConfig.stackMode, chipConfig.customStack))
  if (!result.ok) return null

  const chips = sortedChips(set)
  const { stack } = result.distribution
  return {
    set,
    chips,
    players: chipConfig.players,
    stack,
    levelMinutes: blindConfig.levelMinutes,
    durationMinutes: blindConfig.durationMinutes,
    levels: blindStructure({
      players: chipConfig.players,
      startingStack: stack,
      chipValues: chips.map((c) => c.value),
      levelMinutes: blindConfig.levelMinutes,
      durationMinutes: blindConfig.durationMinutes,
    }),
  }
}
