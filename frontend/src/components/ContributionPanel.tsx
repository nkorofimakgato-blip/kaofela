import type { Contribution } from '../hooks/useContributionTracker'

interface ContributionPanelProps {
  contributions: Contribution[]
}

export default function ContributionPanel({
  contributions,
}: ContributionPanelProps) {
  if (contributions.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Start typing to see contributions.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
          Contribution
        </h3>
        <p className="text-[10px] text-gray-600 mt-1">
          Based on characters typed
        </p>
      </div>

      {contributions.map((c) => (
        <div key={c.clientId} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: c.color }}
              />
              <span className="text-gray-300 truncate">
                {c.name}
                {c.isMe && <span className="text-gray-500"> (you)</span>}
              </span>
            </div>
            <span className="font-bold text-white flex-shrink-0 ml-2">
              {Math.round(c.percentage)}%
            </span>
          </div>

          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${c.percentage}%`, background: c.color }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-gray-500">
            <span>{c.insertedChars.toLocaleString()} chars</span>
            <span>{formatTime(c.activeMs)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min === 0) return `${sec}s`
  return `${min}m ${sec}s`
}