import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CUSTOM, DEFAULT_SOUND, labelFromFile, NONE, resolveSound } from './soundChoice'

const known = new Set(['chips-bells', 'gong', 'file:campana'])
const exists = (id: string) => known.has(id)

describe('resolveSound', () => {
  it('sin elegir nada suena el de serie, o el propio si lo hay', () => {
    expect(resolveSound('level', {}, false, exists)).toBe(DEFAULT_SOUND.level)
    expect(resolveSound('level', {}, true, exists)).toBe(CUSTOM)
  })

  it('respeta lo elegido aunque haya uno propio', () => {
    expect(resolveSound('level', { level: 'gong' }, true, exists)).toBe('gong')
    expect(resolveSound('level', { level: 'file:campana' }, false, exists)).toBe('file:campana')
    expect(resolveSound('level', { level: NONE }, false, exists)).toBe(NONE)
  })

  it('lo que ya no existe vuelve al de serie', () => {
    expect(resolveSound('level', { level: CUSTOM }, false, exists)).toBe(DEFAULT_SOUND.level)
    expect(resolveSound('level', { level: 'file:borrado' }, false, exists)).toBe(DEFAULT_SOUND.level)
  })
})

describe('DEFAULT_SOUND', () => {
  it('los archivos de serie están en src/assets/sounds', () => {
    const files = readdirSync(new URL('../assets/sounds', import.meta.url))
    for (const id of Object.values(DEFAULT_SOUND).filter((id) => id.startsWith('file:'))) {
      expect(files).toContain(id.slice('file:'.length))
    }
  })
})

describe('labelFromFile', () => {
  it('saca un nombre legible del archivo', () => {
    expect(labelFromFile('../assets/sounds/campana-hotel_2.mp3')).toBe('Campana hotel 2')
    expect(labelFromFile('fichas.ogg')).toBe('Fichas')
  })
})
