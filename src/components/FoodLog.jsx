import { useState } from 'react'
import EditEntryModal from './EditEntryModal.jsx'

export default function FoodLog({ entries, onDelete, onEdit }) {
  const [editing, setEditing] = useState(null)

  if (entries.length === 0) return null

  return (
    <>
      <div className="space-y-2">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.99] transition-transform cursor-pointer"
            onClick={() => setEditing(entry)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">{entry.time}</p>
                <p className="text-sm text-slate-700 leading-snug line-clamp-2">
                  {entry.description}
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDelete(entry.id) }}
                className="text-slate-300 hover:text-violet-400 flex-shrink-0 mt-0.5 p-1 -mr-1 rounded-lg hover:bg-violet-50"
                aria-label="Delete entry"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className="text-base font-bold text-slate-800 tabular-nums">
                {entry.calories} cal
              </span>
              <span className="text-xs font-medium text-sky-500 bg-sky-50 px-2 py-0.5 rounded-full tabular-nums">
                {entry.protein}g P
              </span>
              <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full tabular-nums">
                {entry.carbs}g C
              </span>
              <span className="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full tabular-nums">
                {entry.fat}g F
              </span>
              <span className="text-xs text-slate-300 ml-auto">tap to edit</span>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditEntryModal
          entry={editing}
          onSave={updated => { onEdit(updated); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
