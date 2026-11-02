import { describe, expect, it } from 'vitest'
import type { BlindLevel } from './blinds'
import { knockout, levelSpeech, placeWords, playersEvent, warningSpeech } from './announcer'
import { prizes } from './prizes'

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

describe('knockout', () => {
  // 7 jugadores: cobran 3 (20 · 10 · 5)
  const list = prizes(7)

  it('dice el puesto en palabras', () => {
    expect(placeWords(1)).toBe('primer puesto')
    expect(placeWords(3)).toBe('tercer puesto')
    expect(placeWords(7)).toBe('séptimo puesto')
    expect(placeWords(12)).toBe('puesto 12')
  })

  it('despide sin premio a quien cae fuera', () => {
    const k = knockout('Dani', 7, ['Ana', 'Iván', 'Laura', 'Marta', 'Pablo', 'Sergio'], list)
    expect(k.event).toBe('out')
    expect(k.speech).toBe('Adiós, Dani. Queda en séptimo puesto.')
    expect(k.banner).toMatchObject({ title: 'Adiós', big: 'Dani', subtitle: '7º puesto' })
  })

  it('avisa de la burbuja al caer el que la deja', () => {
    const k = knockout('Pablo', 5, ['Ana', 'Iván', 'Laura', 'Marta'], list)
    expect(k.event).toBe('bubble')
    expect(k.speech).toBe('Adiós, Pablo. Queda en quinto puesto. Burbuja: el siguiente en caer se va sin premio.')
  })

  it('el último premiado recupera lo apostado y empieza el mano a mano', () => {
    const k = knockout('Marta', 3, ['Ana', 'Iván'], list)
    expect(k.event).toBe('headsUp')
    expect(k.speech).toBe('Adiós, Marta. Tercer puesto, recupera sus 5 euros. Mano a mano entre Ana y Iván.')
    expect(k.banner).toMatchObject({ big: 'Ana y Iván', subtitle: 'Adiós, Marta: 3º puesto · 5 €' })
  })

  it('al caer el segundo anuncia al ganador', () => {
    const k = knockout('Ana', 2, ['Iván'], list)
    expect(k.event).toBe('winner')
    expect(k.speech).toBe('Adiós, Ana. Segundo puesto, se lleva 10 euros. Iván gana la partida y se lleva 20 euros.')
    expect(k.banner).toMatchObject({ title: 'Ganador', big: 'Iván', subtitle: 'Se lleva 20 €' })
  })
})
