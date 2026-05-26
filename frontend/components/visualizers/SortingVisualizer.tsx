'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ArrayStep, TraceStep } from '@/lib/types'

type Props = {
  steps: ArrayStep[] | TraceStep[]
  currentStep: number
  height?: number
}

type BarState = 'normal' | 'compare' | 'swap' | 'sorted' | 'current' | 'pivot'

const OP_COLORS: Record<string, string> = {
  compare:  '#38bdf8',
  swap:     '#f43f5e',
  sorted:   '#10b981',
  current:  '#3b82f6',
  pivot:    '#f59e0b',
  highlight:'#22d3ee',
  done:     '#10b981',
  assign:   '#a78bfa',
  merge:    '#fb923c',
}

function getIndicesFromVars(vars: Record<string, string> | undefined): number[] {
  if (!vars) return []
  const keys = ['i', 'j', 'k', 'l', 'r', 'lo', 'hi', 'mid', 'left', 'right', 'idx', 'index', 'pivot']
  const out: number[] = []
  for (const key of keys) {
    const raw = vars[key]
    if (raw == null) continue
    const n = Number(raw)
    if (!Number.isNaN(n)) out.push(n)
  }
  return Array.from(new Set(out))
}

function normalizeStep(step: ArrayStep | TraceStep | undefined): {
  op: string
  indices: number[]
  pivot?: number
  array: number[]
} | undefined {
  if (!step) return undefined

  if ('array' in step && Array.isArray(step.array)) {
    return {
      op:      step.op,
      indices: step.indices ?? [],
      pivot:   step.pivot,
      array:   step.array,
    }
  }

  if ('array_state' in step) {
    const indices      = getIndicesFromVars(step.vars)
    const pivotRaw     = step.vars?.pivot != null ? Number(step.vars.pivot) : undefined
    const pivotFromIdx = step.vars?.pivot_idx != null ? Number(step.vars.pivot_idx) : undefined
    const pivot        = (pivotRaw    != null && !isNaN(pivotRaw))    ? pivotRaw :
                         (pivotFromIdx != null && !isNaN(pivotFromIdx)) ? pivotFromIdx : undefined
    return {
      op:     step.op,
      indices,
      pivot,
      array:  step.array_state ?? [],
    }
  }

  return undefined
}

// BUG 11 FIX: don't color ALL bars green just because op === 'done'.
// 'done' on a final step correctly turns everything green (algorithm complete),
// but 'sorted' with specific indices should only color those indices.
function getBarColor(index: number, step: ReturnType<typeof normalizeStep>): string {
  if (!step) return '#475569'

  // Algorithm fully complete → everything is green
  if (step.op === 'done') return OP_COLORS.done

  // Specific sorted index mark
  if (step.op === 'sorted' && step.indices.includes(index)) return OP_COLORS.sorted

  // Pivot bar
  if (step.op === 'pivot' && step.pivot === index) return OP_COLORS.pivot

  // Any active index
  if (step.indices.includes(index)) return OP_COLORS[step.op] ?? '#475569'

  return '#475569'
}

function buildBarStates(length: number, step: ReturnType<typeof normalizeStep>): BarState[] {
  const states: BarState[] = Array.from({ length }, () => 'normal')
  if (!step) return states

  if (step.op === 'done') {
    return Array.from({ length }, () => 'sorted')
  }

  if (step.op === 'pivot' && step.pivot != null && step.pivot >= 0 && step.pivot < length) {
    states[step.pivot] = 'pivot'
  }

  if (step.op === 'sorted') {
    for (const idx of step.indices) {
      if (idx >= 0 && idx < length) states[idx] = 'sorted'
    }
    return states
  }

  for (const idx of step.indices) {
    if (idx < 0 || idx >= length) continue
    if (step.op === 'compare') states[idx] = 'compare'
    else if (step.op === 'swap') states[idx] = 'swap'
    else states[idx] = 'current'
  }

  return states
}

function isMovingBar(index: number, step: ArrayStep | undefined): boolean {
  if (!step) return false
  return step.indices.includes(index) && ['compare', 'swap', 'highlight', 'pivot'].includes(step.op)
}

