import type { ChipSet } from './chips'

export const DEFAULT_SETS: ChipSet[] = [
  {
    id: 'set-200',
    name: 'Set 200 pc',
    chips: [
      { id: 'blanca', name: 'Blanca', color: '#f4f4f4', value: 5, quantity: 50 },
      { id: 'roja', name: 'Roja', color: '#c0392b', value: 10, quantity: 50 },
      { id: 'verde', name: 'Verde', color: '#1e8449', value: 25, quantity: 50 },
      { id: 'azul', name: 'Azul', color: '#2163b8', value: 50, quantity: 50 },
    ],
  },
]
