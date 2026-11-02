import { describe, expect, it } from 'vitest'
import type { ChipColor } from './chips'
import { bigBlindsOf, colorUpExchange, stackTotal } from './stackCount'

const chip = (value: number): ChipColor => ({ id: `c${value}`, name: '', color: '#fff', value, quantity: 50 })
const chips = [chip(5), chip(10), chip(25), chip(50)]

describe('stackTotal', () => {
  it('suma cada color por su valor', () => {
    expect(stackTotal(chips, { c5: 6, c10: 5, c25: 4, c50: 3 })).toBe(330)
  })

  it('los colores sin contar valen 0', () => {
    expect(stackTotal(chips, { c50: 2 })).toBe(100)
    expect(stackTotal(chips, {})).toBe(0)
  })
})

describe('colorUpExchange', () => {
  it('redondea a la ficha más cercana', () => {
    expect(colorUpExchange(35, 25)).toBe(1)
    expect(colorUpExchange(40, 25)).toBe(2)
    expect(colorUpExchange(10, 25)).toBe(0)
  })
})

describe('bigBlindsOf', () => {
  it('con stack corto da un decimal; si no, ciegas enteras', () => {
    expect(bigBlindsOf(95, 20)).toBe(4.8)
    expect(bigBlindsOf(1240, 40)).toBe(31)
    expect(bigBlindsOf(1270, 40)).toBe(31)
  })
})
