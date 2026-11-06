import { useEffect, useState } from 'react'
import { unlockAudio } from '../lib/alerts'
import { withQuip } from '../lib/quips'
import { drawMatches, drawSeats, drawSpeech, firstHand, type SeatDraw } from '../lib/seats'
import { playDealerSound, playSeatSound, speak } from '../lib/sounds'
import { useAlertConfig, useRoster, type AlertConfig } from '../lib/storage'
import { SeatTable } from './SeatTable'
import { ShuffleIcon } from './Icons'

const SEAT_MS = 280
const DEALER_MS = 500

/** Campanas y, si está la voz, quién reparte y quién pone las ciegas */
function announceDealer(draw: SeatDraw, alerts: AlertConfig) {
  if (alerts.muted) return
  playDealerSound()
  const speech = withQuip(drawSpeech(draw), 'draw', { reparte: firstHand(draw).button }, alerts.quips)
  if (alerts.voice) setTimeout(() => speak(speech), 700)
}

/**
 * Sorteo de asientos y del botón antes de empezar: los nombres van saliendo
 * uno a uno con un ruido de ficha y al final se marca quién reparte.
 */
export function SeatsCard({ chipColors }: { chipColors: string[] }) {
  const [roster, setRoster] = useRoster()
  const [alerts] = useAlertConfig()
  const draw = drawMatches(roster.draw, roster.playing) ? roster.draw : undefined
  // Asientos destapados mientras se sortea; null = sin animación en marcha
  const [revealed, setRevealed] = useState<number | null>(null)

  useEffect(() => {
    if (revealed === null || !draw) return
    const last = revealed === draw.seats.length
    const id = setTimeout(
      () => {
        if (last) {
          setRevealed(null)
          announceDealer(draw, alerts)
        } else {
          if (!alerts.muted) playSeatSound()
          setRevealed(revealed + 1)
        }
      },
      last ? DEALER_MS : SEAT_MS,
    )
    return () => clearTimeout(id)
  }, [revealed, draw, alerts])

  const shuffle = () => {
    unlockAudio()
    const next = drawSeats(roster.playing)
    setRoster((r) => ({ ...r, draw: next }))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) announceDealer(next, alerts)
    else setRevealed(0)
  }

  const drawing = revealed !== null
  const hand = draw && firstHand(draw)

  return (
    <section className="card seats-card">
      <div className="card-head">
        <h2>Asientos</h2>
        {draw && !drawing && (
          <button className="link" onClick={shuffle}>
            Sortear otra vez
          </button>
        )}
      </div>
      {draw ? (
        <>
          <SeatTable
            seats={draw.seats}
            buttonSeat={drawing ? undefined : draw.seats.indexOf(draw.dealer)}
            revealed={revealed ?? undefined}
            chipColors={chipColors}
          />
          {hand && (
            <p className={`muted center ${drawing ? 'invisible' : ''}`}>
              Reparte <strong>{hand.button}</strong> ·{' '}
              {hand.button === hand.small ? 'pone la pequeña' : `pequeña ${hand.small}`} · grande {hand.big}
            </p>
          )}
        </>
      ) : (
        <button className="ghost-btn" onClick={shuffle}>
          <ShuffleIcon />
          Sortear asientos y botón
        </button>
      )}
    </section>
  )
}
