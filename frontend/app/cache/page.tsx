'use client'

import { useState } from 'react'
import { simulateCache, runAlgorithm } from '@/lib/api'
import { ALGORITHM_REGISTRY } from '@/lib/algorithms'
import { CacheGrid } from '@/components/analysis/CacheGrid'
import type { CacheEvent, CacheResponse, MemAccess } from '@/lib/types'
import clsx from 'clsx'

// All algos from the registry — backend now supports all 44
const SUPPORTED = ALGORITHM_REGISTRY


export default function CachePage() {
  const [selectedAlgo, setSelectedAlgo] = useState('quicksort')
  const [inputStr, setInputStr] = useState('38, 27, 43, 3, 9, 82, 10')
  const [result, setResult] = useState<CacheResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hoveredEvent, setHoveredEvent] = useState<CacheEvent | null>(null)

  const handleSimulate = async () => {
    const arr = inputStr.split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
    if (arr.length === 0) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Run in 'cache' mode to get mem fields on each TraceStep
      const trace = await runAlgorithm(selectedAlgo, arr, 'cache')

      // Bug B Fix: extract proper MemAccess objects from steps, not raw numbers
      const memAccesses: MemAccess[] = trace.steps
        .filter(s => s.mem != null && s.mem !== undefined)
        .map(s => s.mem!)

      if (memAccesses.length === 0) {
        throw new Error('No memory-access data in trace. This algorithm may not emit mem fields.')
      }

      const cacheResult = await simulateCache({ memory_accesses: memAccesses })
      setResult(cacheResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const hitEvents  = result?.cache_events.filter(e => e.hit)  ?? []
  const missEvents = result?.cache_events.filter(e => !e.hit) ?? []

  return (
    <div className="max-w-screen-xl mx-auto w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-medium text-tx-primary">Cache Deep View</h1>
        <p className="text-xs text-tx-muted">
          Simulate and analyze L1 cache behavior driven by actual algorithm memory-access patterns
        </p>
      </div>

      {/* Controls */}
      <div className="panel p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-tx-secondary">Algorithm</label>
          <select
            value={selectedAlgo}
            onChange={e => setSelectedAlgo(e.target.value)}
            className="input text-xs"
          >
            {SUPPORTED.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-40">
          <label className="text-xs font-medium text-tx-secondary">Input Array</label>
          <input
            value={inputStr}
            onChange={e => setInputStr(e.target.value)}
            className="input font-mono text-xs"
            placeholder="e.g. 38, 27, 43, 3, 9"
          />
        </div>
        <button onClick={handleSimulate} disabled={loading} className="btn-primary">
          {loading ? (
            <>
              <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              Simulating...
            </>
          ) : 'Simulate Cache'}
        </button>
      </div>

      {error && (
        <div className="panel p-2.5 border-status-error/30 bg-status-error/5">
          <p className="text-xs text-status-error">{error}</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Hit Rate',      value: `${(result.hit_rate * 100).toFixed(1)}%`,           color: 'text-status-success' },
              { label: 'Miss Rate',     value: `${((1 - result.hit_rate) * 100).toFixed(1)}%`,     color: 'text-status-error' },
              { label: 'Total Events',  value: result.cache_events.length,                          color: 'text-tx-primary' },
              { label: 'Hits / Misses', value: `${hitEvents.length} / ${missEvents.length}`,        color: 'text-accent-blue' },
            ].map(({ label, value, color }) => (
              <div key={label} className="panel p-3 flex flex-col gap-1">
                <span className="text-xs text-tx-muted">{label}</span>
                <span className={`font-mono text-xl font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Hit/miss bar */}
          <div className="panel p-4 flex flex-col gap-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-status-success">HIT {(result.hit_rate * 100).toFixed(1)}%</span>
              <span className="text-status-error">MISS {((1 - result.hit_rate) * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-bg-overlay rounded overflow-hidden flex">
              <div
                className="h-full bg-status-success/50 transition-all duration-500"
                style={{ width: `${result.hit_rate * 100}%` }}
              />
              <div className="h-full bg-status-error/40 flex-1" />
            </div>
          </div>

          {/* CacheGrid — visual 8-line display */}
          <CacheGrid events={result.cache_events} activeLine={hoveredEvent?.cache_line ?? null} />

          {/* Access timeline */}
          <div className="panel p-4 flex flex-col gap-3">
            <h2 className="text-sm font-medium text-tx-primary">Access Timeline</h2>
            <p className="text-xs text-tx-muted">Green = cache hit · Red = cache miss</p>
            <div className="flex flex-wrap gap-0.5">
              {result.cache_events.map((evt, i) => (
                <div
                  key={i}
                  title={`step ${evt.step_id} | line:${evt.cache_line} | ${evt.hit ? 'HIT' : 'MISS'}`}
                  onMouseEnter={() => setHoveredEvent(evt)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  className={clsx(
                    'w-4 h-4 rounded-[2px] cursor-default transition-all duration-150',
                    hoveredEvent === evt ? 'scale-150 z-10 opacity-100 ring-2 ring-white/30' : 'hover:opacity-100',
                    evt.hit
                      ? 'bg-status-success/60 hover:bg-status-success'
                      : 'bg-status-error/60 hover:bg-status-error'
                  )}
                  style={{ opacity: hoveredEvent === evt ? 1 : 0.7 + (i % 3) * 0.1 }}
                />
              ))}
            </div>
          </div>

          {/* Cache-lines table (if backend returns it) */}
          {result.cache_lines && result.cache_lines.length > 0 && (
            <div className="panel p-4 flex flex-col gap-3">
              <h2 className="text-sm font-medium text-tx-primary">Cache Line State</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left py-1.5 pr-4 text-tx-muted font-medium">Line</th>
                      {result.cache_lines[0]?.map((_, i) => (
                        <th key={i} className="text-center py-1.5 px-2 text-tx-muted font-medium w-12">[{i}]</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.cache_lines.map((line, li) => (
                      <tr key={li} className="border-b border-border-subtle/50">
                        <td className="py-1.5 pr-4 text-tx-secondary">L{li}</td>
                        {line.map((val, i) => (
                          <td key={i} className="text-center py-1.5 px-2">
                            <span className={val === 0 ? 'text-tx-muted' : 'text-accent-cyan'}>
                              {val === 0 ? '—' : val}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-step breakdown */}
          <div className="panel p-4 flex flex-col gap-3">
            <h2 className="text-sm font-medium text-tx-primary">Per-Step Breakdown</h2>
            <div className="flex flex-col gap-0.5 max-h-64 overflow-auto">
              {result.cache_events.map((evt, i) => (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredEvent(evt)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  className={clsx(
                    'flex items-center gap-3 px-2 py-1 rounded font-mono text-xs cursor-default transition-colors',
                    hoveredEvent === evt ? 'bg-bg-elevated ring-1 ring-border' : '',
                    evt.hit ? 'hover:bg-status-success/5' : 'hover:bg-status-error/5'
                  )}
                >
                  <span className="text-tx-muted w-14 shrink-0">step {evt.step_id}</span>
                  <span className="text-tx-muted w-16 shrink-0">line:{evt.cache_line}</span>
                  <span className={`font-semibold ${evt.hit ? 'text-status-success' : 'text-status-error'}`}>
                    {evt.hit ? 'HIT' : 'MISS'}
                  </span>
                  {evt.evicted !== null && (
                    <span className="text-tx-muted">evicted:{evt.evicted}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="panel p-16 flex flex-col items-center justify-center gap-3 text-tx-muted grid-bg">
          <div className="w-12 h-12 rounded-lg border border-border flex items-center justify-center">
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-[1px]"
                  style={{ backgroundColor: i % 3 === 0 ? '#10b981' : '#1e2236' }}
                />
              ))}
            </div>
          </div>
          <p className="text-sm">Select an algorithm and simulate cache behavior</p>
        </div>
      )}

      {loading && (
        <div className="panel p-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-xs text-tx-muted">Running algorithm and simulating cache...</p>
        </div>
      )}
    </div>
  )
}
