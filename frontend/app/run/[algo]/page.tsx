'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Play, Share2, Copy, Check, Download } from 'lucide-react'
import { runAlgorithm, analyzeComplexity, requestExplanation, createExplainStream } from '@/lib/api'
import { ALGORITHM_REGISTRY, SORTING_COMPLEXITY } from '@/lib/algorithms'
import { GitHubApi } from '@/lib/githubApi'
import type { ComplexityResponse, RunAlgorithmResponse, TraceStep } from '@/lib/types'
import VisualizerRouter from '@/components/visualizers/VisualizerRouter'
import PlaybackControls from '@/components/PlaybackControls'
import RightPanel from '@/components/layout/RightPanel'
import CodePanel from '@/components/CodePanel'
import { ComplexityBadge } from '@/components/analysis/ComplexityBadge'
import { usePlayback } from '@/lib/usePlayback'
import { getAlgorithmCodeSample, getHighlightedLineForStep } from '@/lib/codeSamples'
import { normalizeComplexityLabel } from '@/lib/complexityUtils'

function randomInput(size = 10) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10)
}

function parseCsvNumbers(input: string): number[] {
  return input
    .split(/[\s,]+/)
    .map(v => Number(v.trim()))
    .filter(v => !Number.isNaN(v))
}

function extractNumbersFromText(input: string): number[] {
  if (!input) return []
  // Try array literal first: [1, 2, 3]
  const arrMatch = input.match(/\[([^\]]+)\]/)
  if (arrMatch) {
    return arrMatch[1].split(/[,\s]+/).map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
  }
  // Check for a CSV-looking line
  const lines = input.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    const parts = line.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2 && parts.every(p => /-?\d+/.test(p))) {
      return parts.map(p => Number(p))
    }
  }
  // Fallback: pull any numbers
  const nums = input.match(/-?\d+/g)
  if (!nums) return []
  return nums.map(n => Number(n)).slice(0, 200)
}

function deriveChunkGroups(steps: TraceStep[]): number[][] {
  const chunks: number[][] = []
  for (let i = 0; i < steps.length; i += 1) {
    const s = steps[i]
    if (s.op === 'compare') {
      const next = steps[i + 1]
      if (next && (next.op === 'swap' || next.op === 'assign')) {
        chunks.push([i, i + 1])
        i += 1
      } else {
        chunks.push([i])
      }
    } else {
      chunks.push([i])
    }
  }
  return chunks.filter(c => c.length > 0)
}

