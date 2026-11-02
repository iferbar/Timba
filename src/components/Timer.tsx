import { useState, type ReactNode } from 'react'
import type { BlindLevel } from '../lib/blinds'
import { formatNumber } from '../lib/format'
import { useGamePlan } from '../lib/plan'
import { BUY_IN, prizes } from '../lib/prizes'
import { alivePlayers, elapsedMs, finishers, formatClock, isRunning, playersLeft, remainingMs } from '../lib/timer'
import type { GameClock } from '../lib/useGameClock'
import { formatHours, NoPlan } from './BlindStructure'
import { Chip } from './Chip'
import { KnockoutSheet } from './KnockoutSheet'
import { StackCounter } from './StackCounter'
import { ChipIcon, MinusIcon, NextIcon, PauseIcon, PlayIcon, PlusIcon, PrevIcon, RestartIcon, StopIcon } from './Icons'

interface Props {
  clock: GameClock
  onGoToChips: () => void
}

const ONE_MINUTE = 60_000

/**
 * Reloj de la partida, pensado para leerse desde la otra punta de la mesa y
 * caber entero en la pantalla: el anillo se vacía a lo largo del nivel y las
 * ciegas van casi tan grandes como el tiempo.
 */
export function Timer({ clock, onGoToChips }: Props) {
  const plan = useGamePlan()
  const { game, now } = clock
  const [counting, setCounting] = useState(false)
  const [knocking, setKnocking] = useState(false)

  if (!game) {
    if (!plan) return <NoPlan onGoToChips={onGoToChips} />
    const first = plan.levels[0]
    return (
      <div className="screen timer">
        <Ring fraction={1}>
          <span className="timer-clock">{formatClock(plan.levelMinutes * ONE_MINUTE)}</span>
          <span className="ring-label">
            por nivel · {plan.levels.length} niveles · {formatHours(plan.durationMinutes)}
          </span>
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
  const left = playersLeft(game)
  const winner = left === 1
  const prizeList = game.players ? prizes(game.players) : []
  const averageStack = game.players && game.stack && left ? (game.stack * game.players) / left : null
  // Stack medio en ciegas grandes: dice si la partida va lenta o rápida
  const average = averageStack !== null ? Math.round(averageStack / level.bigBlind) : null
  const retired = game.levels.slice(0, game.index + 1).flatMap((l) => l.colorUp)
  // Con nombres, el − pregunta quién cae y el + devuelve al último eliminado
  const named = Boolean(game.names)
  const alive = alivePlayers(game)
  const places = finishers(game)
  const lastOut = game.out?.at(-1)

  return (
    <div className="screen timer">
      {winner ? (
        <Ring fraction={1}>
          <span className="ring-winner">{places.get(1) ?? 'Ganador'}</span>
          {prizeList[0] && <span className="timer-clock">{prizeList[0]} €</span>}
          <span className="ring-label">{places.has(1) ? 'gana la partida' : 'partida terminada'}</span>
        </Ring>
      ) : (
        <Ring fraction={rem / game.levelMs} warning={running && rem <= ONE_MINUTE} paused={!running}>
          <span className="timer-clock">{formatClock(rem)}</span>
          <span className="ring-label">{finished ? 'último nivel' : running ? 'quedan del nivel' : 'en pausa'}</span>
        </Ring>
      )}

      <Blinds
        label={
          <>
            Nivel {level.level} de {game.levels.length}
            {level.overtime && <span className="badge">Prórroga</span>}
          </>
        }
        level={level}
        next={next}
      />

      {level.colorUp.length > 0 && (
        <div className="note">
          {level.colorUp.map((v) => (
            <span key={v} className="set-chip">
              <Chip color={chip(v)?.color ?? '#888'} size={28} value={v} /> Retirad las fichas de {v}
            </span>
          ))}
        </div>
      )}

      {/* Con un solo jugador la partida ha acabado: el botón grande la cierra */}
      {winner ? (
        <button className="cta" onClick={clock.end}>
          <StopIcon />
          <span>Terminar partida</span>
        </button>
      ) : (
        <div className="timer-controls">
          <button className="round-btn" onClick={clock.prev} disabled={game.index === 0} aria-label="Nivel anterior">
            <PrevIcon />
          </button>
          <button className="cta" onClick={clock.toggle} disabled={finished}>
            {running ? <PauseIcon /> : <PlayIcon />}
            <span>{running ? 'Pausar' : 'Reanudar'}</span>
          </button>
          <button className="round-btn" onClick={clock.next} disabled={!next} aria-label="Siguiente nivel">
            <NextIcon />
          </button>
        </div>
      )}

      <Stats
        items={[
          [
            game.players && left ? (
              <span className="mini-stepper">
                <button
                  onClick={() => (named ? setKnocking(true) : clock.setPlayersLeft(left - 1))}
                  disabled={left <= 1}
                  aria-label={named ? 'Apuntar quién cae' : 'Apuntar una eliminación'}
                >
                  <MinusIcon />
                </button>
                <span aria-live="polite">
                  {left}
                  <small>/{game.players}</small>
                </span>
                <button
                  onClick={() => (named ? clock.undoElimination() : clock.setPlayersLeft(left + 1))}
                  disabled={named ? !lastOut : left >= game.players}
                  aria-label={lastOut ? `Deshacer: vuelve ${lastOut}` : 'Deshacer la eliminación'}
                >
                  <PlusIcon />
                </button>
              </span>
            ) : (
              '–'
            ),
            'Quedan',
          ],
          [average !== null ? `${average} BB` : '–', 'Stack medio'],
          [formatClock(elapsedMs(game, now), Math.floor), 'Jugado'],
        ]}
      />

      {game.players && <Prizes players={game.players} left={left} places={places} showPot />}

      {!winner && (
        <div className="timer-actions">
          <button className="ghost-btn small" onClick={clock.restartLevel}>
            <RestartIcon />
            Reiniciar
          </button>
          <button className="ghost-btn small accent" onClick={() => setCounting(true)}>
            <ChipIcon />
            Mi stack
          </button>
          <button
            className="ghost-btn small danger"
            onClick={() => {
              if (confirm('¿Terminar la partida?')) clock.end()
            }}
          >
            <StopIcon />
            Terminar
          </button>
        </div>
      )}

      {knocking && (
        <KnockoutSheet
          alive={alive}
          prize={prizeList[alive.length - 1] ?? 0}
          onPick={clock.eliminate}
          onClose={() => setKnocking(false)}
        />
      )}

      {counting && (
        <StackCounter
          chips={game.chips}
          level={level}
          retired={retired}
          average={averageStack}
          onClose={() => setCounting(false)}
        />
      )}
    </div>
  )
}

const RING_R = 46
const RING_C = 2 * Math.PI * RING_R

/** Anillo que se vacía a medida que pasa el nivel; crece hasta llenar el hueco libre */
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
    <div className="ring-area">
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
    </div>
  )
}

