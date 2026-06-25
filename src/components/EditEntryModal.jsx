import { useState } from 'react'
import { parseFood } from '../utils/parseFood.js'

export default function EditEntryModal({ entry, onSave, onDelete, onClose, apiKey }) {
  const [calories, setCalories] = useState(String(entry.calories))
  const [protein, setProtein] = useState(String(entry.protein))
  const [carbs, setCarbs] = useState(String(entry.carbs))
  const [fat, setFat] = useState(String(entry.fat))
  const [description, setDescription] = useState(entry.description)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcError, setRecalcError] = useState('')

  const descriptionChanged = description.trim() !== entry.description.trim()

  const handleRecalculate = async () => {
    if (!apiKey) { setRecalcError('No API key set — add one in Settings.'); return }
    setRecalculating(true)
    setRecalcError('')
    try {
      const data = await parseFood(description, apiKey)
      setCalories(String(Math.round(data.total.calories)))
      setProtein(String(Math.round(data.total.protein)))
      setCarbs(String(Math.round(data.total.carbs)))
      setFat(String(Math.round(data.total.fat)))
    } catch (e) {
      setRecalcError(e.message)
    } finally {
      setRecalculating(false)
    }
  }

  const handleSave = () => {
    onSave({
      ...entry,
      description: description.trim() || entry.description,
      calories: Math.max(0, parseInt(calories) || 0),
      protein: Math.max(0, parseInt(protein) || 0),
      carbs: Math.max(0, parseInt(carbs) || 0),
      fat: Math.max(0, parseInt(fat) || 0),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Edit Entry</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setRecalcError('') }}
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
            {descriptionChanged && (
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="mt-1.5 text-xs font-medium text-[#5f7c66] hover:text-[#4a6652] disabled:opacity-50"
              >
                {recalculating ? 'Recalculating…' : 'Recalculate nutrition →'}
              </button>
            )}
            {recalcError && <p className="mt-1 text-xs text-violet-600">{recalcError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Calories" value={calories} onChange={setCalories} unit="kcal" />
            <NumberField label="Protein" value={protein} onChange={setProtein} unit="g" color="text-[#4e74a0]" />
            <NumberField label="Carbs" value={carbs} onChange={setCarbs} unit="g" color="text-[#9d8fc7]" />
            <NumberField label="Fat" value={fat} onChange={setFat} unit="g" color="text-[#aaa3d4]" />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-green-700 text-white text-sm font-semibold active:scale-95 transition-transform"
          >
            Save
          </button>
        </div>

        <button
          onClick={onDelete}
          className="w-full mt-2 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-600 rounded-2xl"
        >
          Delete entry
        </button>
      </div>
    </div>
  )
}

function NumberField({ label, value, onChange, unit, color = 'text-slate-800' }) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
      <label className="text-xs font-semibold text-slate-400 block mb-1">{label}</label>
      <div className="flex items-baseline gap-1">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-transparent text-base font-bold focus:outline-none tabular-nums ${color}`}
          min="0"
        />
        <span className="text-xs text-slate-400 flex-shrink-0">{unit}</span>
      </div>
    </div>
  )
}
