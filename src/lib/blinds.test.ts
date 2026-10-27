import { describe, expect, it } from 'vitest'
import { blindStructure, payable, type BlindInput } from './blinds'

const base: BlindInput = {
  players: 6,
  startingStack: 385,
  chipValues: [5, 10, 25, 50],
  levelMinutes: 20,
  durationMinutes: 150,
}

describe('blindStructure', () => {
  it('empieza con la ficha más pequeña como ciega pequeña', () => {
    const [first] = blindStructure(base)
    expect(first.smallBlind).toBe(5)
    expect(first.bigBlind).toBe(10)
  })

  it('las ciegas siempre suben y se pagan con las fichas del set', () => {
    for (const players of [5, 6, 9, 18]) {
      const levels = blindStructure({ ...base, players })
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].bigBlind).toBeGreaterThan(levels[i - 1].bigBlind)
      }
      for (const l of levels) {
        expect(l.smallBlind % 5).toBe(0)
        expect(l.bigBlind).toBe(l.smallBlind * 2)
      }
    }
  })

  it('al llegar a la duración objetivo la ciega grande ronda fichas totales / 12', () => {
    const levels = blindStructure(base)
    const atEnd = levels.find((l) => l.startMinute >= base.durationMinutes)!
    const total = base.players * base.startingStack
    expect(atEnd.bigBlind).toBeGreaterThan(total / 20)
    expect(atEnd.bigBlind).toBeLessThan(total / 6)
  })

  it('marca los niveles posteriores a la duración como prórroga', () => {
    const levels = blindStructure(base)
    expect(levels.filter((l) => !l.overtime)).toHaveLength(8)
    expect(levels.filter((l) => l.overtime).length).toBeGreaterThan(0)
  })

  it('más duración da ciegas más suaves', () => {
    const short = blindStructure({ ...base, durationMinutes: 120 })
    const long = blindStructure({ ...base, durationMinutes: 180 })
    expect(long[4].bigBlind).toBeLessThanOrEqual(short[4].bigBlind)
  })

  it('avisa de cuándo retirar las fichas pequeñas', () => {
    const levels = blindStructure(base)
    const whites = levels.find((l) => l.colorUp.includes(5))
    expect(whites).toBeDefined()
    expect(whites!.smallBlind).toBeGreaterThanOrEqual(20)
  })

  it('funciona con un set cuya ficha más pequeña es 25', () => {
    const levels = blindStructure({ ...base, chipValues: [25, 100, 500], startingStack: 5000 })
    expect(levels[0].bigBlind).toBe(50)
    for (const l of levels) expect(l.smallBlind % 25).toBe(0)
  })
})

describe('payable', () => {
  it('sabe si una cantidad se forma con ciertas fichas', () => {
    expect(payable(75, [25, 50])).toBe(true)
    expect(payable(15, [10, 25, 50])).toBe(false)
  })
})
