import { lazy, Suspense, useState } from 'react'
import { clampPlayers, distribute, MAX_PLAYERS, MIN_PLAYERS, sortedChips, targetStackFor } from '../lib/chips'
import { formatNumber } from '../lib/format'
import { useGamePlan } from '../lib/plan'
import { useBlindConfig, useChipConfig, useRoster } from '../lib/storage'
import { formatClock, isRunning, remainingMs } from '../lib/timer'
import type { GameClock } from '../lib/useGameClock'
import { Chip } from './Chip'
import { ChevronIcon, ClockIcon, MinusIcon, PlayIcon, PlusIcon, UsersIcon } from './Icons'
import { PlayersSheet } from './PlayersSheet'

const ChipScene = lazy(() => import('./ChipScene'))

export type Tab = 'inicio' | 'fichas' | 'ciegas' | 'reloj'

interface Props {
  clock: GameClock
  onNavigate: (tab: Tab) => void
}

export function Home({ clock, onNavigate }: Props) {
  const plan = useGamePlan()
  const [chipConfig, setChipConfig] = useChipConfig()
  const [blindConfig] = useBlindConfig()
  const [roster] = useRoster()
  const [naming, setNaming] = useState(false)
  const { game, now } = clock

  const set = chipConfig.sets.find((s) => s.id === chipConfig.selectedSetId) ?? chipConfig.sets[0]
  const chips = set ? sortedChips(set) : []
  const result = set
    ? distribute(set, chipConfig.players, targetStackFor(set, chipConfig.stackMode, chipConfig.customStack))
    : null
  const distribution = result?.ok ? result.distribution : null
  // Lo que más cambia en la mesa ("viene uno más"): se ajusta aquí sin ir a Fichas
  const setPlayers = (players: number) => setChipConfig((c) => ({ ...c, players: clampPlayers(players) }))

  const startOrResume = () => {
    if (game) return onNavigate('reloj')
    if (!plan) return onNavigate('fichas')
    clock.start(plan)
    onNavigate('reloj')
  }

  const level = game?.levels[game.index]
  const named = roster.playing.length
  // Los nombres solo cuentan si cuadran con los jugadores: si no, se avisa
  const namesMatch = named === chipConfig.players

  return (
    <div className="home">
      <div className="hero">
        <Suspense fallback={<div className="hero-scene" />}>
          <ChipScene chips={chips.map((c) => ({ color: c.color, value: c.value }))} />
        </Suspense>
      </div>

      <div className="screen home-body">
        <button className="cta" onClick={startOrResume}>
          <PlayIcon />
          <span>
            {game ? 'Continuar partida' : 'Empezar partida'}
            {game && level && (
              <small>
                Nivel {level.level} · {level.smallBlind}/{level.bigBlind} ·{' '}
                {isRunning(game) ? formatClock(remainingMs(game, now)) : 'en pausa'}
              </small>
            )}
          </span>
        </button>

        <section className="card setup" aria-label="Tu partida">
          <div className="setup-top">
            {set && (
              <button className="setup-set" onClick={() => onNavigate('fichas')}>
                <Chip color={chips[0]?.color ?? '#fff'} size={24} />
                <span className="setup-set-name">{set.name}</span>
                <ChevronIcon />
              </button>
            )}
            <div className="stepper compact" role="group" aria-label="Jugadores">
              <UsersIcon />
              <button
                onClick={() => setPlayers(chipConfig.players - 1)}
                disabled={chipConfig.players <= MIN_PLAYERS}
                aria-label="Menos jugadores"
              >
                <MinusIcon />
              </button>
              <span className="stepper-value" aria-live="polite">
                {chipConfig.players}
              </span>
              <button
                onClick={() => setPlayers(chipConfig.players + 1)}
                disabled={chipConfig.players >= MAX_PLAYERS}
                aria-label="Más jugadores"
              >
                <PlusIcon />
              </button>
            </div>
          </div>

          <button className={`setup-names ${named > 0 && !namesMatch ? 'mismatch' : ''}`} onClick={() => setNaming(true)}>
            <span>
              {named === 0
                ? 'Poner nombres a los jugadores'
                : namesMatch
                  ? roster.playing.join(', ')
                  : `${named} con nombre de ${chipConfig.players} jugadores: toca para ajustar`}
            </span>
            <ChevronIcon />
          </button>

          <button className="setup-deal" onClick={() => onNavigate('fichas')}>
            <span className="deal-head">
              <span className="setup-label">Cada jugador recibe</span>
              {distribution && (
                <span className="deal-stack">
                  Stack <strong>{formatNumber(distribution.stack)}</strong> · {distribution.bigBlinds} BB
                </span>
              )}
            </span>
            {distribution ? (
              <span className="deal">
                {distribution.perPlayer
                  .filter((p) => p.count > 0)
                  .map((p) => (
                    <span key={p.chip.id} className="deal-chip">
                      <Chip color={p.chip.color} size={28} value={p.chip.value} />
                      <span className="deal-count">
                        <strong>×{p.count}</strong>
                        <small>de {p.chip.value}</small>
                      </span>
                    </span>
                  ))}
              </span>
            ) : (
              <span className="deal-warning">{result && !result.ok ? result.reason : 'Elige un set de fichas'}</span>
            )}
          </button>

          <button className="setup-blinds" onClick={() => onNavigate('ciegas')}>
            <ClockIcon />
            <span>
              <strong>{blindConfig.levelMinutes} min</strong> por nivel
              {plan && (
                <>
                  {' '}
                  · empieza {plan.levels[0].smallBlind}/{plan.levels[0].bigBlind}
                </>
              )}
            </span>
            <ChevronIcon />
          </button>
        </section>
      </div>
      {naming && <PlayersSheet onClose={() => setNaming(false)} />}
    </div>
  )
}
