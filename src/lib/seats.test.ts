import { describe, expect, it } from 'vitest'
import { drawMatches, drawSeats, drawSpeech, firstHand, handRoles, moveButtonSeat } from './seats'

const names = ['Ana', 'Dani', 'Iván', 'Laura', 'Marta']

/** Generador con semilla para que el sorteo se pueda repetir */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

describe('drawSeats', () => {
  it('sienta a todos una sola vez y elige el botón entre ellos', () => {
    for (let s = 1; s < 20; s++) {
      const draw = drawSeats(names, seeded(s))
      expect([...draw.seats].sort()).toEqual(names)
      expect(names).toContain(draw.dealer)
    }
  })

  it('no siempre sale el mismo orden', () => {
    const orders = new Set(Array.from({ length: 20 }, (_, s) => drawSeats(names, seeded(s + 1)).seats.join()))
    expect(orders.size).toBeGreaterThan(5)
  })
})

describe('firstHand', () => {
  it('las ciegas van a la izquierda del botón, dando la vuelta a la mesa', () => {
    expect(firstHand({ seats: names, dealer: 'Iván' })).toEqual({ button: 'Iván', small: 'Laura', big: 'Marta' })
    expect(firstHand({ seats: names, dealer: 'Marta' })).toEqual({ button: 'Marta', small: 'Ana', big: 'Dani' })
  })

  it('mano a mano el botón pone la pequeña', () => {
    expect(firstHand({ seats: ['Ana', 'Dani'], dealer: 'Dani' })).toEqual({ button: 'Dani', small: 'Dani', big: 'Ana' })
  })
})

describe('drawMatches', () => {
  it('vale solo con los mismos jugadores', () => {
    const draw = { seats: ['Dani', 'Ana', 'Iván'], dealer: 'Ana' }
    expect(drawMatches(draw, ['Ana', 'Dani', 'Iván'])).toBe(true)
    expect(drawMatches(draw, ['Ana', 'Dani'])).toBe(false)
    expect(drawMatches(draw, ['Ana', 'Dani', 'Laura'])).toBe(false)
    expect(drawMatches(undefined, ['Ana'])).toBe(false)
  })
})

describe('drawSpeech', () => {
  it('dice quién reparte y quién pone las ciegas', () => {
    expect(drawSpeech({ seats: names, dealer: 'Iván' })).toBe('Reparte Iván. Ciega pequeña, Laura. Ciega grande, Marta.')
    expect(drawSpeech({ seats: ['Ana', 'Dani'], dealer: 'Ana' })).toBe(
      'Reparte Ana, que pone la ciega pequeña. Ciega grande, Dani.',
    )
  })
})

describe('handRoles', () => {
  it('salta a los eliminados al poner las ciegas', () => {
    // Laura (3) ha caído: tras el botón de Iván (2) la pequeña es Marta y la grande Ana
    const seats = ['Ana', 'Dani', 'Iván', 'Laura', 'Marta']
    expect(handRoles(seats, ['Laura'], 2)).toEqual({ button: 2, small: 4, big: 0 })
  })

  it('si cae el del botón, el botón se queda en su asiento', () => {
    expect(handRoles(names, ['Iván'], 2)).toEqual({ button: 2, small: 3, big: 4 })
  })

  it('mano a mano el botón pone la pequeña', () => {
    expect(handRoles(names, ['Ana', 'Iván', 'Marta'], 1)).toEqual({ button: 1, small: 1, big: 3 })
  })
})

describe('moveButtonSeat', () => {
  it('pasa al siguiente vivo y da la vuelta a la mesa', () => {
    expect(moveButtonSeat(names, [], 1, 1)).toBe(2)
    expect(moveButtonSeat(names, ['Iván', 'Laura'], 1, 1)).toBe(4)
    expect(moveButtonSeat(names, ['Ana'], 4, 1)).toBe(1)
  })

  it('hacia atrás deshace un toque de más', () => {
    expect(moveButtonSeat(names, [], 2, -1)).toBe(1)
    expect(moveButtonSeat(names, [], 0, -1)).toBe(4)
    expect(moveButtonSeat(names, ['Dani'], 2, -1)).toBe(0)
  })
})
