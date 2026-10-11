import { useMemo } from 'react'

const DEFAULT_ROOM = 'demo-room'

export function useRoomId(): string {
  return useMemo(() => {
    if (typeof window === 'undefined') return DEFAULT_ROOM

    const params = new URLSearchParams(window.location.search)
    const raw = params.get('room')

    if (!raw) return DEFAULT_ROOM

    const clean = raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32)

    return clean || DEFAULT_ROOM
  }, [])
}