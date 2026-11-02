import { describe, expect, it } from 'vitest'
import { BUY_IN, prizes } from './prizes'

describe('prizes', () => {
  it('reparte como en nuestras partidas', () => {
    expect(prizes(4)).toEqual([15, 5])
    expect(prizes(5)).toEqual([20, 5])
    expect(prizes(6)).toEqual([15, 10, 5])
    expect(prizes(7)).toEqual([20, 10, 5])
    expect(prizes(8)).toEqual([20, 10, 5, 5])
    expect(prizes(9)).toEqual([20, 15, 5, 5])
  })

  it('con 2 o 3 jugadores el ganador se lo lleva todo', () => {
    expect(prizes(2)).toEqual([10])
    expect(prizes(3)).toEqual([15])
  })

  it('siempre reparte el bote entero entre la mitad de los jugadores', () => {
    for (let players = 2; players <= 20; players++) {
      const p = prizes(players)
      expect(p).toHaveLength(Math.max(1, Math.floor(players / 2)))
      expect(p.reduce((a, b) => a + b, 0)).toBe(players * BUY_IN)
      if (p.length > 1) expect(p.at(-1)).toBe(BUY_IN)
      for (let i = 0; i < p.length - 1; i++) {
        expect(p[i] % BUY_IN).toBe(0)
        // Escalonado: solo pueden empatar los que recuperan lo apostado
        if (p[i + 1] > BUY_IN) expect(p[i]).toBeGreaterThan(p[i + 1])
        else expect(p[i]).toBeGreaterThanOrEqual(p[i + 1])
      }
    }
  })
})
