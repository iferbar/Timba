import type { ChipColor, ChipSet } from '../lib/chips'
import { newId } from '../lib/storage'
import { Chip } from './Chip'

interface Props {
  sets: ChipSet[]
  onChange: (sets: ChipSet[]) => void
  onClose: () => void
}

export function SetEditor({ sets, onChange, onClose }: Props) {
  const updateSet = (id: string, patch: Partial<ChipSet>) =>
    onChange(sets.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const updateChip = (set: ChipSet, chipId: string, patch: Partial<ChipColor>) =>
    updateSet(set.id, { chips: set.chips.map((c) => (c.id === chipId ? { ...c, ...patch } : c)) })

  const addSet = () =>
    onChange([
      ...sets,
      {
        id: newId('set'),
        name: `Set ${sets.length + 1}`,
        chips: [{ id: newId('chip'), name: 'Blanca', color: '#f4f4f4', value: 5, quantity: 50 }],
      },
    ])

  const removeSet = (set: ChipSet) => {
    if (confirm(`¿Borrar "${set.name}"?`)) onChange(sets.filter((s) => s.id !== set.id))
  }

  return (
    <div className="screen">
      <div className="card-head">
        <h2>Sets de fichas</h2>
        <button className="pill active" onClick={onClose}>
          Listo
        </button>
      </div>

      {sets.map((set) => (
        <section key={set.id} className="card">
          <div className="card-head">
            <input
              className="set-name"
              value={set.name}
              onChange={(e) => updateSet(set.id, { name: e.target.value })}
              aria-label="Nombre del set"
            />
            <button className="link danger" onClick={() => removeSet(set)}>
              Borrar
            </button>
          </div>

          <div className="chip-grid chip-grid-head">
            <span />
            <span>Color</span>
            <span>Valor</span>
            <span>Cantidad</span>
            <span />
          </div>
          {set.chips.map((chip) => (
            <div key={chip.id} className="chip-grid">
              <label className="color-pick" aria-label="Elegir color">
                <Chip color={chip.color} size={30} />
                <input type="color" value={chip.color} onChange={(e) => updateChip(set, chip.id, { color: e.target.value })} />
              </label>
              <input value={chip.name} onChange={(e) => updateChip(set, chip.id, { name: e.target.value })} />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={chip.value || ''}
                onChange={(e) => updateChip(set, chip.id, { value: Number(e.target.value) })}
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={chip.quantity || ''}
                onChange={(e) => updateChip(set, chip.id, { quantity: Number(e.target.value) })}
              />
              <button
                className="icon-btn"
                aria-label="Quitar color"
                onClick={() => updateSet(set.id, { chips: set.chips.filter((c) => c.id !== chip.id) })}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="link"
            onClick={() =>
              updateSet(set.id, {
                chips: [...set.chips, { id: newId('chip'), name: 'Nuevo', color: '#888888', value: 100, quantity: 50 }],
              })
            }
          >
            + Añadir color
          </button>
          <p className="muted">
            {set.chips.reduce((n, c) => n + c.quantity, 0)} fichas · valor total{' '}
            {set.chips.reduce((n, c) => n + c.quantity * c.value, 0).toLocaleString('es-ES')}
          </p>
        </section>
      ))}

      <button className="pill wide" onClick={addSet}>
        + Nuevo set
      </button>
    </div>
  )
}
