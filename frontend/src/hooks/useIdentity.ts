import { useState } from 'react'

const SID_KEY = 'kaofela.sessionId'
const NAME_KEY = 'kaofela.name'
const COLOR_KEY = 'kaofela.color'

const PALETTE = [
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#60a5fa',
]

function randomId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function randomName(): string {
  return `User-${Math.floor(Math.random() * 1000)}`
}

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

function getOrSet(key: string, create: () => string): string {
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const value = create()
    sessionStorage.setItem(key, value)
    return value
  } catch {
    return create()
  }
}

export interface Identity {
  userId: string
  name: string
  color: string
}

/**
 * Per-tab, persistent identity.
 *
 * Uses sessionStorage, so:
 *   - Reload the tab → same identity (name, color, userId)
 *   - Open a second tab → different identity
 *   - Close the tab → identity is gone
 *
 * When we add auth (Phase 9), we'll swap this out for the logged-in user.
 */
export function useIdentity(): Identity {
  const [identity] = useState<Identity>(() => ({
    userId: getOrSet(SID_KEY, randomId),
    name: getOrSet(NAME_KEY, randomName),
    color: getOrSet(COLOR_KEY, randomColor),
  }))
  return identity
}