export default function SortingVisualizer({ steps, currentStep, height = 280 }: Props) {
  const step      = normalizeStep(steps[currentStep] as ArrayStep | TraceStep | undefined)
  const firstStep = normalizeStep(steps[0]          as ArrayStep | TraceStep | undefined)
  const array     = useMemo(() => step?.array ?? firstStep?.array ?? [], [step, firstStep])

  const [flashSwapIndices, setFlashSwapIndices] = useState<number[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(600)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const maxVal = useMemo(() => Math.max(...array, 1), [array])
  const barStates = useMemo(() => buildBarStates(array.length, step), [array.length, step])

  const BAR_STATE_COLORS: Record<BarState, string> = {
    normal: '#475569',
    compare: '#f59e0b',
    swap: '#ef4444',
    sorted: '#10b981',
    current: '#3b82f6',
    pivot: '#f59e0b',
  }

  const { barWidth, gap } = useMemo(() => {
    if (array.length === 0) return { barWidth: 24, gap: 1 }
    const gapSize    = array.length > 100 ? 0 : 1
    const totalGaps  = (array.length - 1) * gapSize
    const available  = containerWidth - 16
    const calcWidth  = Math.max((available - totalGaps) / array.length, 1)
    let maxWidth = 8
    if (array.length <= 20) maxWidth = 50
    else if (array.length <= 50) maxWidth = 30
    else if (array.length <= 100) maxWidth = 15
    return { barWidth: Math.min(calcWidth, maxWidth), gap: gapSize }
  }, [array.length, containerWidth])

  useEffect(() => {
    if (!step || step.op !== 'swap' || step.indices.length === 0) return
    setFlashSwapIndices(step.indices)
    const t = setTimeout(() => setFlashSwapIndices([]), 140)
    return () => clearTimeout(t)
  }, [step])

  if (array.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-tx-muted">
        No data — run algorithm to visualize
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden"
      style={{ height }}
      role="img"
      aria-label={`Sorting visualization, step ${currentStep}`}
    >
      {/* Operation label */}
      {step && (
        <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
          <span
            className="font-mono text-xs px-2 py-0.5 rounded border"
            style={{
              color:           OP_COLORS[step.op] ?? '#8892a4',
              borderColor:     `${OP_COLORS[step.op] ?? '#8892a4'}40`,
              backgroundColor: `${OP_COLORS[step.op] ?? '#8892a4'}10`,
            }}
          >
            {step.op}
          </span>
          {step.indices.length > 0 && (
            <span className="font-mono text-xs text-tx-secondary">
              [{step.indices.join(', ')}]
            </span>
          )}
        </div>
      )}

      {/* Bars */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center"
        style={{ paddingBottom: 20, paddingLeft: 8, paddingRight: 8, gap: `${gap}px` }}
      >
        {/* BUG 2 FIX: key === layoutId so Framer Motion tracks correctly.
            Key by index so React identity is stable per position.
            layoutId matches key — no mismatch. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {array.map((val, i) => {
            const stateColor = BAR_STATE_COLORS[barStates[i] ?? 'normal']
            const fallbackColor = getBarColor(i, step)
            const color  = flashSwapIndices.includes(i) ? OP_COLORS.highlight : (stateColor || fallbackColor)
            const moving = isMovingBar(i, step as ArrayStep | undefined)
            const barH   = Math.max(4, Math.floor((val / maxVal) * (height - 56)))

            return (
              <motion.div
                key={`bar-${i}`}
                layout
                layoutId={`bar-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`vis-bar flex flex-col items-center justify-end relative ${moving ? 'moving' : ''}`}
                style={{ height: height - 44, width: barWidth }}
              >
                {/* Hover value tooltip */}
                {array.length <= 30 && (
                  <motion.span
                    className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-tx-secondary whitespace-nowrap pointer-events-none z-10 opacity-0"
                    whileHover={{ opacity: 1 }}
                  >
                    {val}
                  </motion.span>
                )}

                <motion.div
                  className="w-full rounded-t-[2px]"
                  animate={{
                    height:          barH,
                    backgroundColor: color,
                    scale:           moving ? 1.05 : 1,
                  }}
                  transition={{
                    height:          { duration: 0.18 },
                    backgroundColor: { duration: 0.14 },
                    scale:           { duration: 0.12 },
                  }}
                  style={{
                    boxShadow:     color !== '#475569' ? `0 0 8px ${color}55` : undefined,
                    transformOrigin: 'bottom',
                  }}
                />

                {/* Index label below bar */}
                {array.length <= 20 && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] text-tx-secondary">
                    {i}
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="absolute bottom-0 right-2 flex items-center gap-3">
        {[
          { color: OP_COLORS.compare,  label: 'compare' },
          { color: OP_COLORS.pivot,    label: 'pivot' },
          { color: OP_COLORS.swap,     label: 'swap' },
          { color: OP_COLORS.sorted,   label: 'sorted' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: color }} />
            <span className="font-mono text-[10px] text-tx-secondary">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
