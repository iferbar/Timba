import type { CSSProperties } from 'react'
import { isLight } from '../lib/color'

interface Props {
  color: string
  size?: number
}

/** Ficha de poker dibujada con CSS */
export function Chip({ color, size = 32 }: Props) {
  const style = { '--chip': color, '--stripe': isLight(color) ? '#2b4a8a' : '#fff', width: size, height: size }
  return <span className="chip" style={style as CSSProperties} />
}
