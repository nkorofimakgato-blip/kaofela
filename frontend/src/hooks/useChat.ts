import { useCallback, useEffect, useState } from 'react'
import * as Y from 'yjs'

export interface ChatMessage {
  id: string
  clientId: string
  name: string
  color: string
  text: string
  sentAt: number
}

export function useChat(
  ydoc: Y.Doc,
  myClientId: string,
  myName: string,
  myColor: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const chatArray = ydoc.getArray<ChatMessage>('chat')

  useEffect(() => {
    const update = () => {
      setMessages(chatArray.toArray())
    }
    chatArray.observe(update)
    update()
    return () => chatArray.unobserve(update)
  }, [chatArray])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const msg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        clientId: myClientId,
        name: myName,
        color: myColor,
        text: trimmed,
        sentAt: Date.now(),
      }

      ydoc.transact(() => {
        chatArray.push([msg])
        // Cap at 500 messages to keep the doc light
        if (chatArray.length > 500) {
          chatArray.delete(0, chatArray.length - 500)
        }
      })
    },
    [ydoc, chatArray, myClientId, myName, myColor]
  )

  return { messages, sendMessage }
}