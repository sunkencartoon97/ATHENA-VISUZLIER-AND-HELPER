'use client'

import { useMemo, useState } from 'react'
import { runAlgorithm } from '@/lib/api'
import type { RunAlgorithmResponse } from '@/lib/types'
import VisualizerRouter from '@/components/visualizers/VisualizerRouter'

export default function BinarySearchInteractivePage() {
  const [max, setMax] = useState(100)
  const [lower, setLower] = useState(0)
  const [upper, setUpper] = useState(100)
  const [isStarted, setIsStarted] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [resultTrace, setResultTrace] = useState<RunAlgorithmResponse | null>(null)
  const [error, setError] = useState('')

  const mid = useMemo(() => Math.floor((upper + lower) / 2), [upper, lower])

  const resetGame = () => {
    setLower(0)
    setUpper(max)
    setIsStarted(false)
    setIsDone(false)
    setResultTrace(null)
    setError('')
  }

  const finishAndRunTrace = async () => {
    try {
      const input = Array.from({ length: max }, (_, i) => i + 1)
      const res = await runAlgorithm('binarysearch', input, 'trace')
      setResultTrace(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run trace')
    }
  }

  const handleStart = () => {
    const safeMax = Number.isFinite(max) && max > 0 ? Math.floor(max) : 100
    setMax(safeMax)
    setLower(0)
    setUpper(safeMax)
    setIsStarted(true)
    setIsDone(false)
    setResultTrace(null)
    setError('')
  }

  const handleYes = async () => {
    const nextLower = Math.floor((upper + lower) / 2) + 1
    setLower(nextLower)
    if (upper === nextLower) {
      setIsDone(true)
      await finishAndRunTrace()
    }
  }

  const handleNo = async () => {
    const nextUpper = Math.floor((upper + lower) / 2)
    setUpper(nextUpper)
    if (nextUpper === lower) {
      setIsDone(true)
      await finishAndRunTrace()
    }
  }

  const lowerPct = Math.max(0, Math.min(100, (lower / Math.max(max, 1)) * 100))
  const upperPct = Math.max(0, Math.min(100, (upper / Math.max(max, 1)) * 100))

  return (
    <div className="max-w-screen-lg mx-auto w-full flex flex-col gap-4">
      <div>
        <h1 className="text-base font-medium text-tx-primary">Binary Search Interactive Mode</h1>
        <p className="text-xs text-tx-muted">Answer yes/no and let ATHENA narrow the range.</p>
      </div>

      <div className="panel p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-tx-secondary">Upper Number</label>
          <input
            type="number"
            min={1}
            value={max}
            onChange={(e) => setMax(Number(e.target.value || 100))}
            className="input w-32 font-mono text-xs"
          />
        </div>
        <button onClick={handleStart} className="btn-primary">Start</button>
        <button onClick={resetGame} className="btn-secondary">Reset</button>
      </div>

      {isStarted && (
        <div className="panel p-4 flex flex-col gap-3">
          <p className="text-sm text-tx-primary">
            Is your number greater than <span className="font-mono text-accent-cyan">{mid}</span>?
          </p>

          <div className="relative h-4 rounded bg-bg-overlay border border-border overflow-hidden">
            <div
              className="absolute h-full bg-accent-cyan/35"
              style={{ left: `${lowerPct}%`, width: `${Math.max(1, upperPct - lowerPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-tx-muted">
            <span>{lower}</span>
            <span>{upper}</span>
          </div>

          {!isDone && (
            <div className="flex gap-2">
              <button onClick={handleYes} className="btn-primary">Yes</button>
              <button onClick={handleNo} className="btn-primary">No</button>
            </div>
          )}

          {isDone && (
            <p className="text-sm text-status-success">Done. Your number is {upper}.</p>
          )}
        </div>
      )}

      {error && (
        <div className="panel p-3 border-status-error/30 bg-status-error/5">
          <p className="text-xs text-status-error">{error}</p>
        </div>
      )}

      {resultTrace && (
        <div className="panel p-4">
          <p className="text-xs text-tx-muted mb-2">Engine trace comparison</p>
          <VisualizerRouter
            visualizerType="sorting"
            steps={resultTrace.steps as any}
            currentStep={Math.max(0, resultTrace.steps.length - 1)}
            algoId="binarysearch"
            height={260}
          />
        </div>
      )}
    </div>
  )
}
