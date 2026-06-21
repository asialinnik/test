import { useState, useRef, useEffect } from 'react'

const POS_KEY = 'vct-mic-pos'
const BTN = 64 // button diameter in px
const MARGIN = 12 // keep this far from screen edges
const DRAG_THRESHOLD = 6 // px of movement before it counts as a drag, not a tap

const loadPos = () => {
  try {
    const raw = localStorage.getItem(POS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

export default function VoiceButton({ onResult, disabled, side = 'right' }) {
  const [status, setStatus] = useState('idle') // idle | listening
  const [liveText, setLiveText] = useState('')
  const [pos, setPos] = useState(loadPos) // {x,y} top-left in px, or null = default corner
  const [dragging, setDragging] = useState(false)

  const recRef = useRef(null)
  const finalRef = useRef('')
  const silenceRef = useRef(null) // auto-stop timer after a pause in speech
  const dragRef = useRef(null) // { startX, startY, originX, originY, moved }

  const SILENCE_MS = 3000 // stop this long after the last words are heard

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null

  useEffect(() => {
    return () => {
      clearTimeout(silenceRef.current)
      recRef.current?.abort()
    }
  }, [])

  const armSilenceTimer = () => {
    clearTimeout(silenceRef.current)
    silenceRef.current = setTimeout(() => {
      recRef.current?.stop()
    }, SILENCE_MS)
  }

  // Keep the button on-screen if the viewport size changes (e.g. rotation).
  useEffect(() => {
    if (!pos) return
    const onResize = () => {
      setPos(p => p && {
        x: clamp(p.x, MARGIN, window.innerWidth - BTN - MARGIN),
        y: clamp(p.y, MARGIN, window.innerHeight - BTN - MARGIN),
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos])

  const startListening = () => {
    if (!SpeechRecognition) {
      alert(
        'Voice input is not supported in this browser.\nPlease use Chrome on Android or Safari on iPhone.'
      )
      return
    }

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.maxAlternatives = 1

    finalRef.current = ''

    rec.onstart = () => {
      setStatus('listening')
      setLiveText('')
      armSilenceTimer()
    }

    rec.onresult = e => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      if (final) finalRef.current += final
      setLiveText(finalRef.current || interim)
      armSilenceTimer() // heard something — restart the silence countdown
    }

    rec.onend = () => {
      clearTimeout(silenceRef.current)
      setStatus('idle')
      const result = finalRef.current.trim()
      setLiveText('')
      if (result) onResult(result)
    }

    rec.onerror = e => {
      if (e.error !== 'no-speech') console.error('Speech error:', e.error)
      clearTimeout(silenceRef.current)
      setStatus('idle')
      setLiveText('')
    }

    recRef.current = rec
    rec.start()
  }

  const stopListening = () => {
    clearTimeout(silenceRef.current)
    recRef.current?.stop()
  }

  const isListening = status === 'listening'
  const onLeft = side === 'left'

  // --- Drag handling (pointer events cover mouse + touch) ---
  const onPointerDown = e => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = e => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    d.moved = true
    setDragging(true)
    setPos({
      x: clamp(d.originX + dx, MARGIN, window.innerWidth - BTN - MARGIN),
      y: clamp(d.originY + dy, MARGIN, window.innerHeight - BTN - MARGIN),
    })
  }

  const onPointerUp = e => {
    const d = dragRef.current
    dragRef.current = null
    if (d?.moved) {
      // Was a drag — persist new position, don't toggle listening.
      setDragging(false)
      setPos(p => {
        if (p) localStorage.setItem(POS_KEY, JSON.stringify(p))
        return p
      })
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      return
    }
    // Was a tap — toggle listening.
    if (disabled) return
    isListening ? stopListening() : startListening()
  }

  // Positioning: custom dragged position, or default bottom corner.
  const containerStyle = pos
    ? { left: pos.x, top: pos.y, marginBottom: 'env(safe-area-inset-bottom)' }
    : { marginBottom: 'env(safe-area-inset-bottom)' }
  const containerPos = pos
    ? 'items-center'
    : `bottom-6 ${onLeft ? 'left-5 items-start' : 'right-5 items-end'}`

  return (
    <div
      className={`fixed z-30 flex flex-col gap-3 ${containerPos}`}
      style={containerStyle}
    >
      {/* Live transcript bubble */}
      {(isListening || liveText) && (
        <div className="max-w-[72vw] bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl px-3.5 py-2 text-xs text-slate-600 leading-relaxed">
          {liveText ? `"${liveText}"` : 'Listening… tap to stop'}
        </div>
      )}

      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        disabled={disabled}
        aria-label={isListening ? 'Stop listening' : 'Tap to speak, drag to move'}
        className={`relative w-16 h-16 rounded-full transition-transform duration-150 focus:outline-none touch-none select-none ${dragging ? 'scale-110 cursor-grabbing' : 'active:scale-90 cursor-grab'}`}
      >
        {/* Outer pulse rings when listening */}
        {isListening && !dragging && (
          <>
            <span className="absolute inset-0 rounded-full bg-violet-300/40 animate-ping" style={{ animationDuration: '1.4s' }} />
            <span className="absolute -inset-2 rounded-full bg-violet-200/25 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
          </>
        )}

        {/* The button face */}
        <span
          className={`
            absolute inset-0 rounded-full shadow-xl
            transition-all duration-300
            ${isListening
              ? 'bg-gradient-to-br from-violet-400 to-violet-600'
              : disabled
              ? 'bg-gradient-to-br from-slate-300 to-slate-400'
              : 'bg-gradient-to-br from-[#6e8f76] to-[#4a6652]'
            }
          `}
        />

        {/* Gloss highlight */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" />

        {/* Loading dots */}
        {disabled && !isListening && (
          <span className="relative z-10 flex gap-1 items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" />
          </span>
        )}
      </button>
    </div>
  )
}
