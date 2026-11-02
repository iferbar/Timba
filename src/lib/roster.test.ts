import { describe, expect, it } from 'vitest'
import { addName, cleanName, gameNames, removeName, togglePlaying, type Roster } from './roster'

const empty: Roster = { names: [], playing: [] }

describe('roster', () => {
  it('limpia espacios y corta los nombres largos', () => {
    expect(cleanName('  Dani   el  Rápido ')).toBe('Dani el Rápido')
    expect(cleanName('x'.repeat(30))).toHaveLength(20)
  })

  it('añade en orden alfabético y marca para jugar', () => {
    const r = addName(addName(empty, 'marta'), 'Dani')
    expect(r.names).toEqual(['Dani', 'marta'])
    expect(r.playing).toEqual(['Dani', 'marta'])
  })

  it('no repite un nombre que ya está (sin mirar mayúsculas ni tildes)', () => {
    const r = addName({ names: ['Iván'], playing: [] }, 'ivan')
    expect(r.names).toEqual(['Iván'])
    expect(r.playing).toEqual(['Iván'])
  })

  it('ignora nombres vacíos', () => {
    expect(addName(empty, '   ')).toBe(empty)
  })

  it('marca y desmarca, y al borrar también deja de jugar', () => {
    const r: Roster = { names: ['Ana', 'Dani', 'Marta'], playing: [] }
    const marked = togglePlaying(togglePlaying(r, 'Marta'), 'Ana')
    expect(marked.playing).toEqual(['Ana', 'Marta'])
    expect(togglePlaying(marked, 'Ana').playing).toEqual(['Marta'])
    expect(removeName(marked, 'Marta')).toEqual({ names: ['Ana', 'Dani'], playing: ['Ana'] })
  })

  it('solo da nombres a la partida si cuadran con los jugadores', () => {
    const r: Roster = { names: ['Ana', 'Dani', 'Marta'], playing: ['Ana', 'Dani'] }
    expect(gameNames(r, 2)).toEqual(['Ana', 'Dani'])
    expect(gameNames(r, 3)).toBeUndefined()
  })
})
