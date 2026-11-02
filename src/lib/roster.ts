/** Amigos habituales y quién juega hoy (vacío = partida sin nombres) */
export interface Roster {
  names: string[]
  playing: string[]
}

export const MAX_NAME_LENGTH = 20

export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH)
}

const sameName = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' }) === 0
const sortNames = (names: string[]) => [...names].sort((a, b) => a.localeCompare(b, 'es'))

/** Los que juegan siempre en el orden de la lista */
function withPlaying(names: string[], playing: Iterable<string>): Roster {
  const set = new Set(playing)
  return { names, playing: names.filter((n) => set.has(n)) }
}

/** Añade un nombre (si ya estaba, no lo repite) y lo marca para jugar hoy */
export function addName(roster: Roster, raw: string): Roster {
  const name = cleanName(raw)
  if (!name) return roster
  const existing = roster.names.find((n) => sameName(n, name))
  const names = existing ? roster.names : sortNames([...roster.names, name])
  return withPlaying(names, [...roster.playing, existing ?? name])
}

export function removeName(roster: Roster, name: string): Roster {
  return withPlaying(
    roster.names.filter((n) => n !== name),
    roster.playing,
  )
}

export function togglePlaying(roster: Roster, name: string): Roster {
  const playing = roster.playing.includes(name)
    ? roster.playing.filter((n) => n !== name)
    : [...roster.playing, name]
  return withPlaying(roster.names, playing)
}

/** Nombres para la partida: solo si cuadran con el número de jugadores */
export function gameNames(roster: Roster, players: number): string[] | undefined {
  return roster.playing.length === players ? roster.playing : undefined
}
