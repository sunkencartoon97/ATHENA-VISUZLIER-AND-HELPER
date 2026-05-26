'use client'

import { useState } from 'react'
import { Play, Bug } from 'lucide-react'
import { runBug } from '@/lib/api'
import { ALGORITHM_REGISTRY, BUG_VARIANTS } from '@/lib/algorithms'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import { BugSelector } from '@/components/bug/BugSelector'
import { PropagationChain } from '@/components/bug/PropagationChain'
import VisualizerRouter from '@/components/visualizers/VisualizerRouter'
import StreamingExplanation from '@/components/StreamingExplanation'
import type { RunBugResponse } from '@/lib/types'
import clsx from 'clsx'

const SUPPORTED = Object.keys(BUG_VARIANTS)

function traceToText(trace: Array<{ step_id?: number; op?: string; vars?: Record<string, string> }>): string {
  return trace
    .map((s, idx) => {
      const vars = s.vars
        ? Object.entries(s.vars)
            .slice(0, 4)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')
        : ''
      return `${s.step_id ?? idx}\t${s.op ?? 'op'}\t${vars}`.trim()
    })
    .join('\n')
}

export default function BugInjectionPage() {
  const [algo, setAlgo] = useState('quicksort')
  const [bugId, setBugId] = useState('fence_post')
  const [inputStr, setInputStr] = useState('38, 27, 43, 3, 9, 82, 10')
  const [result, setResult] = useState<RunBugResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [trigger, setTrigger] = useState(0)

  const handleRun = async () => {
    const input = inputStr.split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
    if (!input.length) return
    setLoading(true); setError(''); setResult(null)
    try {
      setResult(await runBug(algo, bugId, input))
      setStep(0)
      setTrigger(prev => prev + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bug injection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-screen-lg mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-base font-medium text-tx-primary flex items-center gap-2">
          <Bug size={16} className="text-status-error" />
          Bug Injection Lab
        </h1>
        <p className="text-xs text-tx-muted">
          Inject known bugs and trace how errors propagate through the algorithm
        </p>
      </div>

      <div className="panel p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-tx-secondary">Algorithm</label>
          <select
            value={algo}
            onChange={e => { setAlgo(e.target.value); setBugId(BUG_VARIANTS[e.target.value]?.[0] ?? '') }}
            className="input text-xs"
          >
            {SUPPORTED.map(id => {
              const a = ALGORITHM_REGISTRY.find(x => x.id === id)
              return <option key={id} value={id}>{a?.name ?? id}</option>
            })}
          </select>
        </div>

        <BugSelector algo={algo} value={bugId} onChange={setBugId} />

        <div className="flex flex-col gap-1.5 flex-1 min-w-40">
          <label className="text-xs font-medium text-tx-secondary">Input Array</label>
          <input value={inputStr} onChange={e => setInputStr(e.target.value)} className="input font-mono text-xs" />
        </div>

        <button onClick={handleRun} disabled={loading} className="btn-primary">
          {loading ? (
            <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Running...</>
          ) : (
            <><Play size={13} />Inject Bug</>
          )}
        </button>
      </div>

      {error && <div className="panel p-2.5 border-status-error/30 bg-status-error/5"><p className="text-xs text-status-error">{error}</p></div>}

      {result && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Algorithm', value: result.algo, color: 'text-tx-primary' },
              { label: 'Bug', value: result.bug_id.replace(/_/g, ' '), color: 'text-status-error' },
              { label: 'First Error Step', value: result.first_error_step, color: 'text-status-warning' },
              { label: 'Crashed', value: result.buggy_crashed ? 'Yes' : 'No', color: result.buggy_crashed ? 'text-status-error' : 'text-status-success' },
            ].map(({ label, value, color }) => (
              <div key={label} className="panel p-3">
                <p className="text-xs text-tx-muted">{label}</p>
                <p className={`font-mono text-sm font-semibold truncate ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <PropagationChain steps={result.propagation_chain} firstErrorStep={result.first_error_step} />

          <div className="panel p-4 flex flex-col gap-3 overflow-x-auto">
            <h2 className="text-sm font-medium text-tx-primary">Correct vs Buggy Diff</h2>
            <ReactDiffViewer
              oldValue={traceToText(result.correct_trace as any)}
              newValue={traceToText(result.buggy_trace as any)}
              splitView
              useDarkTheme
              compareMethod={DiffMethod.WORDS_WITH_SPACE}
            />
          </div>
          
          <div className="panel p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-sm font-medium text-tx-primary">Trace Visualization</h2>
              <p className="font-mono text-xs text-tx-muted">
                Step {step} / {Math.max(Math.max(result.correct_trace.length, result.buggy_trace.length) - 1, 0)}
              </p>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(Math.max(result.correct_trace.length, result.buggy_trace.length) - 1, 0)}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              className="w-full"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="panel p-3 flex flex-col gap-3 border border-border-subtle">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-tx-muted">Correct Trace</p>
                  <p className="font-mono text-xs text-tx-secondary">{Math.min(step, Math.max(result.correct_trace.length - 1, 0))}/{Math.max(result.correct_trace.length - 1, 0)}</p>
                </div>
                <VisualizerRouter
                  visualizerType={ALGORITHM_REGISTRY.find(a => a.id === algo)?.visualizer ?? 'sorting'}
                  steps={result.correct_trace as any}
                  currentStep={Math.min(step, Math.max(result.correct_trace.length - 1, 0))}
                  height={220}
                  algoId={algo}
                />
              </div>
              <div className={clsx('panel p-3 flex flex-col gap-3 border', step >= (result.first_error_step ?? Infinity) ? 'border-status-error' : 'border-border-subtle')}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-tx-muted">Buggy Trace</p>
                  <p className="font-mono text-xs text-tx-secondary">{Math.min(step, Math.max(result.buggy_trace.length - 1, 0))}/{Math.max(result.buggy_trace.length - 1, 0)}</p>
                </div>
                <VisualizerRouter
                  visualizerType={ALGORITHM_REGISTRY.find(a => a.id === algo)?.visualizer ?? 'sorting'}
                  steps={result.buggy_trace as any}
                  currentStep={Math.min(step, Math.max(result.buggy_trace.length - 1, 0))}
                  height={220}
                  algoId={algo}
                />
              </div>
            </div>
          </div>

          <div className="panel p-4">
            <StreamingExplanation
              algo={algo}
              context={`Bug injected: ${bugId}`}
              contextType="bug"
              trigger={trigger}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="panel p-12 flex items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-xs text-tx-muted">Injecting bug and tracing...</p>
        </div>
      )}
    </div>
  )
}
