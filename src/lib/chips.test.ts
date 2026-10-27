import { describe, expect, it } from 'vitest'
import { distribute, targetStackFor, type ChipSet } from './chips'
import { DEFAULT_SETS } from './defaults'

const set200 = DEFAULT_SETS[0]

function counts(players: number, target: number) {
  const r = distribute(set200, players, target)
  if (!r.ok) throw new Error(r.reason)
  return r.distribution
}

describe('distribute', () => {
  it('reparte de forma escalonada: siempre menos fichas cuanto más alto el valor', () => {
    for (let players = 2; players <= 10; players++) {
      for (const mode of ['corto', 'normal', 'largo'] as const) {
        const d = counts(players, targetStackFor(set200, mode, 0))
        const c = d.perPlayer.map((p) => p.count)
        for (let i = 1; i < c.length; i++) expect(c[i]).toBeLessThan(c[i - 1])
      }
    }
  })

  it('nunca reparte más fichas de las que tiene el set', () => {
    for (let players = 2; players <= 10; players++) {
      const d = counts(players, targetStackFor(set200, 'largo', 0))
      for (const b of d.bank) expect(b.count).toBeGreaterThanOrEqual(0)
    }
  })

  it('da suficientes fichas pequeñas cuando el set lo permite', () => {
    expect(counts(5, 400).perPlayer[0].count).toBeGreaterThanOrEqual(8)
    expect(counts(9, 400).perPlayer[0].count).toBe(5)
  })

  it('se acerca al stack objetivo', () => {
    const d = counts(5, 400)
    expect(Math.abs(d.stack - 400) / 400).toBeLessThan(0.05)
    expect(d.bigBlind).toBe(10)
  })

  it('el stack largo es mayor que el corto', () => {
    const short = counts(6, targetStackFor(set200, 'corto', 0))
    const long = counts(6, targetStackFor(set200, 'largo', 0))
    expect(long.stack).toBeGreaterThan(short.stack)
  })

  it('avisa si no hay fichas pequeñas para tantos jugadores', () => {
    const r = distribute(set200, 30, 400)
    expect(r.ok).toBe(false)
  })

  it('deja fuera fichas desproporcionadas para el stack', () => {
    const set: ChipSet = {
      ...set200,
      chips: [...set200.chips, { id: 'negra', name: 'Negra', color: '#000', value: 1000, quantity: 20 }],
    }
    const r = distribute(set, 6, 400)
    if (!r.ok) throw new Error(r.reason)
    expect(r.distribution.perPlayer.at(-1)!.count).toBe(0)
  })
})
