import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { unlockAudio } from '../lib/alerts'
import { ALERT_EVENTS, levelSpeech, type AlertEvent } from '../lib/announcer'
import { playSound, removeCustomSound, setCustomSound, speak, useCustomSounds } from '../lib/sounds'
import { useAlertConfig } from '../lib/storage'
import { ChevronIcon, CloseIcon, FileIcon, MicIcon, PlayIcon, StopIcon, TrashIcon } from './Icons'

/** Aviso previo: con niveles de 20 min basta con un minuto */
const WARN_MINUTES = 1
const MAX_RECORD_SECONDS = 8
const MAX_FILE_BYTES = 2 * 1024 * 1024

/**
 * Hoja de ajustes de sonido: silencio, voz, vibración, aviso previo y un
 * sonido propio (grabado o elegido del móvil) para cada momento.
 */
export function SoundSettings({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [config, setConfig] = useAlertConfig()
  const customs = useCustomSounds()
  const [recording, setRecording] = useState<{ event: AlertEvent; seconds: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const fileFor = useRef<AlertEvent | null>(null)

  useEffect(() => {
    ref.current?.showModal()
    unlockAudio()
  }, [])

  const stopRecording = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }

  // Cuenta los segundos y corta sola al llegar al máximo
  useEffect(() => {
    if (!recording) return
    if (recording.seconds >= MAX_RECORD_SECONDS) {
      stopRecording()
      return
    }
    const id = setTimeout(() => setRecording((r) => r && { ...r, seconds: r.seconds + 1 }), 1000)
    return () => clearTimeout(id)
  }, [recording])

  // Cerrar la hoja a media grabación la guarda igualmente
  useEffect(() => stopRecording, [])

  const save = async (event: AlertEvent, blob: Blob, failure: string) => {
    if (await setCustomSound(event, blob)) playSound(event)
    else setError(failure)
  }

  const startRecording = async (event: AlertEvent) => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Este navegador no deja grabar. Prueba a elegir un archivo.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(null)
        void save(event, new Blob(chunks, { type: rec.mimeType }), 'No se ha podido guardar la grabación.')
      }
      recorder.current = rec
      rec.start()
      setRecording({ event, seconds: 0 })
    } catch {
      setError('Sin permiso para usar el micrófono.')
    }
  }

  const pickFile = (event: AlertEvent) => {
    setError(null)
    fileFor.current = event
    fileInput.current?.click()
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const event = fileFor.current
    if (!file || !event) return
    if (file.size > MAX_FILE_BYTES) setError('Ese archivo es demasiado grande (máximo 2 MB).')
    else void save(event, file, 'Ese archivo no se puede reproducir.')
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="sound-title"
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="sound-title">Sonido</h2>
          <button className="icon-btn" onClick={() => ref.current?.close()} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <div className="switches">
          <Switch
            label="Sonido"
            hint="Avisos y voz"
            checked={!config.muted}
            onChange={(on) => setConfig((c) => ({ ...c, muted: !on }))}
          />
          {/* Sin sonido tampoco hay voz: se ve apagada */}
          <Switch
            label="Voz"
            hint="Lee las ciegas al subir"
            checked={config.voice && !config.muted}
            disabled={config.muted}
            onChange={(voice) => setConfig((c) => ({ ...c, voice }))}
          />
          <button
            className="link voice-test"
            disabled={config.muted || !config.voice}
            onClick={() =>
              speak(levelSpeech({ level: 5, smallBlind: 25, bigBlind: 50, startMinute: 0, colorUp: [], overtime: false }))
            }
          >
            Probar la voz
          </button>
          <Switch
            label="Vibración"
            checked={config.vibration}
            onChange={(vibration) => setConfig((c) => ({ ...c, vibration }))}
          />
          <Switch
            label={`Aviso ${WARN_MINUTES} min antes`}
            hint="El cambio de nivel suena siempre"
            checked={config.warnMinutes > 0}
            onChange={(on) => setConfig((c) => ({ ...c, warnMinutes: on ? WARN_MINUTES : 0 }))}
          />
        </div>

        {/* Se toca una vez: queda plegado para que la hoja sea corta */}
        <details className="sound-custom">
          <summary>
            <span>
              Personalizar sonidos
              {customs.size > 0 && <small>{customs.size === 1 ? '1 propio' : `${customs.size} propios`}</small>}
            </span>
            <ChevronIcon />
          </summary>
          <ul className="sound-rows">
            {ALERT_EVENTS.map(({ event, label }) => {
              const own = customs.has(event)
              const isRecording = recording?.event === event
              return (
                <li key={event}>
                  <button
                    className="sound-btn play"
                    onClick={() => playSound(event)}
                    aria-label={`Escuchar: ${label}`}
                  >
                    <PlayIcon />
                  </button>
                  <span className="sound-name">
                    {label}
                    {isRecording ? (
                      <small className="recording">Grabando… {MAX_RECORD_SECONDS - recording.seconds} s</small>
                    ) : (
                      own && <small>Sonido propio</small>
                    )}
                  </span>
                  {isRecording ? (
                    <button className="sound-btn stop" onClick={stopRecording} aria-label="Parar la grabación">
                      <StopIcon />
                    </button>
                  ) : (
                    <span className="sound-actions">
                      <button
                        className="sound-btn"
                        onClick={() => void startRecording(event)}
                        disabled={recording !== null}
                        aria-label={`Grabar: ${label}`}
                      >
                        <MicIcon />
                      </button>
                      <button
                        className="sound-btn"
                        onClick={() => pickFile(event)}
                        disabled={recording !== null}
                        aria-label={`Elegir archivo: ${label}`}
                      >
                        <FileIcon />
                      </button>
                      {own && (
                        <button
                          className="sound-btn"
                          onClick={() => void removeCustomSound(event)}
                          aria-label={`Volver al de casino: ${label}`}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {error && <p className="note">{error}</p>}
          <p className="muted">
            Graba hasta {MAX_RECORD_SECONDS} s o elige un audio del móvil. Tras el sonido, la voz dice las ciegas.
          </p>
        </details>

        <input ref={fileInput} type="file" accept="audio/*" hidden onChange={onFile} />
      </div>
    </dialog>
  )
}

function Switch({
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      className="switch-row"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className="switch" aria-hidden="true" />
    </button>
  )
}