/** Ciegas del nivel en grande y las siguientes al lado, con el color-up que viene */
function Blinds({ label, level, next }: { label: ReactNode; level: BlindLevel; next?: BlindLevel }) {
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

/**
 * Premios: cobra la mitad de la mesa y el último premiado recupera lo apostado.
 * Con la partida en marcha marca los puestos ya decididos (con su nombre) y el siguiente.
 */
function Prizes({
  players,
  left,
  places,
  showPot = false,
}: {
  players: number
  left?: number
  places?: Map<number, string>
  showPot?: boolean
}) {
  const list = prizes(players)
  const bubble = left === list.length + 1
  const headsUp = left === 2
  return (
    <section className="card prizes">
      <div className="card-head">
        <h2>
          Premios
          {bubble && <span className="badge">Burbuja</span>}
          {headsUp && <span className="badge">Mano a mano</span>}
        </h2>
        {showPot && (
          <span className="setup-label">
            Bote <strong>{players * BUY_IN} €</strong>
          </span>
        )}
      </div>
      <ol>
        {list.map((amount, i) => {
          const place = i + 1
          const done = left !== undefined && place > left
          const upNext = left !== undefined && left > 1 && place === left
          const name = places?.get(place)
          return (
            // Con nombre el puesto decidido se lee entero: es la clasificación
            <li key={i} className={`${i === 0 ? 'first' : ''} ${done && !name ? 'done' : ''} ${upNext ? 'next' : ''}`}>
              <span className="setup-label">{place}º</span>
              <strong>{amount} €</strong>
              {name ? (
                <small className="prize-name">{name}</small>
              ) : upNext ? (
                <small>siguiente</small>
              ) : (
                list.length > 1 && amount === BUY_IN && <small>reintegro</small>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
