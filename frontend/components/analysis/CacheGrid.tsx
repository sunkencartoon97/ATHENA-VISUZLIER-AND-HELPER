'use client'

import { useMemo } from 'react'
import type { CacheEvent } from '@/lib/types'

interface CacheGridProps {
  events: CacheEvent[]
  activeLine?: number | null
}

export function CacheGrid({ events, activeLine }: CacheGridProps) {
  const { lines, hitRate, hits, misses } = useMemo(() => {
    const lineState: Record<number, { hits: number; misses: number }> = {}
    let h = 0
    let m = 0

    for (const evt of events) {
      if (evt.hit) h++
      else m++
      if (!lineState[evt.cache_line]) {
        lineState[evt.cache_line] = { hits: 0, misses: 0 }
      }
      if (evt.hit) lineState[evt.cache_line].hits++
      else lineState[evt.cache_line].misses++
    }

    const arr = Array.from({ length: 8 }, (_, i) => ({
      line: i,
      hits: lineState[i]?.hits ?? 0,
      misses: lineState[i]?.misses ?? 0,
      active: !!lineState[i],
    }))

    return { lines: arr, hitRate: h / (h + m || 1), hits: h, misses: m }
  }, [events])

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-tx-primary">Cache Lines (8 × 64B)</h3>
        <span className="font-mono text-xs text-tx-muted">
          {hits}H / {misses}M · {(hitRate * 100).toFixed(1)}%
        </span>
      </div>

      {/* Hit rate bar */}
      <div className="h-1.5 bg-bg-overlay rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-status-success transition-all duration-500 rounded-full"
          style={{ width: `${hitRate * 100}%` }}
        />
      </div>

      {/* 8-line grid */}
      <div className="grid grid-cols-8 gap-1">
        {lines.map((line) => (
          <div
            key={line.line}
            className={`h-12 rounded flex flex-col items-center justify-center text-xs transition-colors ${
              activeLine === line.line 
                ? 'bg-accent-blue/20 border-2 border-accent-blue shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                : !line.active
                ? 'bg-bg-elevated border border-border-subtle'
                : line.hits >= line.misses
                ? 'bg-status-success/10 border border-status-success/40'
                : 'bg-status-error/10 border border-status-error/40'
            }`}
          >
            <span className="text-tx-muted font-mono text-[9px]">L{line.line}</span>
            {line.active && (
              <span className={`text-[9px] font-semibold font-mono ${
                line.hits >= line.misses ? 'text-status-success' : 'text-status-error'
              }`}>
                {line.hits}H/{line.misses}M
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
