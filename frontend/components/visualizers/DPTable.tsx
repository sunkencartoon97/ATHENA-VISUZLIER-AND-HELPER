'use client'

import { useMemo } from 'react'
import type { DPStep, TraceStep } from '@/lib/types'

type Props = {
  steps: DPStep[] | TraceStep[]
  currentStep: number
  rows?: number
  cols?: number
  rowLabels?: string[]
  colLabels?: string[]
  height?: number
}

const CELL_SIZE = 38

type CellState = 'empty' | 'filled' | 'current' | 'dependency' | 'backtrack'

type CellData = {
  value: number | null
  state: CellState
  isDepSource?: boolean
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function normalizeDPStep(step: DPStep | TraceStep | undefined): DPStep | undefined {
  if (!step) return undefined

  const anyStep = step as any
  const opRaw = String(anyStep.op ?? '')
  const row = toNumber(anyStep.row) ?? toNumber(anyStep.vars?.row) ?? toNumber(anyStep.vars?.i)
  const col = toNumber(anyStep.col) ?? toNumber(anyStep.vars?.col) ?? toNumber(anyStep.vars?.j)

  const base: Omit<DPStep, 'op' | 'row' | 'col'> = {
    step_id: toNumber(anyStep.step_id) ?? 0,
    value: toNumber(anyStep.value),
    from_row: toNumber(anyStep.from_row),
    from_col: toNumber(anyStep.from_col),
    to_row: toNumber(anyStep.to_row),
    to_col: toNumber(anyStep.to_col),
  }

  const normalizedOp = opRaw === 'fill' ? 'fill_cell' : opRaw
  if (!['fill_cell', 'depend', 'backtrack', 'init'].includes(normalizedOp)) return undefined
  if (row == null || col == null) return undefined

  return {
    ...base,
    op: normalizedOp as DPStep['op'],
    row,
    col,
  }
}

export default function DPTable({
  steps,
  currentStep,
  rows,
  cols,
  rowLabels,
  colLabels,
  height = 320,
}: Props) {
  const normalizedSteps = useMemo(
    () => (steps as Array<DPStep | TraceStep>).map(normalizeDPStep).filter(Boolean) as DPStep[],
    [steps]
  )

  // Derive grid size from steps
  const { gridRows, gridCols } = useMemo(() => {
    let maxR = rows ?? 0
    let maxC = cols ?? 0
    normalizedSteps.forEach(s => {
      maxR = Math.max(maxR, (s.row ?? 0) + 1, (s.to_row ?? 0) + 1, (s.from_row ?? 0) + 1)
      maxC = Math.max(maxC, (s.col ?? 0) + 1, (s.to_col ?? 0) + 1, (s.from_col ?? 0) + 1)
    })
    return { gridRows: Math.max(maxR, 2), gridCols: Math.max(maxC, 2) }
  }, [normalizedSteps, rows, cols])

  // Build grid state up to currentStep
  const { grid, deps, current } = useMemo(() => {
    const grid: CellData[][] = Array.from({ length: gridRows }, () =>
      Array.from({ length: gridCols }, () => ({ value: null, state: 'empty' as CellState }))
    )
    const deps: Array<{ fr: number; fc: number; tr: number; tc: number }> = []
    let current: { r: number; c: number } | null = null

    for (let i = 0; i <= currentStep && i < normalizedSteps.length; i++) {
      const s = normalizedSteps[i]
      if (!s) continue

      if (s.op === 'fill_cell') {
        if (s.row < gridRows && s.col < gridCols) {
          grid[s.row][s.col] = { value: s.value ?? null, state: 'filled' }
        }
        current = { r: s.row, c: s.col }
      } else if (s.op === 'depend') {
        if (
          s.from_row !== undefined && s.from_col !== undefined &&
          s.to_row !== undefined && s.to_col !== undefined
        ) {
          deps.push({ fr: s.from_row, fc: s.from_col, tr: s.to_row, tc: s.to_col })
        }
      } else if (s.op === 'backtrack') {
        if (s.row < gridRows && s.col < gridCols) {
          grid[s.row][s.col].state = 'backtrack'
        }
      } else if (s.op === 'init') {
        if (s.row < gridRows && s.col < gridCols) {
          grid[s.row][s.col] = { value: s.value ?? 0, state: 'filled' }
        }
      }
    }

    // Mark current and its dependency sources
    if (current && current.r < gridRows && current.c < gridCols) {
      grid[current.r][current.c].state = 'current'
    }

    // Mark dependency sources for the current step
    const step = normalizedSteps[currentStep] as DPStep | undefined
    if (step?.op === 'depend' && step.from_row !== undefined && step.from_col !== undefined) {
      if (step.from_row < gridRows && step.from_col < gridCols) {
        grid[step.from_row][step.from_col].isDepSource = true
      }
    }

    return { grid, deps, current }
  }, [normalizedSteps, currentStep, gridRows, gridCols])

  const step = normalizedSteps[currentStep] as DPStep | undefined

  const svgW = gridCols * CELL_SIZE + 48
  const svgH = gridRows * CELL_SIZE + 48

  const CELL_COLORS: Record<CellState, { fill: string; stroke: string; text: string }> = {
    empty: { fill: '#0d0f1a', stroke: '#1e2236', text: '#374151' },
    filled: { fill: '#1e223680', stroke: '#252a3e', text: '#8892a4' },
    current: { fill: '#3b82f625', stroke: '#3b82f6', text: '#3b82f6' },
    dependency: { fill: '#3b82f615', stroke: '#3b82f6', text: '#3b82f6' },
    backtrack: { fill: '#a78bfa20', stroke: '#a78bfa', text: '#a78bfa' },
  }

  return (
    <div className="flex flex-col gap-2" style={{ height }}>
      {/* Op label */}
      {step && (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {step.op}
          </span>
          <span className="font-mono text-xs text-tx-muted">
            [{step.row},{step.col}]
            {step.value !== undefined ? ` = ${step.value}` : ''}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="overflow-auto flex-1">
        <svg width={svgW} height={svgH}>
          {/* Column headers */}
          {Array.from({ length: gridCols }, (_, c) => (
            <text
              key={c}
              x={48 + c * CELL_SIZE + CELL_SIZE / 2}
              y={16}
              textAnchor="middle"
              fontSize={10}
              fontFamily="IBM Plex Mono"
              fill="#4a5568"
            >
              {colLabels ? colLabels[c] : c}
            </text>
          ))}

          {/* Row headers */}
          {Array.from({ length: gridRows }, (_, r) => (
            <text
              key={r}
              x={20}
              y={48 + r * CELL_SIZE + CELL_SIZE / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="IBM Plex Mono"
              fill="#4a5568"
            >
              {rowLabels ? rowLabels[r] : r}
            </text>
          ))}

          {/* Dependency arrows */}
          <defs>
            <marker id="dep-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#3b82f6" />
            </marker>
          </defs>
          {deps.slice(-6).map((dep, i) => {
            const x1 = 48 + dep.fc * CELL_SIZE + CELL_SIZE / 2
            const y1 = 48 + dep.fr * CELL_SIZE + CELL_SIZE / 2
            const x2 = 48 + dep.tc * CELL_SIZE + CELL_SIZE / 2
            const y2 = 48 + dep.tr * CELL_SIZE + CELL_SIZE / 2
            return (
              <g key={i} opacity={0.5}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  markerEnd="url(#dep-arrow)"
                />
              </g>
            )
          })}

          {/* Cells */}
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isDepSrc = cell.isDepSource
              const state = isDepSrc ? 'dependency' : cell.state
              const colors = CELL_COLORS[state]
              const cx = 48 + c * CELL_SIZE
              const cy = 48 + r * CELL_SIZE

              return (
                <g key={`${r}-${c}`}>
                  <rect
                    x={cx} y={cy}
                    width={CELL_SIZE - 2}
                    height={CELL_SIZE - 2}
                    rx={2}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={state === 'current' || isDepSrc ? 1.5 : 1}
                  />
                  {cell.value !== null && (
                    <text
                      x={cx + (CELL_SIZE - 2) / 2}
                      y={cy + (CELL_SIZE - 2) / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontFamily="IBM Plex Mono"
                      fontWeight={state === 'current' ? '600' : '400'}
                      fill={colors.text}
                    >
                      {cell.value}
                    </text>
                  )}
                </g>
              )
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 shrink-0">
        {[
          { color: '#3b82f6', label: 'current' },
          { color: '#3b82f6', label: 'dependency' },
          { color: '#a78bfa', label: 'backtrack' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-[2px] border"
              style={{ borderColor: color, backgroundColor: `${color}20` }}
            />
            <span className="font-mono text-[9px] text-tx-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
