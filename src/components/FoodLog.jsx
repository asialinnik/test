import { useState } from 'react'
import EditEntryModal from './EditEntryModal.jsx'

export default function FoodLog({ entries, onDelete, onEdit }) {
  const [editing, setEditing] = useState(null)

  if (entries.length === 0) return null

  return (
    <>
      <div className="space-y-1.5">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="bg-white/75 backdrop-blur-md rounded-xl px-3.5 py-2.5 shadow-sm border border-white/50 flex items-center gap-3 active:scale-[0.99] transition-transform cursor-pointer"
            onClick={() => setEditing(entry)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-snug truncate">{entry.description}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {entry.time} · <span className="text-sky-500 font-medium">{entry.protein}g protein</span>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-slate-800 tabular-nums leading-none">{entry.calories}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">kcal</div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditEntryModal
          entry={editing}
          onSave={updated => { onEdit(updated); setEditing(null) }}
          onDelete={() => { onDelete(editing.id); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