export default function RunAlgoPage() {
  const params = useParams()
  const router = useRouter()
  const search = useSearchParams()

  const algoId = typeof params.algo === 'string' ? params.algo : ''
  const algo   = useMemo(() => ALGORITHM_REGISTRY.find(a => a.id === algoId), [algoId])

  const [inputValue, setInputValue] = useState(() => randomInput(10).join(', '))
  const [autoRunRequested, setAutoRunRequested] = useState(false)
  const [result,     setResult]     = useState<RunAlgorithmResponse | null>(null)
  const [complexity, setComplexity] = useState<ComplexityResponse | null>(null)
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  const [chunks, setChunks] = useState<number[][]>([])

  const [aiText,      setAiText]      = useState('')
  const [aiError,     setAiError]     = useState('')
  const [aiStreaming, setAiStreaming]  = useState(false)
  const closeStreamRef = useRef<(() => void) | null>(null)
  const [copied, setCopied] = useState(false)

  // String matching algorithms use dedicated text/pattern fields
  const STRING_ALGOS = useMemo(() => new Set(['naivematch', 'kmp', 'rabinkarp']), [])
  const isStringAlgo = STRING_ALGOS.has(algoId)
  const [stringText,    setStringText]    = useState('AABAACAADAABAAABAA')
  const [stringPattern, setStringPattern] = useState('AABA')

  const parsedInput = useMemo(() => {
    if (isStringAlgo) {
      // Encode as ASCII: [...textCodes, 0, ...patternCodes]
      const textCodes    = Array.from(stringText,    c => c.charCodeAt(0))
      const patternCodes = Array.from(stringPattern, c => c.charCodeAt(0))
      return [...textCodes, 0, ...patternCodes]
    }
    return parseCsvNumbers(inputValue)
  }, [isStringAlgo, stringText, stringPattern, inputValue])

  const steps      = useMemo(() => result?.steps ?? [], [result])
  const totalSteps = steps.length
  const playback   = usePlayback(totalSteps)

  const {
    currentStep,
    isPlaying,
    speed,
    play,
    pause,
    stepForward,
    stepBack,
    reset,
    goToStep,
    setSpeed,
  } = playback

  const comparisons = useMemo(() => steps.filter(s => s.op === 'compare').length, [steps])
  const swaps       = useMemo(() => steps.filter(s => s.op === 'swap').length,    [steps])
  const measuredComplexityLabel = complexity?.fit?.label || (complexity as any)?.estimated_complexity
  const complexityLabel   = algo?.timeComplexity || measuredComplexityLabel
  const staticComplexity  = algo ? SORTING_COMPLEXITY[algo.id] : undefined

  const liveOperationCount = useMemo(() => {
    const end = Math.min(currentStep, steps.length - 1)
    if (end < 0) return 0
    let count = 0
    for (let i = 0; i <= end; i++) {
      const op = steps[i]?.op
      if (op === 'compare' || op === 'swap' || op === 'assign' || op === 'merge') {
        count += 1
      }
    }
    return count
  }, [steps, currentStep])

  const expectedOperationCount = useMemo(() => {
    const n = Math.max(parsedInput.length, 1)
    const complexity = normalizeComplexityLabel(complexityLabel || staticComplexity?.time.average || '')
    if (complexity.includes('n log n')) return Math.round(n * Math.log2(n))
    if (complexity.includes('n^2')) return n * n
    if (complexity.includes('O(n)') || complexity === 'O(n)') return n
    if (complexity.includes('log n')) return Math.max(1, Math.round(Math.log2(n)))
    return Math.max(1, endFallbackEstimate(n))
  }, [parsedInput.length, complexityLabel, staticComplexity])

  function endFallbackEstimate(n: number): number {
    return Math.round(n * Math.log2(n))
  }

  const currentArrayState = useMemo(() => {
    if (steps.length === 0) return []
    return steps[Math.max(0, Math.min(currentStep, steps.length - 1))]?.array_state ?? []
  }, [steps, currentStep])

  const executionLog = useMemo(() => {
    const limit = Math.max(0, Math.min(currentStep, steps.length - 1))
    return steps.slice(0, limit + 1).map((step, index) => {
      const entries = Object.entries(step.vars ?? {}).filter(([, value]) => value !== undefined && value !== '')
      return {
        index,
        step,
        entries,
      }
    })
  }, [steps, currentStep])

  // Current step vars for the detail panel
  const currentStepData = steps[Math.min(currentStep, Math.max(steps.length - 1, 0))]
  const stepVars        = useMemo(() => {
    const v = currentStepData?.vars
    if (!v) return []
    return Object.entries(v).filter(([, val]) => val !== undefined && val !== '')
  }, [currentStepData])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('github_token') : null
    GitHubApi.auth(token || undefined)
  }, [])

  useEffect(() => {
    const gistId = search.get('gist')
    if (!gistId) return
    GitHubApi.getGist(gistId)
      .then((gist) => {
        const files   = gist.files as Record<string, { content?: string }> | undefined
        const content = files?.['athena-run.json']?.content
        if (!content) return
        const parsed = JSON.parse(content) as { algo?: string; input?: number[] }
        if (parsed.algo && parsed.algo !== algoId) {
          router.replace(`/run/${parsed.algo}?gist=${gistId}`)
          return
        }
        if (Array.isArray(parsed.input)) setInputValue(parsed.input.join(', '))
      })
      .catch(() => {})
  }, [search, algoId, router])

  // Read prefill/code/run params to pre-populate input and optionally auto-run
  useEffect(() => {
    const prefill = search.get('prefill')
    const codeParam = search.get('code')
    const runParam = search.get('run')

    if (prefill) {
      const csvNums = parseCsvNumbers(prefill)
      if (csvNums.length > 0) {
        setInputValue(csvNums.join(', '))
      } else {
        const extracted = extractNumbersFromText(prefill)
        if (extracted.length > 0) setInputValue(extracted.join(', '))
        else setInputValue(prefill)
      }
    } else if (codeParam) {
      const extracted = extractNumbersFromText(codeParam)
      if (extracted.length > 0) setInputValue(extracted.join(', '))
    }

    if (runParam === '1' || runParam === 'true') {
      setAutoRunRequested(true)
    }
  }, [search, algoId])

  useEffect(() => {
    return () => { if (closeStreamRef.current) closeStreamRef.current() }
  }, [])

  const startExplanation = useCallback(async (ctx: string) => {
    if (closeStreamRef.current) { closeStreamRef.current(); closeStreamRef.current = null }
    setAiText(''); setAiError(''); setAiStreaming(true)
    try {
      const { request_id } = await requestExplanation(algoId, ctx, 'general')
      const close = createExplainStream(
        request_id,
        (token) => setAiText(prev => prev + token),
        () => setAiStreaming(false),
        (err) => { setAiStreaming(false); setAiError(err.message) },
      )
      closeStreamRef.current = close
    } catch (err) {
      setAiStreaming(false)
      setAiError(err instanceof Error ? err.message : 'Failed to request explanation')
    }
  }, [algoId])

  const handleRun = useCallback(async () => {
    if (!algo) return
    if (!isStringAlgo && parsedInput.length === 0) return
    setLoading(true); setError(''); setResult(null); setComplexity(null)
    reset()
    try {
      const runRes = await runAlgorithm(algo.id, parsedInput, 'trace')
      setResult(runRes)
      reset()
      const isSorting = ['bubblesort','selectionsort','insertionsort','mergesort','quicksort'].includes(algo.id)
      setChunks(isSorting ? deriveChunkGroups(runRes.steps) : [])
      startExplanation(`Run result for ${algo.name} on input [${parsedInput.join(', ')}]`)
      analyzeComplexity(algo.id, [10, 50, 100, 500, 1000])
        .then(setComplexity)
        .catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setLoading(false)
    }
  }, [algo, parsedInput, reset, startExplanation])

  useEffect(() => {
    if (!autoRunRequested) return
    if (parsedInput.length === 0) return
    handleRun()
    setAutoRunRequested(false)
  }, [autoRunRequested, parsedInput, handleRun])

  const handleShare = async () => {
    if (!algo) return
    try {
      let token = localStorage.getItem('github_token')
      if (!token) {
        token = window.prompt("Enter a GitHub Personal Access Token to share as a Gist:")
        if (!token) return // User cancelled
        localStorage.setItem('github_token', token)
        GitHubApi.auth(token)
      }

      const body = {
        description: `ATHENA run for ${algo.id}`,
        public:      false,
        files: { 'athena-run.json': { content: JSON.stringify({ algo: algo.id, input: parsedInput }, null, 2) } },
      }
      const gist = await GitHubApi.createGist(body)
      const id   = gist.id as string | undefined
      if (id) router.replace(`/run/${algo.id}?gist=${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gist sharing failed')
    }
  }
  
  const handleDownload = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `athena-${algoId}-trace.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const nextSwap = () => {
    const nextIdx = steps.findIndex((s, i) => i > currentStep && s.op === 'swap')
    if (nextIdx >= 0) {
      pause()
      goToStep(nextIdx)
    }
  }
  const prevSwap = () => {
    let lastIdx = -1
    for (let i = currentStep - 1; i >= 0; i--) {
      if (steps[i].op === 'swap') {
        lastIdx = i
        break
      }
    }
    if (lastIdx >= 0) {
      pause()
      goToStep(lastIdx)
    }
  }

  if (!algo) {
    return (
      <div className="panel p-6">
        <p className="text-sm text-tx-secondary">Algorithm not found.</p>
      </div>
    )
  }

  const codeSample = getAlgorithmCodeSample(algo.id)
  const highlightedLine = getHighlightedLineForStep(algo.id, steps[currentStep], currentStep)

  return (
    <div className="flex gap-4 items-start">

      {/* LEFT: Code Panel — always visible, sticky, full height */}
      <div className="hidden lg:flex flex-col w-80 xl:w-96 2xl:w-[28rem] shrink-0 sticky top-16 h-[calc(100vh-5rem)]">
        <CodePanel
          title={algo.name}
          code={codeSample.code}
          language={codeSample.language}
          highlightedLine={highlightedLine}
          fullHeight
        />
      </div>

      {/* CENTER: Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Header card */}
        <div className="panel p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-medium text-tx-primary">{algo.name}</h1>
              {complexityLabel && (
                <ComplexityBadge label={complexityLabel} rSquared={complexity?.fit?.r_squared} />
              )}
              {measuredComplexityLabel && measuredComplexityLabel !== complexityLabel && (
                <span className="font-mono text-[10px] text-tx-muted">
                  measured: {measuredComplexityLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {algoId === 'binarysearch' && (
                <Link href="/run/binarysearch/interactive" className="btn-secondary">
                  Try Interactive Mode
                </Link>
              )}
              <button onClick={handleShare} className="btn-secondary" title="Share this run as gist">
                <Share2 size={13} />
                Share
              </button>
              {result && (
                <button onClick={handleDownload} className="btn-secondary" title="Download trace JSON">
                  <Download size={13} />
                  Export
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-tx-muted">{algo.description}</p>
          {staticComplexity && (
            <div className="flex items-center gap-4 text-xs text-tx-secondary">
              <span>Stable: {staticComplexity.stable ? 'Yes' : 'No'}</span>
              <span>In-place: {staticComplexity.inPlace ? 'Yes' : 'No'}</span>
            </div>
          )}
        </div>

        {/* Input + Run */}
        <div className="panel p-4 flex flex-wrap gap-3 items-end">
          {isStringAlgo ? (
            /* String algorithm: show text + pattern text fields */
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <label className="text-xs text-tx-secondary">String Matching Input</label>
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-36 flex flex-col gap-1">
                  <label className="text-[10px] text-tx-muted">Text (search space)</label>
                  <input
                    value={stringText}
                    onChange={e => setStringText(e.target.value.toUpperCase())}
                    className="input font-mono text-xs tracking-wider"
                    placeholder="AABAACAADAABAAABAA"
                  />
                </div>
                <div className="flex-1 min-w-24 flex flex-col gap-1">
                  <label className="text-[10px] text-tx-muted">Pattern</label>
                  <input
                    value={stringPattern}
                    onChange={e => setStringPattern(e.target.value.toUpperCase())}
                    className="input font-mono text-xs tracking-wider"
                    placeholder="AABA"
                  />
                </div>
              </div>
              <p className="text-[10px] text-tx-muted font-mono">
                {stringText.length} chars · searching for &quot;{stringPattern}&quot; ({stringPattern.length} chars)
              </p>
            </div>
          ) : (
            /* Normal algorithm: comma-separated number array */
            <div className="flex-1 min-w-52 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-tx-secondary">Input (comma-separated numbers)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInputValue('10, 20, 30, 40, 50, 60, 70, 80, 90, 100')}
                    className="text-[10px] text-tx-muted hover:text-sky-400 transition-colors"
                  >
                    Sorted
                  </button>
                  <button
                    onClick={() => setInputValue('100, 90, 80, 70, 60, 50, 40, 30, 20, 10')}
                    className="text-[10px] text-tx-muted hover:text-sky-400 transition-colors"
                  >
                    Reversed
                  </button>
                  <button
                    onClick={() => setInputValue(randomInput(10).join(', '))}
                    className="text-[10px] text-tx-muted hover:text-sky-400 transition-colors"
                  >
                    Random
                  </button>
                </div>
              </div>
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                className="input font-mono text-xs"
                placeholder="10, 3, 8, 1, 6"
              />
            </div>
          )}
          <button
            onClick={handleRun}
            disabled={loading || (isStringAlgo ? (!stringText || !stringPattern) : parsedInput.length === 0)}
            className="btn-primary"
          >
            <Play size={13} />
            {loading ? 'Running...' : 'Run'}
          </button>
        </div>

        {error && (
          <div className="panel p-3 border-status-error/30 bg-status-error/5">
            <p className="text-xs text-status-error">{error}</p>
          </div>
        )}

        {result?.truncated && (
          <div className="panel p-3 border-status-warning/40 bg-status-warning/10">
            <p className="text-xs text-status-warning">Trace output was truncated due to backend safety limits.</p>
          </div>
        )}

        {/* BUG 5 FIX: visualizer height raised from 300 to 560 */}
        <div className="panel p-4">
          <VisualizerRouter
            visualizerType={algo.visualizer}
            steps={steps as unknown as TraceStep[]}
            currentStep={Math.min(currentStep, Math.max(steps.length - 1, 0))}
            algoId={algo.id}
            height={560}
          />

          {result && (
            <div className="mt-3 border-t border-border-subtle pt-3">
              <PlaybackControls
                isPlaying={isPlaying}
                currentStep={currentStep}
                totalSteps={totalSteps}
                speed={speed}
                chunks={chunks}
                onPlay={play}
                onPause={pause}
                onStepForward={stepForward}
                onStepBack={stepBack}
                onSeek={goToStep}
                onReset={reset}
                onSpeedChange={setSpeed}
              />
              
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] text-tx-muted uppercase tracking-widest font-bold">Quick Jump:</span>
                <button 
                  onClick={prevSwap} 
                  disabled={!steps.some((s, i) => i < currentStep && s.op === 'swap')}
                  className="text-[10px] px-2 py-0.5 rounded border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-tx-secondary disabled:opacity-20"
                >
                  Prev Swap
                </button>
                <button 
                  onClick={nextSwap} 
                  disabled={!steps.some((s, i) => i > currentStep && s.op === 'swap')}
                  className="text-[10px] px-2 py-0.5 rounded border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-tx-secondary disabled:opacity-20"
                >
                  Next Swap
                </button>
              </div>
            </div>
          )}
        </div>


        {/* BUG 8 FIX: stats grid with proper visual treatment */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Comparisons', value: comparisons,                        color: 'text-accent-blue' },
              { label: 'Swaps',       value: swaps,                              color: 'text-accent-cyan' },
              { label: 'Live Ops',    value: `${liveOperationCount}/${expectedOperationCount}`, color: liveOperationCount > expectedOperationCount ? 'text-status-error' : 'text-status-success' },
              { label: 'Wall Time',   value: `${result.wall_ms.toFixed(2)} ms`,  color: 'text-status-success' },
            ].map(({ label, value, color }) => (
              <div key={label} className="panel-elevated p-3 flex flex-col gap-1">
                <p className="text-[10px] text-tx-muted uppercase tracking-wider font-medium">{label}</p>
                <p className={`font-mono text-xl font-semibold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* BUG 10 FIX: step variables panel — surfaces the vars object at each step */}
        {result && steps.length > 0 && (
          <div className="panel p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-tx-muted uppercase tracking-wider font-medium">
                  Step Variables & Execution Log
                </p>
                {stepVars.length > 0 && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(Object.fromEntries(stepVars), null, 2))
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="text-tx-muted hover:text-tx-primary transition-colors"
                    title="Copy variables to clipboard"
                  >
                    {copied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
              <p className="font-mono text-[10px] text-tx-muted">
                step {currentStep + 1} / {totalSteps} | {currentStepData?.op ?? ''}
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="panel-elevated p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] text-tx-muted uppercase tracking-wider font-medium">Current Snapshot</p>
                    <p className="font-mono text-base text-tx-primary">{currentStepData?.op ?? 'idle'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-tx-muted uppercase tracking-wider font-medium">Array State</p>
                    <p className="font-mono text-[11px] text-tx-secondary break-all">
                      {currentArrayState.length > 0 ? currentArrayState.join(', ') : 'No array snapshot available'}
                    </p>
                  </div>
                </div>

                {stepVars.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {stepVars.map(([k, v]) => (
                      <div
                        key={k}
                        className="panel-elevated px-3 py-2 flex items-start gap-2 rounded"
                      >
                        <span className="font-mono text-[11px] text-accent-cyan shrink-0">{k}</span>
                        <span className="font-mono text-[11px] text-tx-muted shrink-0">=</span>
                        <span className="font-mono text-[11px] text-tx-primary break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[11px] text-tx-muted italic">no variables at this step</p>
                )}
              </div>

              <div className="panel-elevated p-3 flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-tx-muted uppercase tracking-wider font-medium">Previous Steps</p>
                  <p className="font-mono text-[10px] text-tx-muted">showing 1-{executionLog.length} of {totalSteps}</p>
                </div>
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {executionLog.map(({ index, step, entries }) => (
                    <div
                      key={step.step_id}
                      className={[
                        'rounded border px-3 py-2',
                        index === currentStep
                          ? 'border-accent-blue/40 bg-accent-blue/10'
                          : 'border-border-subtle bg-white/[0.02]',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[11px] text-tx-secondary">Step {index + 1}</p>
                        <p className="font-mono text-[10px] text-tx-muted">{step.op}</p>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {entries.length > 0 ? entries.map(([key, value]) => (
                          <span key={`${step.step_id}-${key}`} className="font-mono text-[10px] rounded bg-white/[0.04] px-2 py-0.5 text-tx-secondary break-all">
                            {key}={value}
                          </span>
                        )) : (
                          <span className="font-mono text-[10px] text-tx-muted italic">no vars</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BUG 8/13 FIX: RightPanel — only render on xl; it self-collapses when empty */}
      <div className="hidden xl:block sticky top-16 h-[calc(100vh-5rem)]">
        <RightPanel
          text={aiText}
          isStreaming={aiStreaming}
          error={aiError}
          onClear={() => {
            if (closeStreamRef.current) { closeStreamRef.current(); closeStreamRef.current = null }
            setAiText(''); setAiError(''); setAiStreaming(false)
          }}
          onRegenerate={() => {
            if (!algo) return
            startExplanation(`Run result for ${algo.name} on input [${parsedInput.join(', ')}]`)
          }}
        />
      </div>
    </div>
  )
}
