import { useState, useRef, useEffect } from 'react'

export default function VoiceButton({ onResult, disabled, side = 'right' }) {
  const [status, setStatus] = useState('idle') // idle | listening
  const [liveText, setLiveText] = useState('')
  const recRef = useRef(null)
  const finalRef = useRef('')

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null

  useEffect(() => {
    return () => recRef.current?.abort()
  }, [])

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
    }

    rec.onend = () => {
      setStatus('idle')
      const result = finalRef.current.trim()
      setLiveText('')
      if (result) onResult(result)
    }

    rec.onerror = e => {
      if (e.error !== 'no-speech') console.error('Speech error:', e.error)
      setStatus('idle')
      setLiveText('')
    }

    recRef.current = rec
    rec.start()
  }

  const stopListening = () => {
    recRef.current?.stop()
  }

  const isListening = status === 'listening'
  const onLeft = side === 'left'

  return (
    <div
      className={`fixed bottom-6 z-30 flex flex-col gap-3 ${onLeft ? 'left-5 items-start' : 'right-5 items-end'}`}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Live transcript bubble */}
      {(isListening || liveText) && (
        <div className="max-w-[72vw] bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl px-3.5 py-2 text-xs text-slate-600 leading-relaxed">
          {liveText ? `"${liveText}"` : 'Listening… tap to stop'}
        </div>
      )}

      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        aria-label={isListening ? 'Stop listening' : 'Tap to speak'}
        className="relative w-16 h-16 rounded-full active:scale-90 transition-transform duration-150 focus:outline-none"
      >
        {/* Outer pulse rings when listening */}
        {isListening && (
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
