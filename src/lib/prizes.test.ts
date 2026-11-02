import { describe, expect, it } from 'vitest'
import { BUY_IN, DEFAULT_PRIZE_CONFIG, prizePlan, prizes, type PrizeConfig } from './prizes'

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

describe('prizes con otros premiados', () => {
  it('reparte entre los que se digan, con reintegro al último', () => {
    expect(prizes(7, BUY_IN, 2)).toEqual([30, 5])
    expect(prizes(7, BUY_IN, 1)).toEqual([35])
    expect(prizes(6, 10)).toEqual([30, 20, 10])
    for (let paid = 1; paid <= 9; paid++) {
      const p = prizes(9, BUY_IN, paid)
      expect(p).toHaveLength(paid)
      expect(p.reduce((a, b) => a + b, 0)).toBe(45)
      expect(p.every((a) => a > 0)).toBe(true)
    }
  })
})

describe('prizePlan', () => {
  const config = (byPlayers: PrizeConfig['byPlayers'], buyIn = BUY_IN): PrizeConfig => ({ buyIn, byPlayers })

  it('sin cambiar nada, el reparto de siempre', () => {
    expect(prizePlan(7, DEFAULT_PRIZE_CONFIG)).toEqual([20, 10, 5])
    expect(prizePlan(6, config({}, 10))).toEqual([30, 20, 10])
  })

  it('usa lo cambiado para ese número de jugadores', () => {
    const c = config({ 7: { paid: 3, amounts: [15, 15, 5] }, 8: { paid: 2 } })
    expect(prizePlan(7, c)).toEqual([15, 15, 5])
    expect(prizePlan(8, c)).toEqual([35, 5])
    expect(prizePlan(6, c)).toEqual([15, 10, 5])
  })

  it('si lo cambiado no cuadra con el bote, vuelve al escalonado', () => {
    expect(prizePlan(7, config({ 7: { amounts: [20, 10, 10] } }))).toEqual([20, 10, 5])
    expect(prizePlan(7, config({ 7: { paid: 2, amounts: [20, 10, 5] } }))).toEqual([30, 5])
    // Con otro buy-in el bote cambia y lo guardado ya no vale
    expect(prizePlan(7, config({ 7: { amounts: [15, 15, 5] } }, 10))).toEqual([40, 20, 10])
  })
})
