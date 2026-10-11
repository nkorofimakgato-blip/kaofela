import { useMemo } from 'react'

const STORAGE_KEY = 'kaofela:identity:v1'

export interface Identity {
  userId: string
  name: string
  color: string
}

const COLORS = [
  '#22d3ee', // cyan
  '#a78bfa', // violet
  '#f472b6', // pink
  '#facc15', // yellow
  '#4ade80', // green
  '#fb923c', // orange
  '#60a5fa', // blue
  '#f87171', // red
]

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers / non-secure contexts
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  )
}

function generateIdentity(): Identity {
  return {
    userId: makeUuid(),
    name: `User-${Math.floor(1000 + Math.random() * 9000)}`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
}

function loadStored(): Identity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Identity>
    if (
      typeof parsed.userId === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.color === 'string'
    ) {
      return parsed as Identity
    }
  } catch {
    /* ignore */
  }
  return null
}

export function useIdentity(): Identity {
  return useMemo(() => {
    const stored = loadStored()
    if (stored) return stored

    const fresh = generateIdentity()
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    } catch {
      /* ignore */
    }
    return fresh
  }, [])
}

/** Clears the stored identity so the next load generates a new one. */
export function resetIdentity() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}