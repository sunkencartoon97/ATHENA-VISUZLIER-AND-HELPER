'use client'

import { Fragment, useMemo, useState } from 'react'
import { Cpu } from 'lucide-react'
import { BenchmarkChart } from '@/components/analysis/BenchmarkChart'
import { ComplexityBadge } from '@/components/analysis/ComplexityBadge'
import { LieDetectorBadge } from '@/components/analysis/LieDetectorBadge'
import { ALGORITHM_REGISTRY } from '@/lib/algorithms'
import { COMPLEXITY_REFERENCE } from '@/lib/complexityConstants'
import { benchmark } from '@/lib/api'
import { normalizeComplexityLabel } from '@/lib/complexityUtils'
import type { BenchmarkResponse } from '@/lib/types'

const ALGO_OPTIONS = ALGORITHM_REGISTRY.map((algo) => ({
  id: algo.id,
  name: algo.name,
  complexity: algo.timeComplexity,
}))

export default function ComplexityPage() {
  const [selectedAlgo, setSelectedAlgo] = useState('quicksort')
  const [sizes, setSizes] = useState('10, 25, 50, 100, 200, 500, 1000')
  const [result, setResult] = useState<BenchmarkResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentAlgo = useMemo(
    () => ALGORITHM_REGISTRY.find((algo) => algo.id === selectedAlgo),
    [selectedAlgo],
  )

  const parsedSizes = useMemo(
    () =>
      sizes
        .split(/[\s,]+/)
        .map(Number)
        .filter((value) => !Number.isNaN(value) && value > 0)
        .sort((a, b) => a - b),
    [sizes],
  )

  const handleAnalyze = async () => {
    if (parsedSizes.length === 0 || !currentAlgo) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await benchmark(selectedAlgo, currentAlgo.timeComplexity, parsedSizes)
      setResult(response)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-screen-lg mx-auto w-full py-2 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-medium text-tx-primary">Complexity Explorer</h1>
        <p className="text-xs text-tx-muted">
          Benchmark real runs, overlay the theoretical curve, and verify the claimed Big-O.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-4">
          <div className="panel p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-tx-secondary">Algorithm</label>
                <select
                  value={selectedAlgo}
                  onChange={(e) => setSelectedAlgo(e.target.value)}
                  className="input text-xs"
                >
                  {ALGO_OPTIONS.map((algo) => (
                    <option key={algo.id} value={algo.id}>
                      {algo.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-tx-secondary">Input sizes (n values)</label>
                <input
                  value={sizes}
                  onChange={(e) => setSizes(e.target.value)}
                  className="input font-mono text-xs"
                  placeholder="10, 50, 100, 500..."
                />
              </div>
            </div>

            <button onClick={handleAnalyze} disabled={loading} className="btn-primary self-start">
              {loading ? (
                <>
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Cpu size={13} />
                  Analyze Complexity
                </>
              )}
            </button>

            {error && (
              <div className="panel p-2.5 border-red-500/20 bg-red-500/5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>

          {result ? (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="panel p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-tx-muted">Measured complexity</p>
                  <ComplexityBadge
                    label={result.measured_complexity}
                    rSquared={result.lie_detector?.r_squared}
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs text-tx-muted">Claimed complexity</p>
                  <p className="font-mono text-sm text-tx-primary">
                    {normalizeComplexityLabel(currentAlgo?.timeComplexity)}
                  </p>
                </div>
              </div>

              <BenchmarkChart
                dataPoints={result.data_points}
                claimedComplexity={currentAlgo?.timeComplexity}
                measuredComplexity={result.measured_complexity}
                title="Measured vs Theoretical"
              />

              {result.lie_detector && (
                <LieDetectorBadge result={result.lie_detector} />
              )}

              <div className="panel p-4 flex flex-col gap-3">
                <h3 className="text-xs font-medium text-tx-secondary uppercase tracking-wider">
                  Measured Data Points
                </h3>
                <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-0.5">
                  <div className="font-mono text-[10px] text-tx-muted pb-1 border-b border-border-subtle">n</div>
                  <div className="font-mono text-[10px] text-tx-muted pb-1 border-b border-border-subtle">time (ms)</div>
                  {result.data_points.map((point) => (
                    <Fragment key={point.n}>
                      <div className="font-mono text-xs text-tx-secondary py-0.5">{point.n}</div>
                      <div className="font-mono text-xs text-accent-cyan py-0.5">{point.time_ms.toFixed(3)}</div>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            !loading && (
              <div className="panel p-8 flex flex-col items-center justify-center gap-3 text-tx-muted grid-bg">
                <Cpu size={24} className="opacity-30" />
                <p className="text-xs">Select an algorithm and click Analyze</p>
              </div>
            )
          )}

          {loading && (
            <div className="panel p-8 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
              <p className="text-xs text-tx-muted">Running benchmarks across the selected input sizes...</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {currentAlgo && (
            <div className="panel p-4 flex flex-col gap-3">
              <h2 className="text-sm font-medium text-tx-primary">{currentAlgo.name}</h2>
              <p className="text-xs text-tx-muted leading-relaxed">{currentAlgo.description}</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-tx-muted">Theoretical time:</span>
                  <span className="badge-cyan font-mono">
                    {normalizeComplexityLabel(currentAlgo.timeComplexity)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-tx-muted">Space:</span>
                  <span className="badge-gray font-mono">{currentAlgo.spaceComplexity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-tx-muted">Category:</span>
                  <span className="badge-blue">{currentAlgo.category}</span>
                </div>
              </div>
            </div>
          )}

          <div className="panel p-4 flex flex-col gap-3">
            <h3 className="text-xs font-medium text-tx-secondary uppercase tracking-wider">
              Complexity Reference
            </h3>
            <div className="flex flex-col gap-2">
              {COMPLEXITY_REFERENCE.map(({ name, color, description }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1.5 rounded" style={{ backgroundColor: color }} />
                    <span className="font-mono text-xs" style={{ color }}>
                      {name}
                    </span>
                  </div>
                  <span className="text-xs text-tx-muted">{description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
