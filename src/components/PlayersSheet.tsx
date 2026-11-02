import { useEffect, useRef, useState } from 'react'
import { clampPlayers, MAX_PLAYERS, MIN_PLAYERS } from '../lib/chips'
import { addName, MAX_NAME_LENGTH, removeName, togglePlaying, type Roster } from '../lib/roster'
import { useChipConfig, useRoster } from '../lib/storage'
import { CheckIcon, CloseIcon, TrashIcon } from './Icons'

/**
 * Hoja "Quién juega": los amigos habituales quedan guardados y se marca quién
 * viene hoy. Lo marcado fija el número de jugadores de la partida.
 */
export function PlayersSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [roster, setRoster] = useRoster()
  const [, setChipConfig] = useChipConfig()
  const [draft, setDraft] = useState('')

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const update = (next: Roster) => {
    setRoster(next)
    if (next.playing.length >= MIN_PLAYERS) {
      setChipConfig((c) => ({ ...c, players: clampPlayers(next.playing.length) }))
    }
  }
  const full = roster.playing.length >= MAX_PLAYERS
  const count = roster.playing.length

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="players-title"
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="players-title">Quién juega</h2>
          <button className="icon-btn" onClick={() => ref.current?.close()} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <form
          className="value-edit"
          onSubmit={(e) => {
            e.preventDefault()
            if (!full) update(addName(roster, draft))
            setDraft('')
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nombre"
            maxLength={MAX_NAME_LENGTH}
            enterKeyHint="done"
            autoCapitalize="words"
            aria-label="Nombre del jugador"
          />
          <button type="submit" className="pill active" disabled={!draft.trim() || full}>
            Añadir
          </button>
        </form>

        {roster.names.length > 0 && (
          <>
            <div className="names-head">
              <span className="setup-label">{count > 0 ? `Juegan ${count}` : 'Marca quién juega hoy'}</span>
              {count > 0 ? (
                <button className="link" onClick={() => update({ ...roster, playing: [] })}>
                  Sin nombres
                </button>
              ) : (
                <button
                  className="link"
                  onClick={() => update({ ...roster, playing: roster.names.slice(0, MAX_PLAYERS) })}
                >
                  Todos
                </button>
              )}
            </div>
            <ul className="name-rows">
              {roster.names.map((name) => {
                const playing = roster.playing.includes(name)
                return (
                  <li key={name}>
                    <button
                      className="name-toggle"
                      role="checkbox"
                      aria-checked={playing}
                      disabled={!playing && full}
                      onClick={() => update(togglePlaying(roster, name))}
                    >
                      <span className="name-check" aria-hidden="true">
                        {playing && <CheckIcon />}
                      </span>
                      {name}
                    </button>
                    <button
                      className="icon-btn name-remove"
                      onClick={() => update(removeName(roster, name))}
                      aria-label={`Quitar a ${name} de la lista`}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        <p className="muted">
          {count > 0 && count < MIN_PLAYERS
            ? `Marca al menos ${MIN_PLAYERS} para jugar con nombres.`
            : 'Con nombres, la voz despide a cada uno al caer y los premios salen con su nombre. Sin marcar a nadie, solo se cuentan.'}
        </p>
      </div>
    </dialog>
  )
}
