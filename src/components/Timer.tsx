import type { ReactNode } from 'react'
import type { BlindLevel } from '../lib/blinds'
import { formatNumber } from '../lib/format'
import { useGamePlan } from '../lib/plan'
import { BUY_IN, prizes } from '../lib/prizes'
import { elapsedMs, formatClock, isRunning, remainingMs } from '../lib/timer'
import type { GameClock } from '../lib/useGameClock'
import { formatHours, NoPlan } from './BlindStructure'
import { Chip } from './Chip'
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from './Icons'

interface Props {
  clock: GameClock
  onGoToChips: () => void
}

const ONE_MINUTE = 60_000

/**
 * Reloj de la partida, pensado para leerse desde la otra punta de la mesa:
 * el anillo se vacía a lo largo del nivel y las ciegas van casi tan grandes
 * como el tiempo.
 */
export function Timer({ clock, onGoToChips }: Props) {
  const plan = useGamePlan()
  const { game, now } = clock

  if (!game) {
    if (!plan) return <NoPlan onGoToChips={onGoToChips} />
    const first = plan.levels[0]
    return (
      <div className="screen timer">
        <div className="timer-status">
          <span className="status-pill">Nueva partida</span>
          <span className="timer-level">
            {plan.levels.length} niveles · {formatHours(plan.durationMinutes)}
          </span>
        </div>
        <Ring fraction={1}>
          <span className="timer-clock">{formatClock(plan.levelMinutes * ONE_MINUTE)}</span>
          <span className="ring-label">por nivel</span>
        </Ring>
        <Blinds label="Ciegas iniciales" level={first} next={plan.levels[1]} />
        <button className="cta" onClick={() => clock.start(plan)}>
          <PlayIcon />
          <span>Empezar partida</span>
        </button>
        <Stats
          items={[
            [plan.players, 'Jugadores'],
            [formatNumber(plan.stack), 'Stack'],
            [`${plan.players * BUY_IN} €`, 'Bote'],
          ]}
        />
        <Prizes players={plan.players} />
        <p className="muted center">Los niveles quedan fijos al empezar.</p>
      </div>
    )
  }

  const level = game.levels[game.index]
  const next = game.levels[game.index + 1]
  const rem = remainingMs(game, now)
  const running = isRunning(game)
  const finished = !running && rem === 0
  const chip = (value: number) => game.chips.find((c) => c.value === value)

  return (
    <div className="screen timer">
      <div className="timer-status">
        <span className={`status-pill ${running ? 'live' : ''}`}>
          <span className="status-dot" />
          {finished ? 'Partida terminada' : running ? 'Partida en curso' : 'En pausa'}
        </span>
        <span className="timer-level">
          {level.overtime && <span className="badge">Prórroga</span>}
          Nivel {level.level} de {game.levels.length}
        </span>
      </div>

      <Ring fraction={rem / game.levelMs} warning={running && rem <= ONE_MINUTE} paused={!running}>
        <span className="timer-clock">{formatClock(rem)}</span>
        <span className="ring-label">{finished ? 'último nivel' : running ? 'quedan del nivel' : 'en pausa'}</span>
      </Ring>

      <Blinds label="Ciegas" level={level} next={next} />

      {level.colorUp.length > 0 && (
        <div className="note">
          {level.colorUp.map((v) => (
            <span key={v} className="set-chip">
              <Chip color={chip(v)?.color ?? '#888'} size={28} value={v} /> Retirad las fichas de {v}
            </span>
          ))}
        </div>
      )}

      <button className="cta" onClick={clock.toggle} disabled={finished}>
        {running ? <PauseIcon /> : <PlayIcon />}
        <span>{running ? 'Pausar' : 'Reanudar'}</span>
      </button>

      <div className="timer-skip">
        <button className="ghost-btn" onClick={clock.prev} disabled={game.index === 0}>
          <PrevIcon />
          Anterior
        </button>
        <button className="ghost-btn" onClick={clock.next} disabled={!next}>
          Siguiente nivel
          <NextIcon />
        </button>
      </div>

      <Stats
        items={[
          [game.players ?? '–', 'Jugadores'],
          [game.stack ? formatNumber(game.stack) : '–', 'Stack'],
          [formatClock(elapsedMs(game, now), Math.floor), 'Jugado'],
        ]}
      />

      {game.players && <Prizes players={game.players} showPot />}

      <div className="timer-actions">
        <button className="link" onClick={clock.restartLevel}>
          Reiniciar nivel
        </button>
        <button
          className="link danger"
          onClick={() => {
            if (confirm('¿Terminar la partida?')) clock.end()
          }}
        >
          Terminar partida
        </button>
      </div>
    </div>
  )
}

const RING_R = 46
const RING_C = 2 * Math.PI * RING_R

/** Anillo que se vacía a medida que pasa el nivel */
function Ring({
  fraction,
  warning = false,
  paused = false,
  children,
}: {
  fraction: number
  warning?: boolean
  paused?: boolean
  children: ReactNode
}) {
  const f = Math.min(1, Math.max(0, fraction))
  return (
    <div className={`ring ${warning ? 'warning' : ''} ${paused ? 'paused' : ''}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r={RING_R} />
        <circle
          className="ring-bar"
          cx="50"
          cy="50"
          r={RING_R}
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - f)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

/** Ciegas del nivel en grande y las siguientes al lado, con el color-up que viene */
function Blinds({ label, level, next }: { label: string; level: BlindLevel; next?: BlindLevel }) {
  return (
    <section className="card blinds-now">
      <div className="blinds-main">
        <span className="setup-label">{label}</span>
        <strong>
          {formatNumber(level.smallBlind)} / {formatNumber(level.bigBlind)}
        </strong>
      </div>
      {next && (
        <div className="blinds-next">
          <span className="setup-label">Siguiente</span>
          <strong>
            {formatNumber(next.smallBlind)} / {formatNumber(next.bigBlind)}
          </strong>
          {next.colorUp.length > 0 && <small>retirar {next.colorUp.join(', ')}</small>}
        </div>
      )}
    </section>
  )
}

function Stats({ items }: { items: [ReactNode, string][] }) {
  return (
    <div className="timer-stats">
      {items.map(([value, label]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span className="setup-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

/** Premios: cobra la mitad de la mesa y el último premiado recupera lo apostado */
function Prizes({ players, showPot = false }: { players: number; showPot?: boolean }) {
  const list = prizes(players)
  return (
    <section className="card prizes">
      <div className="card-head">
        <h2>Premios</h2>
        {showPot && (
          <span className="setup-label">
            Bote <strong>{players * BUY_IN} €</strong>
          </span>
        )}
      </div>
      <ol>
        {list.map((amount, i) => (
          <li key={i} className={i === 0 ? 'first' : ''}>
            <span className="setup-label">{i + 1}º</span>
            <strong>{amount} €</strong>
            {list.length > 1 && amount === BUY_IN && <small>reintegro</small>}
          </li>
        ))}
      </ol>
    </section>
  )
}
