import type { CSSProperties } from 'react'
import { isLight } from '../lib/color'

interface Props {
  color: string
  size?: number
  /** Valor escrito en el centro, como en las fichas de verdad */
  value?: number
}

function chipLabel(value: number): string {
  return value >= 1000 ? `${value / 1000}K` : String(value)
}

/** Ficha de poker dibujada con CSS */
export function Chip({ color, size = 32, value }: Props) {
  const light = isLight(color)
  const label = value === undefined ? null : chipLabel(value)
  const style = {
    '--chip': color,
    '--stripe': light ? '#2b4a8a' : '#fff',
    '--chip-ink': light ? '#1d2b4f' : '#fff',
    width: size,
    height: size,
    // El centro mide ~84 % de la ficha: 3 cifras necesitan letra más pequeña
    fontSize: label ? size * (label.length > 2 ? 0.28 : 0.36) : undefined,
  }
  return (
    <span className="chip" style={style as CSSProperties}>
      {label && <span className="chip-value">{label}</span>}
    </span>
  )
}
