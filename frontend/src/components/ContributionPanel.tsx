import { useEffect, useState } from 'react'
import type { Contribution } from '../hooks/useContributionTracker'

interface ContributionPanelProps {
  contributions: Contribution[]
}

const ACTIVE_WINDOW_MS = 3_000

function formatActiveTime(ms: number): string {
  if (ms < 1000) return '0s'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function ContributionPanel({ contributions }: ContributionPanelProps) {
  // Ticks every second so "active now" updates even when no map change happens.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const sorted = [...contributions].sort(
    (a, b) => b.insertedChars - a.insertedChars
  )
  const total = sorted.reduce((sum, c) => sum + c.insertedChars, 0)

  if (sorted.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-500 leading-relaxed">
        No contributions yet.
        <br />
        Start typing in the document to appear here.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Leaderboard
        </h2>
        <span className="text-[10px] text-gray-600 tabular-nums">
          {total.toLocaleString()} chars
        </span>
      </div>

      <div className="space-y-3.5">
        {sorted.map((c, i) => {
          const isActive = now - c.lastActiveAt < ACTIVE_WINDOW_MS

          return (
            <div key={c.clientId} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-gray-600 w-4 shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="relative flex w-2 h-2 shrink-0">
                    {isActive && (
                      <span
                        className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                        style={{ backgroundColor: c.color }}
                      />
                    )}
                    <span
                      className="relative inline-flex w-2 h-2 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                  </span>
                  <span className="text-gray-200 truncate">
                    {c.name}
                    {c.isMe && (
                      <span className="ml-1.5 text-[10px] text-cyan-400/80">
                        you
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 tabular-nums shrink-0">
                  {c.percentage.toFixed(0)}%
                </span>
              </div>

              <div className="h-1.5 bg-gray-800/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(c.percentage, 2)}%`,
                    backgroundColor: c.color,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-600 tabular-nums">
                <span>{c.insertedChars.toLocaleString()} chars</span>
                <span>{formatActiveTime(c.activeMs)} active</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}