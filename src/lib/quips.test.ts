import { describe, expect, it } from 'vitest'
import { fill, quip, QUIPS, withQuip } from './quips'

describe('fill', () => {
  it('rellena las llaves y descarta si falta algo', () => {
    expect(fill('Adiós, {nombre}.', { nombre: 'Dani' })).toBe('Adiós, Dani.')
    expect(fill('{ganador} manda.', {})).toBeNull()
    expect(fill('Sin llaves.', {})).toBe('Sin llaves.')
  })
})

describe('quip', () => {
  it('no repite el último remate', () => {
    let previous = quip('level', {}, () => 0)
    for (let i = 0; i < 20; i++) {
      const next = quip('level', {}, () => 0)
      expect(next).not.toBe(previous)
      previous = next
    }
  })

  it('sin nombres solo salen los remates que no los piden', () => {
    for (let i = 0; i < 20; i++) expect(quip('winner', {})).toBe('Ya hay campeón. Los demás, a fregar los vasos.')
    for (let i = 0; i < 20; i++) expect(quip('headsUp', {})).not.toMatch(/\{/)
  })

  it('todos los remates acaban en punto o interrogación', () => {
    for (const list of Object.values(QUIPS)) for (const text of list) expect(text).toMatch(/[.?]$/)
  })
})

describe('withQuip', () => {
  it('añade el remate solo si están activados', () => {
    expect(withQuip('Mano a mano.', 'headsUp', {}, false)).toBe('Mano a mano.')
    expect(withQuip('Mano a mano.', 'headsUp', {}, true)).toMatch(/^Mano a mano\. .+/)
  })
})
