import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

interface UseYjsProviderResult {
  ydoc: Y.Doc | null
  provider: WebsocketProvider | null
  connected: boolean
}

// In dev: ws://localhost:8080/ws
// In prod: set VITE_WS_URL in Vercel's env vars, e.g. wss://kaofela-production.up.railway.app/ws
const WS_BASE_URL: string =
  import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws'

export function useYjsProvider(
  roomId: string,
  userName: string,
  userColor: string
): UseYjsProviderResult {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let disposed = false
    let doc: Y.Doc | null = null
    let ws: WebsocketProvider | null = null

    const timer = setTimeout(() => {
      if (disposed) return

      console.log('[yjs] creating doc for room:', roomId)

      doc = new Y.Doc()
      ws = new WebsocketProvider(WS_BASE_URL, roomId, doc, { connect: true })

      ws.awareness.setLocalStateField('user', {
        name: userName,
        color: userColor,
      })

      ws.on('status', (event: { status: string }) => {
        console.log('[yjs] status:', event.status)
        if (!disposed) setConnected(event.status === 'connected')
      })

      ws.on('sync', (isSynced: boolean) => {
        console.log('[yjs] synced:', isSynced)
      })

      setYdoc(doc)
      setProvider(ws)
    }, 50)

    return () => {
      disposed = true
      clearTimeout(timer)
      if (ws) {
        console.log('[yjs] cleaning up room:', roomId)
        ws.disconnect()
        ws.destroy()
      }
      if (doc) doc.destroy()
    }
  }, [roomId, userName, userColor])

  return { ydoc, provider, connected }
}