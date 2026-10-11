import { useCallback, useEffect, useState } from 'react'
import * as Y from 'yjs'

export interface Contribution {
  clientId: string
  name: string
  color: string
  insertedChars: number
  activeMs: number
  percentage: number
  isMe: boolean
  lastActiveAt: number
}

interface ContributionEntry {
  name: string
  color: string
  insertedChars: number
  activeMs: number
  lastActiveAt: number
}

const ACTIVE_SESSION_THRESHOLD_MS = 30_000

export function useContributionTracker(
  ydoc: Y.Doc,
  myUserId: string,
  myName: string,
  myColor: string
) {
  const [contributions, setContributions] = useState<Contribution[]>([])

  const map = ydoc.getMap<ContributionEntry>('contributions')

  useEffect(() => {
    const update = () => {
      const list: Contribution[] = []
      let totalChars = 0

      map.forEach((value, key) => {
        totalChars += value.insertedChars
        list.push({
          clientId: key,
          name: value.name,
          color: value.color,
          insertedChars: value.insertedChars,
          activeMs: value.activeMs,
          percentage: 0,
          isMe: key === myUserId,
          lastActiveAt: value.lastActiveAt,
        })
      })

      list.forEach((c) => {
        c.percentage =
          totalChars > 0 ? (c.insertedChars / totalChars) * 100 : 0
      })

      list.sort((a, b) => b.insertedChars - a.insertedChars)
      setContributions(list)
    }

    map.observe(update)
    update()

    return () => map.unobserve(update)
  }, [map, myUserId])

  const recordTyping = useCallback(
    (chars: number) => {
      if (chars <= 0) return
      const now = Date.now()

      ydoc.transact(() => {
        const existing: ContributionEntry = map.get(myUserId) || {
          name: myName,
          color: myColor,
          insertedChars: 0,
          activeMs: 0,
          lastActiveAt: 0,
        }

        const gap = existing.lastActiveAt ? now - existing.lastActiveAt : 0
        const additionalMs =
          gap > 0 && gap < ACTIVE_SESSION_THRESHOLD_MS ? gap : 0

        map.set(myUserId, {
          ...existing,
          name: myName,
          color: myColor,
          insertedChars: existing.insertedChars + chars,
          activeMs: existing.activeMs + additionalMs,
          lastActiveAt: now,
        })
      })
    },
    [ydoc, map, myUserId, myName, myColor]
  )

  return { contributions, recordTyping }
}