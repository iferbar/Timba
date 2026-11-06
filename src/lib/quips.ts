/**
 * Remates graciosos: tras la frase de cada momento la voz añade uno al azar
 * (sin repetir el anterior). Lo que va entre llaves se rellena con la partida;
 * un remate que pide algo que no hay (p. ej. {ganador} sin nombres) no sale.
 */
export type QuipMoment =
  | 'level'
  | 'colorUp'
  | 'warning'
  | 'outUnpaid'
  | 'outRefund'
  | 'outPaid'
  | 'bubble'
  | 'headsUp'
  | 'winner'
  | 'draw'

export type QuipVars = Partial<Record<'nombre' | 'ganador' | 'jugador1' | 'jugador2' | 'reparte' | 'euros', string>>

export const QUIPS: Record<QuipMoment, string[]> = {
  level: [
    'Se acabó lo barato.',
    'Las ciegas suben, como el precio de la luz.',
    'Quien no apueste ahora, que no llore luego.',
    'Ojo, que esto ya muerde.',
    'Hora de dejar de mirar el móvil.',
    'Las ciegas no esperan a nadie.',
  ],
  colorUp: [
    'Fuera calderilla.',
    'Las fichas pequeñas se jubilan.',
    'Cambio de moneda: esto ya es otra liga.',
  ],
  warning: [
    'Último minuto para robar ciegas baratas.',
    'Aprovechad, que se acaba la ganga.',
    'Un minuto. Tiempo de sobra para un farol.',
  ],
  outUnpaid: [
    '{nombre}, la mesa te echará de menos. Bueno, tus fichas sí.',
    'Otro que se va a ver la tele.',
    '{nombre}, siempre nos quedará la próxima.',
    'Nadie dijo que fuera fácil, {nombre}.',
    '{nombre} ha donado sus fichas a la causa.',
    'Ese all-in parecía buena idea.',
  ],
  outRefund: [
    'Al menos no pierdes dinero, {nombre}.',
    'Ni ganas ni pierdes: empate técnico con la vida.',
    '{nombre} se va como vino, con sus {euros} euros.',
  ],
  outPaid: [
    '{nombre} se va con la cartera más gorda.',
    'Buena partida, {nombre}. Hoy invitas tú.',
    'Con premio duele menos, ¿eh, {nombre}?',
  ],
  bubble: ['Aquí ya nadie quiere arriesgar.', 'Se acabaron los valientes.', 'Que nadie respire fuerte.'],
  headsUp: [
    'Los demás, a por bebida.',
    'Uno contra uno, como en las películas.',
    'Solo puede quedar uno.',
    '{jugador1} contra {jugador2}. Que empiece el espectáculo.',
  ],
  winner: [
    '{ganador}, hoy pagas tú las cervezas.',
    '{ganador} manda en esta mesa.',
    'Aplausos para {ganador}. Los demás, a llorar al parking.',
    'Que alguien le haga una foto a {ganador}.',
    'Ya hay campeón. Los demás, a fregar los vasos.',
  ],
  draw: ['Que la suerte os acompañe.', 'Barajad bien, que os conozco.', 'Sin trampas, que os estoy viendo.'],
}

/** Rellena las llaves; null si falta alguna */
export function fill(template: string, vars: QuipVars): string | null {
  let missing = false
  const text = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key as keyof QuipVars]
    if (value === undefined) missing = true
    return value ?? ''
  })
  return missing ? null : text
}

const lastUsed = new Map<QuipMoment, string>()

/** Un remate al azar para el momento, distinto del último que sonó (o null si no hay ninguno que cuadre) */
export function quip(moment: QuipMoment, vars: QuipVars = {}, random = Math.random): string | null {
  const options = QUIPS[moment].map((t) => fill(t, vars)).filter((t): t is string => t !== null)
  const fresh = options.length > 1 ? options.filter((t) => t !== lastUsed.get(moment)) : options
  if (fresh.length === 0) return null
  const pick = fresh[Math.floor(random() * fresh.length)]
  lastUsed.set(moment, pick)
  return pick
}

/** La frase con su remate detrás, si están activados */
export function withQuip(speech: string, moment: QuipMoment, vars: QuipVars, on: boolean): string {
  const extra = on ? quip(moment, vars) : null
  return extra ? `${speech} ${extra}` : speech
}
