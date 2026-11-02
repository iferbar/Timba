import { formatMinutes, type BlindLevel } from '../lib/blinds'
import type { ChipColor } from '../lib/chips'
import { formatNumber } from '../lib/format'
import { useGamePlan } from '../lib/plan'
import { useBlindConfig } from '../lib/storage'
import { formatClock, isRunning, remainingMs } from '../lib/timer'
import type { GameClock } from '../lib/useGameClock'
import { Chip } from './Chip'
import { ChevronIcon, UsersIcon } from './Icons'

const DURATIONS = [120, 150, 180, 240]
const LEVEL_LENGTHS = [15, 20, 30]

interface Props {
  clock: GameClock
  onGoToChips: () => void
}

export function BlindStructure({ clock, onGoToChips }: Props) {
  const plan = useGamePlan()
  const [config, setConfig] = useBlindConfig()
  const { game, now } = clock

  if (!plan) {
    return <NoPlan onGoToChips={onGoToChips} />
  }

  // Con una partida en marcha se muestran sus niveles (se fijaron al empezar)
  const levels = game?.levels ?? plan.levels
  const chips = game?.chips ?? plan.chips
  const current = game ? game.index : -1
  const level = levels[Math.max(current, 0)]
  const colorUps = levels.flatMap((l) =>
    l.colorUp.map((value) => ({ level: l, chip: chips.find((c) => c.value === value)! })),
  )

  return (
    <div className="screen">
      <section className="card level-hero">
        <div className="level-hero-head">
          <span className="setup-label">{game ? 'Nivel actual' : 'Empieza'}</span>
          <span className="setup-label">
            {game ? `Nivel ${level.level} de ${levels.length}` : `${levels.length} niveles`}
          </span>
        </div>
        <strong className="level-hero-blinds">
          {formatNumber(level.smallBlind)} / {formatNumber(level.bigBlind)}
        </strong>
        {game ? (
          <>
            <div className="bar">
              <div style={{ width: `${(1 - remainingMs(game, now) / game.levelMs) * 100}%` }} />
            </div>
            <span className="level-hero-meta">
              {isRunning(game) ? `Sube en ${formatClock(remainingMs(game, now))}` : 'En pausa'} ·{' '}
              {game.levelMs / 60_000} min por nivel
            </span>
          </>
        ) : (
          <span className="level-hero-meta">
            {plan.levelMinutes} min por nivel · pensado para {formatHours(plan.durationMinutes)}
          </span>
        )}
        <button className="level-hero-setup" onClick={onGoToChips}>
          <UsersIcon />
          <span>
            <strong>{game?.players ?? plan.players}</strong> jugadores · stack{' '}
            <strong>{formatNumber(game?.stack ?? plan.stack)}</strong> · {plan.set.name}
          </span>
          <ChevronIcon />
        </button>
      </section>

      <section className="card">
        <h2>Duración de la partida</h2>
        <div className="pills even">
          {DURATIONS.map((d) => (
            <button
              key={d}
              className={`pill ${config.durationMinutes === d ? 'active' : ''}`}
              onClick={() => setConfig((c) => ({ ...c, durationMinutes: d }))}
            >
              {formatHours(d)}
            </button>
          ))}
        </div>
        <h2 className="spaced">Cada nivel</h2>
        <div className="pills even">
          {LEVEL_LENGTHS.map((m) => (
            <button
              key={m}
              className={`pill ${config.levelMinutes === m ? 'active' : ''}`}
              onClick={() => setConfig((c) => ({ ...c, levelMinutes: m }))}
            >
              {m} min
            </button>
          ))}
        </div>
        {game && <p className="muted">La partida en curso sigue con sus niveles: esto cambia la próxima.</p>}
      </section>

      {colorUps.length > 0 && (
        <section className="card">
          <h2>Color-up</h2>
          <ul className="color-ups">
            {colorUps.map(({ level: l, chip }) => (
              <li key={chip.id} className={l.level - 1 < current ? 'done' : l.level - 1 === current ? 'now' : ''}>
                <Chip color={chip.color} size={34} value={chip.value} />
                <span className="color-up-what">
                  <strong>Retirar las de {chip.value}</strong>
                  <small>{chip.name}</small>
                </span>
                <span className="color-up-when">
                  <strong>Nivel {l.level}</strong>
                  <small>a las {formatMinutes(l.startMinute)}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>{game ? 'Próximos niveles' : 'Niveles'}</h2>
        <table className="levels">
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Ciegas</th>
              <th>Empieza</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((l, i) => (
              <LevelRow
                key={l.level}
                level={l}
                state={i < current ? 'past' : i === current ? 'current' : ''}
                firstOvertime={l.overtime && !levels[i - 1]?.overtime}
                colorUpChips={l.colorUp.map((v) => chips.find((c) => c.value === v)!)}
              />
            ))}
          </tbody>
        </table>
        <p className="muted">Si la partida se alarga, siguen los niveles de prórroga.</p>
      </section>
    </div>
  )
}

export function NoPlan({ onGoToChips }: { onGoToChips: () => void }) {
  return (
    <div className="screen">
      <section className="card warning">
        Primero ajusta las fichas: con la configuración actual no hay un reparto válido.
      </section>
      <button className="pill wide" onClick={onGoToChips}>
        Ir a Fichas
      </button>
    </div>
  )
}

function LevelRow({
  level: l,
  state,
  firstOvertime,
  colorUpChips,
}: {
  level: BlindLevel
  state: 'past' | 'current' | ''
  firstOvertime: boolean
  colorUpChips: ChipColor[]
}) {
  return (
    <>
      {firstOvertime && (
        <tr className="divider">
          <td colSpan={3}>Prórroga</td>
        </tr>
      )}
      <tr className={`${l.overtime ? 'overtime' : ''} ${state}`}>
        <td className="level-num">{l.level}</td>
        <td className="level-blinds">
          {formatNumber(l.smallBlind)} / {formatNumber(l.bigBlind)}
          {/* Marca el nivel en el que se retiran fichas: el detalle está en la tarjeta de color-up */}
          {colorUpChips.map((c) => (
            <span key={c.id} className="level-colorup" title={`Retirar fichas de ${c.value}`}>
              <Chip color={c.color} size={16} />
            </span>
          ))}
        </td>
        <td className="level-time">{formatMinutes(l.startMinute)}</td>
      </tr>
    </>
  )
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m}` : `${h} h`
}
