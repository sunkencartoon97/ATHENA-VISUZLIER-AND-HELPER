'use client'

import { useEffect, useMemo, useState } from 'react'
import { Play, Shuffle } from 'lucide-react'
import { runWhatIf } from '@/lib/api'
import { ALGORITHM_REGISTRY, WHAT_IF_MODS } from '@/lib/algorithms'
import { DIFF_COLORS } from '@/lib/constants'
import VisualizerRouter from '@/components/visualizers/VisualizerRouter'
import StreamingExplanation from '@/components/StreamingExplanation'
import type { RunWhatIfRequest, RunWhatIfResponse, TraceStep } from '@/lib/types'

const DEFAULT_ARRAY_INPUT = '38, 27, 43, 3, 9, 82, 10'

function parseNumbers(input: string): number[] {
  return input
    .split(/[\s,]+/)
    .map(Number)
    .filter((value) => !Number.isNaN(value))
}

export default function WhatIfPage() {
  const [algo, setAlgo] = useState('quicksort')
  const [mod, setMod] = useState<Extract<RunWhatIfRequest['modification'], string>>('reverse')
  const [inputStr, setInputStr] = useState(DEFAULT_ARRAY_INPUT)
  const [compareInputStr, setCompareInputStr] = useState('10')
  const [result, setResult] = useState<RunWhatIfResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [wiStep, setWiStep] = useState(0)
  const [trigger, setTrigger] = useState(0)

  const currentAlgo = useMemo(
    () => ALGORITHM_REGISTRY.find((entry) => entry.id === algo),
    [algo],
  )
  const isNQueens = currentAlgo?.id === 'nqueens'

  useEffect(() => {
    if (isNQueens) {
      setInputStr('8')
      setCompareInputStr('10')
    } else {
      setInputStr(DEFAULT_ARRAY_INPUT)
    }
    setResult(null)
    setWiStep(0)
    setError('')
  }, [isNQueens])

  const handleRun = async () => {
    const input = parseNumbers(inputStr)
    if (!input.length) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = isNQueens
        ? await runWhatIf(algo, [input[0]], undefined, [Math.max(1, parseNumbers(compareInputStr)[0] ?? input[0])])
        : await runWhatIf(algo, input, mod)

      setResult(response)
      setWiStep(0)
      setTrigger((previous) => previous + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'What-if failed')
    } finally {
      setLoading(false)
    }
  }

  const currentTraceStep = useMemo(() => {
    if (!result || result.new_trace.length === 0) return undefined
    return result.new_trace[Math.min(wiStep, Math.max(result.new_trace.length - 1, 0))] as TraceStep
  }, [result, wiStep])

  const currentVars = currentTraceStep?.vars ?? {}
  const currentArray =
    (currentTraceStep as TraceStep | undefined)?.array_state ??
    []
  const solutionsFound = Number(currentVars.solutions_found ?? currentVars.solution_num ?? 0) || 0
  const queensPlaced = currentArray.filter((value) => value >= 0).length

  return (
    <div className="max-w-screen-lg mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-base font-medium text-tx-primary flex items-center gap-2">
          <Shuffle size={16} className="text-accent-cyan" />
          What-If Explorer
        </h1>
        <p className="text-xs text-tx-muted">
          Modify the scenario and watch how the algorithm trace changes.
        </p>
      </div>

      <div className="panel p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-tx-secondary">Algorithm</label>
          <select value={algo} onChange={(e) => setAlgo(e.target.value)} className="input text-xs">
            {ALGORITHM_REGISTRY.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>

        {!isNQueens && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-tx-secondary">Modification</label>
            <select
              value={mod}
              onChange={(e) => setMod(e.target.value as Extract<RunWhatIfRequest['modification'], string>)}
              className="input text-xs"
            >
              {WHAT_IF_MODS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5 flex-1 min-w-40">
          <label className="text-xs font-medium text-tx-secondary">
            {isNQueens ? 'Base N' : 'Base Input'}
          </label>
          <input
            value={inputStr}
            onChange={(e) => setInputStr(e.target.value)}
            className="input font-mono text-xs"
            placeholder={isNQueens ? '8' : DEFAULT_ARRAY_INPUT}
          />
        </div>

        {isNQueens && (
          <div className="flex flex-col gap-1.5 min-w-28">
            <label className="text-xs font-medium text-tx-secondary">Compare N</label>
            <input
              value={compareInputStr}
              onChange={(e) => setCompareInputStr(e.target.value)}
              className="input font-mono text-xs"
              placeholder="10"
            />
          </div>
        )}

        <button onClick={handleRun} disabled={loading} className="btn-primary">
          {loading ? (
            <>
              <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play size={13} />
              Explore
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="panel p-2.5 border-status-error/30 bg-status-error/5">
          <p className="text-xs text-status-error">{error}</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className={`grid gap-3 ${isNQueens ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
            {[
              { label: 'Base Steps', value: result.base_step_count, color: 'text-accent-blue' },
              { label: 'Modified Steps', value: result.modified_step_count, color: 'text-accent-cyan' },
              { label: 'Delta Steps', value: result.modified_step_count - result.base_step_count, color: result.modified_step_count > result.base_step_count ? 'text-status-error' : 'text-status-success' },
              ...(isNQueens ? [
                { label: 'Solutions Found', value: solutionsFound, color: 'text-status-success' },
              ] : []),
            ].map(({ label, value, color }) => (
              <div key={label} className="panel p-3">
                <p className="text-xs text-tx-muted">{label}</p>
                <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {isNQueens && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="panel p-3">
                <p className="text-xs text-tx-muted">Modified N</p>
                <p className="font-mono text-xl text-tx-primary">{parseNumbers(compareInputStr)[0] ?? parseNumbers(inputStr)[0]}</p>
              </div>
              <div className="panel p-3">
                <p className="text-xs text-tx-muted">Queens Placed</p>
                <p className="font-mono text-xl text-accent-blue">{queensPlaced}</p>
              </div>
              <div className="panel p-3">
                <p className="text-xs text-tx-muted">Current Op</p>
                <p className="font-mono text-sm text-tx-primary">{currentTraceStep?.op ?? 'idle'}</p>
              </div>
              <div className="panel p-3">
                <p className="text-xs text-tx-muted">Current Row</p>
                <p className="font-mono text-xl text-accent-cyan">
                  {currentVars.row ?? currentVars.backtrack_from_row ?? '-'}
                </p>
              </div>
            </div>
          )}

          <div className="panel p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-sm font-medium text-tx-primary">
                {isNQueens ? 'Modified N Trace' : 'Modified Trace Visualization'}
              </h2>
              <p className="font-mono text-xs text-tx-muted">
                Step {Math.min(wiStep + 1, Math.max(result.new_trace.length, 1))} / {Math.max(result.new_trace.length, 1)}
              </p>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(result.new_trace.length - 1, 0)}
              value={wiStep}
              onChange={(e) => setWiStep(Number(e.target.value))}
              className="w-full"
            />
            <div className="panel p-3 border border-border-subtle">
              <VisualizerRouter
                visualizerType={currentAlgo?.visualizer ?? 'sorting'}
                steps={result.new_trace as any}
                currentStep={Math.min(wiStep, Math.max(result.new_trace.length - 1, 0))}
                height={260}
                algoId={algo}
              />
            </div>
          </div>

          {result.diff.segments.length > 0 && (
            <div className="panel p-4 flex flex-col gap-2">
              <h2 className="text-sm font-medium text-tx-primary">Trace Diff</h2>
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {result.diff.segments.map((segment, index) => {
                  const colors = DIFF_COLORS[segment.kind]
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 px-3 py-1.5 rounded font-mono text-xs border"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      <span className="text-tx-muted w-12 shrink-0">{segment.kind}</span>
                      {segment.op_a && <span className="text-accent-blue">{segment.op_a}</span>}
                      {segment.op_b && <span className="text-accent-cyan">-&gt; {segment.op_b}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="panel p-4">
            <StreamingExplanation
              algo={algo}
              context={
                isNQueens
                  ? `Compare N=${parseNumbers(inputStr)[0]} against N=${parseNumbers(compareInputStr)[0]}`
                  : `Modification applied: ${mod}`
              }
              contextType="whatif"
              trigger={trigger}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="panel p-12 flex items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-xs text-tx-muted">Comparing traces...</p>
        </div>
      )}
    </div>
  )
}
