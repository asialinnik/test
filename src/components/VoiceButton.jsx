import { useState, useRef, useEffect } from 'react'

export default function VoiceButton({ onResult, disabled }) {
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
    rec.continuous = false
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

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        className={`
          w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-150
          ${isListening
            ? 'bg-violet-500 text-white shadow-lg shadow-violet-200 scale-[0.98]'
            : disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-green-700 text-white shadow-lg shadow-green-900/20 active:scale-95'
          }
        `}
      >
        {isListening ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Listening… tap to stop
          </span>
        ) : disabled ? (
          'Estimating…'
        ) : (
          '🎤  Tap to speak'
        )}
      </button>

      {liveText && (
        <p className="text-xs text-slate-500 italic text-center px-2 leading-relaxed">
          "{liveText}"
        </p>
      )}
    </div>
  )
}
