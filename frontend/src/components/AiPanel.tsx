import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { AiMessage } from '../hooks/useAiChat'

interface AiPanelProps {
  messages: AiMessage[]
  streaming: boolean
  error: string | null
  onSend: (text: string) => void
  onClear: () => void
}

const SUGGESTIONS = [
  'Summarize this',
  'Improve the grammar',
  'Suggest a better intro',
  'What should I add?',
]

export default function AiPanel({
  messages,
  streaming,
  error,
  onSend,
  onClear,
}: AiPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, streaming])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSend(input)
    setInput('')
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend(input)
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with clear button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
          AI Assistant
        </span>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-center pt-6">
              Ask me anything about your document.
            </p>
            <div className="grid gap-1.5 pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  className="text-left text-xs bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-cyan-500/50 rounded-lg px-3 py-2 text-gray-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === 'user'
          return (
            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-500 mb-1 px-1">
                {isUser ? 'You' : 'AI'}
              </span>
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-cyan-500 text-black'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {m.content || (streaming && i === messages.length - 1 ? (
                  <span className="inline-flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" />
                    <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ) : '')}
              </div>
            </div>
          )
        })}

        {error && (
          <div className="text-red-400 text-xs bg-red-950/40 border border-red-800/50 rounded-lg p-2">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-800 p-2 flex gap-2 items-end flex-shrink-0"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask the AI…"
          rows={1}
          disabled={streaming}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 resize-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold rounded-lg px-3 py-2 text-xs transition-colors"
        >
          {streaming ? '···' : '→'}
        </button>
      </form>
    </div>
  )
}