import type { CSSProperties } from 'react'

interface Props {
  color: string
  size?: number
}

/** Ficha de poker dibujada con CSS */
export function Chip({ color, size = 32 }: Props) {
  const style = { '--chip': color, '--stripe': isLight(color) ? '#2b4a8a' : '#fff', width: size, height: size }
  return <span className="chip" style={style as CSSProperties} />
}

/** Las fichas claras llevan rayas oscuras para que se vean */
function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 186
}
