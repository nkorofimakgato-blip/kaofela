import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

interface UseYjsProviderResult {
  ydoc: Y.Doc | null
  provider: WebsocketProvider | null
  connected: boolean
}

/**
 * Creates a Yjs document + WebSocket connection for a given room.
 * Returns null until the provider is ready.
 *
 * @param roomId   The room/document name. Same room = shared doc.
 * @param userName Display name for cursors (used in Phase 4).
 */
export function useYjsProvider(
  roomId: string,
  userName: string
): UseYjsProviderResult {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    console.log('[yjs] creating doc for room:', roomId)

    const doc = new Y.Doc()

    const ws = new WebsocketProvider(
      'ws://localhost:8080/ws',
      roomId,
      doc,
      { connect: true }
    )

    // Set user info — used for awareness/cursors in Phase 4
    ws.awareness.setLocalStateField('user', {
      name: userName,
      color: randomColor(),
    })

    ws.on('status', (event: { status: string }) => {
      console.log('[yjs] status:', event.status)
      setConnected(event.status === 'connected')
    })

    ws.on('sync', (isSynced: boolean) => {
      console.log('[yjs] synced:', isSynced)
    })

    setYdoc(doc)
    setProvider(ws)

    return () => {
      console.log('[yjs] cleaning up room:', roomId)
      ws.disconnect()
      ws.destroy()
      doc.destroy()
    }
  }, [roomId, userName])

  return { ydoc, provider, connected }
}

function randomColor(): string {
  const palette = [
    '#22d3ee', // cyan
    '#a78bfa', // violet
    '#f472b6', // pink
    '#34d399', // emerald
    '#fbbf24', // amber
    '#fb7185', // rose
    '#60a5fa', // blue
  ]
  return palette[Math.floor(Math.random() * palette.length)]
}