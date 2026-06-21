import { useState, useRef, useEffect } from 'react'

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
      <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z" />
    </svg>
  )
}

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
      className={`fixed bottom-6 z-30 flex flex-col gap-2 ${onLeft ? 'left-5 items-start' : 'right-5 items-end'}`}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Live transcript / status bubble */}
      {(isListening || liveText) && (
        <div className="max-w-[72vw] bg-white shadow-lg rounded-2xl px-3.5 py-2 text-xs text-slate-600 leading-relaxed">
          {liveText ? `"${liveText}"` : 'Listening… tap to stop'}
        </div>
      )}

      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        aria-label={isListening ? 'Stop listening' : 'Tap to speak'}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl
          transition-all duration-150 active:scale-95
          ${isListening
            ? 'bg-violet-500 text-white'
            : disabled
            ? 'bg-slate-300 text-white cursor-not-allowed'
            : 'bg-[#5f7c66] text-white'
          }
        `}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-50" />
        )}
        <span className="relative">
          {disabled && !isListening ? <Spinner /> : <MicIcon />}
        </span>
      </button>
    </div>
  )
}
