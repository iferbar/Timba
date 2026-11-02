import { describe, expect, it } from 'vitest'
import type { BlindLevel } from './blinds'
import { levelSpeech, playersEvent, warningSpeech } from './announcer'

const level = (over: Partial<BlindLevel> = {}): BlindLevel => ({
  level: 5,
  smallBlind: 25,
  bigBlind: 50,
  startMinute: 80,
  colorUp: [],
  overtime: false,
  ...over,
})

describe('levelSpeech', () => {
  it('dice el nivel y las ciegas sin puntos de miles', () => {
    expect(levelSpeech(level())).toBe('Nivel 5. Ciegas 25, 50.')
    expect(levelSpeech(level({ smallBlind: 1000, bigBlind: 2000 }))).toBe('Nivel 5. Ciegas 1000, 2000.')
  })

  it('avisa del color-up', () => {
    expect(levelSpeech(level({ colorUp: [10, 25] }))).toBe('Nivel 5. Ciegas 25, 50. Retirad las fichas de 10 y 25.')
  })
})

describe('warningSpeech', () => {
  it('concuerda en singular y plural', () => {
    expect(warningSpeech(1)).toBe('Queda un minuto para subir las ciegas.')
    expect(warningSpeech(2)).toBe('Quedan 2 minutos para subir las ciegas.')
  })
})

describe('playersEvent', () => {
  it('marca burbuja, mano a mano y ganador al eliminar', () => {
    // 8 jugadores, cobran 4: burbuja con 5
    expect(playersEvent(6, 5, 4)).toBe('bubble')
    expect(playersEvent(5, 4, 4)).toBeNull()
    expect(playersEvent(3, 2, 4)).toBe('headsUp')
    expect(playersEvent(2, 1, 4)).toBe('winner')
  })

  it('deshacer una eliminación no avisa', () => {
    expect(playersEvent(4, 5, 4)).toBeNull()
  })

  it('con 3 jugadores la burbuja es el mano a mano', () => {
    expect(playersEvent(3, 2, 1)).toBe('headsUp')
  })
})
