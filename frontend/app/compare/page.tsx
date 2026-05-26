'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { GitCompare, Play, Bug, Shuffle } from 'lucide-react'
import { runDiff, runBug, runWhatIf } from '@/lib/api'
import { ALGORITHM_REGISTRY, ALGO_MAP, BUG_VARIANTS, WHAT_IF_MODS } from '@/lib/algorithms'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import { BugSelector } from '@/components/bug/BugSelector'
import { PropagationChain } from '@/components/bug/PropagationChain'
import VisualizerRouter from '@/components/visualizers/VisualizerRouter'
import type {
  RunDiffResponse,
  RunBugResponse,
  RunWhatIfRequest,
  RunWhatIfResponse,
  DiffSegment,
} from '@/lib/types'
import { DIFF_COLORS } from '@/lib/constants'
import StreamingExplanation from '@/components/StreamingExplanation'

type Tab = 'diff' | 'bug' | 'whatif'

const SUPPORTED_ALGOS = ALGORITHM_REGISTRY

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

export default function ComparePage() {
  const [tab, setTab] = useState<Tab>('diff')

  // Diff state
  const [algoA, setAlgoA] = useState('quicksort')
  const [algoB, setAlgoB] = useState('mergesort')
  const [inputStr, setInputStr] = useState('38, 27, 43, 3, 9, 82, 10')
  const [diffResult, setDiffResult] = useState<RunDiffResponse | null>(null)
  const [diffStepA, setDiffStepA] = useState(0)
  const [diffStepB, setDiffStepB] = useState(0)
  const [syncSteps, setSyncSteps] = useState(true)
  const [diffTrigger, setDiffTrigger] = useState(0)

  // Bug state
  const [bugAlgo, setBugAlgo] = useState('quicksort')
  const [bugId, setBugId] = useState('fence_post')
  const [bugResult, setBugResult] = useState<RunBugResponse | null>(null)
  const [bugStep, setBugStep] = useState(0)
  const [bugTrigger, setBugTrigger] = useState(0)

  // What-if state
  const [wiAlgo, setWiAlgo] = useState('quicksort')
  const [wiMod, setWiMod] = useState<Extract<RunWhatIfRequest['modification'], string>>('reverse')
  const [wiResult, setWiResult] = useState<RunWhatIfResponse | null>(null)
  const [wiStep, setWiStep] = useState(0)
  const [wiTrigger, setWiTrigger] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const parseInput = () =>
    inputStr.split(/[\s,]+/).map(Number).filter(n => !isNaN(n))

  // ─── Diff ─────────────────────────────────────────────────────────────────────
  const handleDiff = async () => {
    const input = parseInput()
    if (!input.length) return
    setLoading(true); setError(''); setDiffResult(null)
    try {
      const res = await runDiff(algoA, algoB, input)
      // BUG A FIX: backend returns trace_a, trace_b at top level (not nested in diff)
      setDiffResult(res)
      setDiffStepA(0)
      setDiffStepB(0)
      setDiffTrigger(prev => prev + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Diff failed')
    } finally {
      setLoading(false)
    }
  }

  // ─── Bug Injection ────────────────────────────────────────────────────────────
  const handleBug = async () => {
    const input = parseInput()
    if (!input.length) return
    setLoading(true); setError(''); setBugResult(null)
    try {
      const res = await runBug(bugAlgo, bugId, input)
      setBugResult(res)
      setBugStep(0)
      setBugTrigger(prev => prev + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bug injection failed')
    } finally {
      setLoading(false)
    }
  }

  // ─── What-If ──────────────────────────────────────────────────────────────────
  const handleWhatIf = async () => {
    const input = parseInput()
    if (!input.length) return
    setLoading(true); setError(''); setWiResult(null)
    try {
      const res = await runWhatIf(wiAlgo, input, wiMod)
      setWiResult(res)
      setWiStep(0)
      setWiTrigger(prev => prev + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'What-if failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRun = () => {
    if (tab === 'diff') handleDiff()
    else if (tab === 'bug') handleBug()
    else handleWhatIf()
  }

  const isDiverging = (which: 'a' | 'b', step: number, segs: DiffSegment[]) => {
    return segs.some((seg) => {
      const kind = seg.kind
      if (kind === 'equal') return false

      if (which === 'a') {
        if (kind === 'insert') return false
        if (seg.a_start == null || seg.a_end == null) return false
        return step >= seg.a_start && step <= seg.a_end
      }

      if (kind === 'delete') return false
      if (seg.b_start == null || seg.b_end == null) return false
      return step >= seg.b_start && step <= seg.b_end
    })
  }

  const mapLogicalStep = (sourceStep: number, from: 'a' | 'b', segs: DiffSegment[]): number => {
    for (const seg of segs) {
      if (from === 'a') {
        if (seg.kind === 'insert') continue
        if (seg.a_start != null && seg.a_end != null && sourceStep >= seg.a_start && sourceStep <= seg.a_end) {
          if (seg.kind === 'delete') return seg.b_start ?? 0
          return (seg.b_start ?? 0) + (sourceStep - seg.a_start)
        }
      } else {
        if (seg.kind === 'delete') continue
        if (seg.b_start != null && seg.b_end != null && sourceStep >= seg.b_start && sourceStep <= seg.b_end) {
          if (seg.kind === 'insert') return seg.a_start ?? 0
          return (seg.a_start ?? 0) + (sourceStep - seg.b_start)
        }
      }
    }
    return 0
  }

  const handleStepAChange = (val: number) => {
    setDiffStepA(val)
    if (syncSteps && diffResult) {
      setDiffStepB(mapLogicalStep(val, 'a', diffResult.diff.segments))
    }
  }

  const handleStepBChange = (val: number) => {
    setDiffStepB(val)
    if (syncSteps && diffResult) {
      setDiffStepA(mapLogicalStep(val, 'b', diffResult.diff.segments))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-base font-medium text-tx-primary">Algorithm Comparison Lab</h1>
        <p className="text-xs text-tx-muted">
          Compare traces · inject bugs · explore what-if scenarios
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle flex gap-0">
        {([
          { id: 'diff', label: 'DNA Diff', icon: GitCompare },
          { id: 'bug', label: 'Bug Injection', icon: Bug },
          { id: 'whatif', label: 'What-If', icon: Shuffle },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx('tab-button flex items-center gap-1.5', tab === id && 'active')}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="panel p-4 flex flex-wrap gap-3 items-end">
        {/* Input array (shared) */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-40">
          <label className="text-xs font-medium text-tx-secondary">Input Array</label>
          <input
            value={inputStr}
            onChange={e => setInputStr(e.target.value)}
            className="input font-mono text-xs"
            placeholder="e.g. 38, 27, 43, 3, 9"
          />
        </div>

        {/* Diff controls */}
        {tab === 'diff' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-tx-secondary">Algorithm A</label>
              <select value={algoA} onChange={e => setAlgoA(e.target.value)} className="input text-xs">
                {SUPPORTED_ALGOS.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-tx-secondary">Algorithm B</label>
              <select value={algoB} onChange={e => setAlgoB(e.target.value)} className="input text-xs">
                {SUPPORTED_ALGOS.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Bug controls */}
        {tab === 'bug' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-tx-secondary">Algorithm</label>
              <select
                value={bugAlgo}
                onChange={e => { setBugAlgo(e.target.value); setBugId(BUG_VARIANTS[e.target.value]?.[0] ?? '') }}
                className="input text-xs"
              >
                {Object.keys(BUG_VARIANTS).map(id => {
                  const a = ALGORITHM_REGISTRY.find(x => x.id === id)
                  return <option key={id} value={id}>{a?.name ?? id}</option>
                })}
              </select>
            </div>
            <BugSelector algo={bugAlgo} value={bugId} onChange={setBugId} />
          </>
        )}

        {/* What-If controls */}
        {tab === 'whatif' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-tx-secondary">Algorithm</label>
              <select value={wiAlgo} onChange={e => setWiAlgo(e.target.value)} className="input text-xs">
                {SUPPORTED_ALGOS.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-tx-secondary">Modification</label>
              <select
                value={wiMod}
                onChange={e => setWiMod(e.target.value as Extract<RunWhatIfRequest['modification'], string>)}
                className="input text-xs"
              >
                {WHAT_IF_MODS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </>
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
              Run
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="panel p-2.5 border-status-error/30 bg-status-error/5">
          <p className="text-xs text-status-error">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="animate-fade-in">
        {/* ── DNA Diff Results ── */}
        {tab === 'diff' && diffResult && (
          <div className="flex flex-col gap-4">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Steps A', value: diffResult.trace_a.length, color: 'text-accent-blue' },
                { label: 'Steps B', value: diffResult.trace_b.length, color: 'text-accent-cyan' },
                { label: 'First Divergence', value: diffResult.diff.first_divergence_a ?? '—', color: 'text-status-warning' },
                { label: 'Segments', value: diffResult.diff.segments.length, color: 'text-tx-primary' },
              ].map(({ label, value, color }) => (
                <div key={label} className="panel p-3">
                  <p className="text-xs text-tx-muted">{label}</p>
                  <p className={`font-mono text-xl font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Diff segments */}
            <div className="panel p-4 flex flex-col gap-3">
              <h2 className="text-sm font-medium text-tx-primary">Trace Diff</h2>
              <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                {diffResult.diff.segments.map((seg, i) => {
                  const colors = DIFF_COLORS[seg.kind]
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-1.5 rounded font-mono text-xs border"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      <span className="text-tx-muted w-12 shrink-0">{seg.kind}</span>
                      {seg.op_a && <span className="text-accent-blue">{seg.op_a}</span>}
                      {seg.op_b && seg.op_b !== seg.op_a && (
                        <span className="text-accent-cyan">→ {seg.op_b}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="panel p-4 flex flex-col gap-3 overflow-x-auto">
              <h2 className="text-sm font-medium text-tx-primary">Side-by-Side Trace Diff</h2>
              <ReactDiffViewer
                oldValue={traceToText(diffResult.trace_a as any)}
                newValue={traceToText(diffResult.trace_b as any)}
                splitView
                useDarkTheme
                compareMethod={DiffMethod.WORDS_WITH_SPACE}
              />
            </div>

            {/* Dual visualizer */}
            <div className="panel p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-sm font-medium text-tx-primary">Dual Visualizer</h2>
                <label className="flex items-center gap-2 text-xs text-tx-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncSteps}
                    onChange={(e) => setSyncSteps(e.target.checked)}
                    className="rounded border-border bg-bg-input"
                  />
                  Lock Logical Steps
                </label>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={clsx('panel p-3 flex flex-col gap-3 border', isDiverging('a', diffStepA, diffResult.diff.segments) ? 'border-status-error' : 'border-border-subtle')}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-tx-muted">{ALGO_MAP[algoA]?.name ?? algoA}</p>
                    <p className="font-mono text-xs text-tx-secondary">{diffStepA}/{Math.max(diffResult.trace_a.length - 1, 0)}</p>
                  </div>
                  <VisualizerRouter
                    visualizerType={ALGO_MAP[algoA]?.visualizer ?? 'sorting'}
                    steps={diffResult.trace_a as any}
                    currentStep={diffStepA}
                    height={220}
                    algoId={algoA}
                  />
                  <input
                    type="range"
                    min={0}
                    max={Math.max(diffResult.trace_a.length - 1, 0)}
                    value={diffStepA}
                    onChange={(e) => handleStepAChange(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className={clsx('panel p-3 flex flex-col gap-3 border', isDiverging('b', diffStepB, diffResult.diff.segments) ? 'border-status-error' : 'border-border-subtle')}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-tx-muted">{ALGO_MAP[algoB]?.name ?? algoB}</p>
                    <p className="font-mono text-xs text-tx-secondary">{diffStepB}/{Math.max(diffResult.trace_b.length - 1, 0)}</p>
                  </div>
                  <VisualizerRouter
                    visualizerType={ALGO_MAP[algoB]?.visualizer ?? 'sorting'}
                    steps={diffResult.trace_b as any}
                    currentStep={diffStepB}
                    height={220}
                    algoId={algoB}
                  />
                  <input
                    type="range"
                    min={0}
                    max={Math.max(diffResult.trace_b.length - 1, 0)}
                    value={diffStepB}
                    onChange={(e) => handleStepBChange(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* AI Explanation */}
            <div className="panel p-4">
              <StreamingExplanation
                algo={algoA}
                context={`Diff ${algoA} vs ${algoB}, ${diffResult.diff.segments.length} segments`}
                contextType="general"
                trigger={diffTrigger}
              />
            </div>
          </div>
        )}

        {/* ── Bug Injection Results ── */}
        {tab === 'bug' && bugResult && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Correct Steps', value: bugResult.correct_trace.length, color: 'text-status-success' },
                { label: 'Buggy Steps', value: bugResult.buggy_trace.length, color: 'text-status-error' },
                { label: 'First Error', value: bugResult.first_error_step, color: 'text-status-warning' },
                { label: 'Crashed', value: bugResult.buggy_crashed ? 'Yes' : 'No', color: bugResult.buggy_crashed ? 'text-status-error' : 'text-status-success' },
              ].map(({ label, value, color }) => (
                <div key={label} className="panel p-3">
                  <p className="text-xs text-tx-muted">{label}</p>
                  <p className={`font-mono text-xl font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <PropagationChain
              steps={bugResult.propagation_chain}
              firstErrorStep={bugResult.first_error_step}
            />

            <div className="panel p-4 flex flex-col gap-3 overflow-x-auto">
              <h2 className="text-sm font-medium text-tx-primary">Correct vs Buggy Diff</h2>
              <ReactDiffViewer
                oldValue={traceToText(bugResult.correct_trace as any)}
                newValue={traceToText(bugResult.buggy_trace as any)}
                splitView
                useDarkTheme
                compareMethod={DiffMethod.WORDS_WITH_SPACE}
              />
            </div>

            <div className="panel p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-sm font-medium text-tx-primary">Trace Visualization</h2>
                <p className="font-mono text-xs text-tx-muted">
                  Step {bugStep} / {Math.max(Math.max(bugResult.correct_trace.length, bugResult.buggy_trace.length) - 1, 0)}
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(Math.max(bugResult.correct_trace.length, bugResult.buggy_trace.length) - 1, 0)}
                value={bugStep}
                onChange={(e) => setBugStep(Number(e.target.value))}
                className="w-full"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="panel p-3 flex flex-col gap-3 border border-border-subtle">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-tx-muted">Correct Trace</p>
                    <p className="font-mono text-xs text-tx-secondary">{Math.min(bugStep, Math.max(bugResult.correct_trace.length - 1, 0))}/{Math.max(bugResult.correct_trace.length - 1, 0)}</p>
                  </div>
                  <VisualizerRouter
                    visualizerType={ALGO_MAP[bugAlgo]?.visualizer ?? 'sorting'}
                    steps={bugResult.correct_trace as any}
                    currentStep={Math.min(bugStep, Math.max(bugResult.correct_trace.length - 1, 0))}
                    height={220}
                    algoId={bugAlgo}
                  />
                </div>
                <div className={clsx('panel p-3 flex flex-col gap-3 border', bugStep >= (bugResult.first_error_step ?? Infinity) ? 'border-status-error' : 'border-border-subtle')}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-tx-muted">Buggy Trace</p>
                    <p className="font-mono text-xs text-tx-secondary">{Math.min(bugStep, Math.max(bugResult.buggy_trace.length - 1, 0))}/{Math.max(bugResult.buggy_trace.length - 1, 0)}</p>
                  </div>
                  <VisualizerRouter
                    visualizerType={ALGO_MAP[bugAlgo]?.visualizer ?? 'sorting'}
                    steps={bugResult.buggy_trace as any}
                    currentStep={Math.min(bugStep, Math.max(bugResult.buggy_trace.length - 1, 0))}
                    height={220}
                    algoId={bugAlgo}
                  />
                </div>
              </div>
            </div>

            <div className="panel p-4">
              <StreamingExplanation
                algo={bugAlgo}
                context={`Bug injected: ${bugId}`}
                contextType="bug"
                trigger={bugTrigger}
              />
            </div>
          </div>
        )}

        {/* ── What-If Results ── */}
        {tab === 'whatif' && wiResult && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Base Steps', value: wiResult.base_step_count, color: 'text-accent-blue' },
                { label: 'Modified Steps', value: wiResult.modified_step_count, color: 'text-accent-cyan' },
                { label: 'Δ Steps', value: wiResult.modified_step_count - wiResult.base_step_count, color: wiResult.modified_step_count > wiResult.base_step_count ? 'text-status-error' : 'text-status-success' },
              ].map(({ label, value, color }) => (
                <div key={label} className="panel p-3">
                  <p className="text-xs text-tx-muted">{label}</p>
                  <p className={`font-mono text-xl font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="panel p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-sm font-medium text-tx-primary">Modified Trace Visualization</h2>
                <p className="font-mono text-xs text-tx-muted">
                  Step {wiStep} / {Math.max(wiResult.new_trace.length - 1, 0)}
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(wiResult.new_trace.length - 1, 0)}
                value={wiStep}
                onChange={(e) => setWiStep(Number(e.target.value))}
                className="w-full"
              />
              <div className="panel p-3 border border-border-subtle">
                <VisualizerRouter
                  visualizerType={ALGO_MAP[wiAlgo]?.visualizer ?? 'sorting'}
                  steps={wiResult.new_trace as any}
                  currentStep={Math.min(wiStep, Math.max(wiResult.new_trace.length - 1, 0))}
                  height={260}
                  algoId={wiAlgo}
                />
              </div>
            </div>

            {/* Diff segments */}
            {wiResult.diff.segments.length > 0 && (
              <div className="panel p-4 flex flex-col gap-2">
                <h2 className="text-sm font-medium text-tx-primary">Trace Changes</h2>
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {wiResult.diff.segments.map((seg, i) => {
                    const colors = DIFF_COLORS[seg.kind]
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-1.5 rounded font-mono text-xs border"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                      >
                        <span className="text-tx-muted w-12 shrink-0">{seg.kind}</span>
                        {seg.op_a && <span className="text-accent-blue">{seg.op_a}</span>}
                        {seg.op_b && <span className="text-accent-cyan">→ {seg.op_b}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="panel p-4">
              <StreamingExplanation
                algo={wiAlgo}
                context={`Modification applied: ${wiMod}`}
                contextType="whatif"
                trigger={wiTrigger}
              />
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="panel p-12 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-xs text-tx-muted">Analyzing traces...</p>
        </div>
      )}
    </div>
  )
}
