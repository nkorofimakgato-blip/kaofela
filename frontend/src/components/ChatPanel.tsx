import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { ChatMessage } from '../hooks/useChat'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  myClientId: string
}

export default function ChatPanel({
  messages,
  onSend,
  myClientId,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

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
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-8">
            No messages yet. Say hi 👋
          </p>
        )}

        {messages.map((m) => {
          const isMe = m.clientId === myClientId
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: m.color }}
                />
                <span className="text-[10px] text-gray-500">
                  {m.name}
                  {isMe && ' (you)'}
                </span>
              </div>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  isMe
                    ? 'bg-cyan-500 text-black'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {m.text}
              </div>
            </div>
          )
        })}
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
          placeholder="Type a message…"
          rows={1}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 resize-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold rounded-lg px-3 py-2 text-xs transition-colors"
        >
          →
        </button>
      </form>
    </div>
  )
}