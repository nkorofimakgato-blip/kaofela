import { useCallback, useRef, useState } from 'react'

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Manages a personal AI conversation with streaming responses.
 * Also takes the current document text as context.
 */
export function useAiChat(documentContext: () => string) {
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || streaming) return

      setError(null)

      const userMsg: AiMessage = { role: 'user', content: trimmed }
      const history = [...messages, userMsg]
      setMessages([...history, { role: 'assistant', content: '' }])
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      // Include the current document as part of the system prompt
      const docText = documentContext().slice(0, 8000)
      const system = `You are Kaofela's AI writing assistant. Help the user work on their collaborative document.

Current document content:
---
${docText || '(empty)'}
---

Answer questions about the document, suggest improvements, fix grammar, generate ideas, summarize. Be concise and helpful. If the user asks you to rewrite something, propose the new text.`

      let assistant = ''

      try {
        const res = await fetch('http://localhost:8080/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system, messages: history }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`AI request failed: ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const t = line.trim()
            if (!t.startsWith('data:')) continue
            const data = t.slice(5).trim()
            if (data === '[DONE]') break
            if (!data) continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.error) {
                setError(String(parsed.error).slice(0, 200))
                continue
              }
              const token = parsed.choices?.[0]?.delta?.content
              if (typeof token === 'string' && token.length > 0) {
                assistant += token
                setMessages([...history, { role: 'assistant', content: assistant }])
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message)
        }
        setMessages(history)
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [messages, streaming, documentContext]
  )

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, streaming, error, send, clear }
}