import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

interface UseYjsProviderResult {
  ydoc: Y.Doc | null
  provider: WebsocketProvider | null
  connected: boolean
}

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

    // Delay the connection slightly so React StrictMode's dev-mode
    // double-mount doesn't create-then-immediately-destroy a socket.
    const timer = setTimeout(() => {
      if (disposed) return

      console.log('[yjs] creating doc for room:', roomId)

      doc = new Y.Doc()
      ws = new WebsocketProvider(
        'ws://localhost:8080/ws',
        roomId,
        doc,
        { connect: true }
      )

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