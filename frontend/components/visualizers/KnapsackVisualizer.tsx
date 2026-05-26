'use client'

import { useMemo } from 'react'
import type { KnapsackStep, KnapsackItem } from '@/lib/types'

type Props = {
  steps: KnapsackStep[]
  currentStep: number
  items?: KnapsackItem[]
  capacity?: number
  height?: number
}

const DEFAULT_ITEMS: KnapsackItem[] = [
  { id: 0, weight: 10, value: 60, ratio: 6.0 },
  { id: 1, weight: 20, value: 100, ratio: 5.0 },
  { id: 2, weight: 30, value: 120, ratio: 4.0 },
  { id: 3, weight: 15, value: 40, ratio: 2.67 },
  { id: 4, weight: 25, value: 50, ratio: 2.0 },
]

const DEFAULT_CAPACITY = 50

export default function KnapsackVisualizer({
  steps,
  currentStep,
  items = DEFAULT_ITEMS,
  capacity = DEFAULT_CAPACITY,
  height = 300,
}: Props) {
  const step = steps[currentStep] as KnapsackStep | undefined

  const { itemStates, currentWeight, currentValue } = useMemo(() => {
    const itemStates: Record<number, KnapsackItem['state']> = {}
    items.forEach(item => { itemStates[item.id] = 'normal' })
    let currentWeight = 0
    let currentValue = 0

    for (let i = 0; i <= currentStep && i < steps.length; i++) {
      const s = steps[i] as KnapsackStep
      if (!s) continue

      if (s.op === 'consider_item') {
        itemStates[s.item_id] = 'considering'
      } else if (s.op === 'include') {
        itemStates[s.item_id] = 'included'
        currentWeight = s.current_weight ?? currentWeight
        currentValue = s.current_value ?? currentValue
      } else if (s.op === 'exclude') {
        itemStates[s.item_id] = 'excluded'
      } else if (s.op === 'partial_include') {
        itemStates[s.item_id] = 'partial'
        currentWeight = s.current_weight ?? currentWeight
        currentValue = s.current_value ?? currentValue
      }
    }

    return { itemStates, currentWeight, currentValue }
  }, [steps, currentStep, items])

  // Sort items by value/weight ratio for display
  const sortedItems = [...items].sort((a, b) => b.ratio - a.ratio)

  const maxValue = Math.max(...items.map(i => i.value), 1)
  const fillPct = Math.min((currentWeight / capacity) * 100, 100)

  const STATE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    normal:      { bg: '#1e2236', border: '#252a3e', text: '#4a5568' },
    considering: { bg: '#f59e0b15', border: '#f59e0b', text: '#f59e0b' },
    included:    { bg: '#10b98115', border: '#10b981', text: '#10b981' },
    excluded:    { bg: '#37415120', border: '#374151', text: '#374151' },
    partial:     { bg: '#f59e0b08', border: '#f59e0b60', text: '#f59e0b' },
  }

  return (
    <div className="flex flex-col gap-4" style={{ height }}>
      {/* Op label */}
      {step && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {step.op}
          </span>
          <span className="font-mono text-xs text-tx-muted">
            item: {step.item_id}
          </span>
          {step.fraction !== undefined && (
            <span className="font-mono text-xs text-amber-400">
              fraction: {(step.fraction * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}

      {/* Capacity bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between font-mono text-xs text-tx-muted">
          <span>Knapsack Capacity</span>
          <span>
            <span className="text-tx-secondary">{currentWeight}</span>
            <span className="text-tx-muted"> / {capacity} kg</span>
          </span>
        </div>
        <div className="h-6 bg-bg-elevated border border-border rounded overflow-hidden">
          <div
            className="h-full rounded transition-all duration-300"
            style={{
              width: `${fillPct}%`,
              background: fillPct > 90
                ? 'linear-gradient(90deg, #10b981, #ef4444)'
                : 'linear-gradient(90deg, #10b981, #22d3ee)',
              boxShadow: '0 0 8px rgba(16,185,129,0.3)',
            }}
          />
        </div>
        <div className="flex justify-between font-mono text-xs">
          <span className="text-emerald-400">Value: {currentValue}</span>
          <span className="text-tx-muted">{fillPct.toFixed(0)}% full</span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto flex flex-col gap-1.5">
        {sortedItems.map(item => {
          const state = itemStates[item.id] ?? 'normal'
          const colors = STATE_COLORS[state] ?? STATE_COLORS.normal
          const barWidthPct = (item.value / maxValue) * 100
          const isActive = step?.item_id === item.id

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 transition-all duration-150"
            >
              {/* Item label */}
              <div
                className="font-mono text-xs w-6 text-right shrink-0"
                style={{ color: colors.text }}
              >
                {item.id}
              </div>

              {/* Bar track */}
              <div className="flex-1 relative h-7 bg-bg-elevated border border-border rounded overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded transition-all duration-200"
                  style={{
                    width: `${barWidthPct}%`,
                    backgroundColor: colors.border,
                    opacity: state === 'excluded' ? 0.2 : 0.3,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <span className="font-mono text-xs" style={{ color: colors.text }}>
                    v:{item.value} w:{item.weight}
                  </span>
                  <span className="font-mono text-[9px] text-tx-muted">
                    r:{item.ratio.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* State badge */}
              <div
                className="w-16 shrink-0 text-center font-mono text-[10px] py-0.5 rounded border transition-all duration-150"
                style={{
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.bg,
                }}
              >
                {state}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
