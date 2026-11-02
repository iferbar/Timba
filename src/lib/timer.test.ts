import { describe, expect, it } from 'vitest'
import type { BlindLevel } from './blinds'
import {
  elapsedMs,
  formatClock,
  goTo,
  isRunning,
  newGame,
  pause,
  play,
  playersLeft,
  remainingMs,
  setPlayersLeft,
  tick,
  alivePlayers,
  eliminate,
  finishers,
  undoElimination,
} from './timer'

const MIN = 60_000
const levels: BlindLevel[] = [5, 10, 15].map((sb, i) => ({
  level: i + 1,
  smallBlind: sb,
  bigBlind: sb * 2,
  startMinute: i * 20,
  colorUp: [],
  overtime: false,
}))

describe('timer', () => {
  it('empieza en pausa con el nivel completo', () => {
    const g = newGame(levels, [], 20)
    expect(isRunning(g)).toBe(false)
    expect(remainingMs(g, 0)).toBe(20 * MIN)
  })

  it('cuenta atrás en marcha y se congela en pausa', () => {
    let g = play(newGame(levels, [], 20), 0)
    expect(remainingMs(g, 5 * MIN)).toBe(15 * MIN)
    g = pause(g, 5 * MIN)
    expect(remainingMs(g, 50 * MIN)).toBe(15 * MIN)
    g = play(g, 50 * MIN)
    expect(remainingMs(g, 55 * MIN)).toBe(10 * MIN)
  })

  it('pasa de nivel al acabar el tiempo', () => {
    const g = tick(play(newGame(levels, [], 20), 0), 21 * MIN)
    expect(g.index).toBe(1)
    expect(remainingMs(g, 21 * MIN)).toBe(19 * MIN)
  })

  it('recupera varios niveles si el móvil estuvo bloqueado', () => {
    const g = tick(play(newGame(levels, [], 20), 0), 45 * MIN)
    expect(g.index).toBe(2)
    expect(remainingMs(g, 45 * MIN)).toBe(15 * MIN)
  })

  it('al acabar el último nivel se queda a 0 y parado', () => {
    const g = tick(play(newGame(levels, [], 20), 0), 90 * MIN)
    expect(g.index).toBe(2)
    expect(isRunning(g)).toBe(false)
    expect(remainingMs(g, 90 * MIN)).toBe(0)
  })

  it('saltar de nivel reinicia el tiempo y respeta la pausa', () => {
    let g = newGame(levels, [], 20)
    g = goTo(g, 1, 0)
    expect(g.index).toBe(1)
    expect(isRunning(g)).toBe(false)
    g = goTo(play(g, 0), 5, 3 * MIN)
    expect(g.index).toBe(2)
    expect(remainingMs(g, 3 * MIN)).toBe(20 * MIN)
  })

  it('calcula el tiempo total de partida', () => {
    const g = tick(play(newGame(levels, [], 20), 0), 25 * MIN)
    expect(elapsedMs(g, 25 * MIN)).toBe(25 * MIN)
  })

  it('formatea el reloj', () => {
    expect(formatClock(20 * MIN)).toBe('20:00')
    expect(formatClock(65_500)).toBe('1:06')
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(85 * MIN)).toBe('1:25:00')
  })
})

describe('jugadores que quedan', () => {
  it('empieza con todos y no baja de 1 ni sube de los que empezaron', () => {
    const game = { ...newGame([], [], 20), players: 8 }
    expect(playersLeft(game)).toBe(8)
    expect(playersLeft(setPlayersLeft(game, 5))).toBe(5)
    expect(playersLeft(setPlayersLeft(game, 0))).toBe(1)
    expect(playersLeft(setPlayersLeft(game, 12))).toBe(8)
  })
})

describe('eliminaciones con nombre', () => {
  const named = { ...newGame(levels, [], 20), players: 4, names: ['Ana', 'Dani', 'Iván', 'Marta'] }

  it('apunta quién cae, cuántos quedan y en qué puesto acaba', () => {
    const g = eliminate(eliminate(named, 'Dani'), 'Marta')
    expect(alivePlayers(g)).toEqual(['Ana', 'Iván'])
    expect(playersLeft(g)).toBe(2)
    expect([...finishers(g)]).toEqual([
      [4, 'Dani'],
      [3, 'Marta'],
    ])
  })

  it('con uno solo vivo, ese es el ganador', () => {
    const g = eliminate(eliminate(eliminate(named, 'Dani'), 'Marta'), 'Ana')
    expect(finishers(g).get(1)).toBe('Iván')
    // Al ganador no se le puede eliminar
    expect(eliminate(g, 'Iván')).toBe(g)
  })

  it('no elimina dos veces ni a quien no juega', () => {
    const g = eliminate(named, 'Dani')
    expect(eliminate(g, 'Dani')).toBe(g)
    expect(eliminate(g, 'Pepe')).toBe(g)
  })

  it('deshacer devuelve al último eliminado', () => {
    const g = undoElimination(eliminate(eliminate(named, 'Dani'), 'Marta'))
    expect(g.out).toEqual(['Dani'])
    expect(playersLeft(g)).toBe(3)
    expect(undoElimination(named)).toBe(named)
  })
})
