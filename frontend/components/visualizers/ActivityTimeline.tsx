'use client'

import { useMemo } from 'react'
import type { ActivityStep, Activity } from '@/lib/types'

type Props = {
  steps: ActivityStep[]
  currentStep: number
  activities?: Activity[]
  height?: number
}

const DEFAULT_ACTIVITIES: Activity[] = [
  { id: 0, name: 'A', start: 1, end: 4 },
  { id: 1, name: 'B', start: 3, end: 5 },
  { id: 2, name: 'C', start: 0, end: 6 },
  { id: 3, name: 'D', start: 5, end: 7 },
  { id: 4, name: 'E', start: 3, end: 9 },
  { id: 5, name: 'F', start: 5, end: 9 },
  { id: 6, name: 'G', start: 6, end: 10 },
  { id: 7, name: 'H', start: 8, end: 11 },
]

const ACTIVITY_COLORS: Record<string, string> = {
  normal: '#1e2236',
  considering: '#f59e0b',
  selected: '#10b981',
  rejected: '#374151',
}

const ACTIVITY_BORDER: Record<string, string> = {
  normal: '#252a3e',
  considering: '#f59e0b80',
  selected: '#10b98180',
  rejected: '#37415140',
}

const ACTIVITY_TEXT: Record<string, string> = {
  normal: '#4a5568',
  considering: '#f59e0b',
  selected: '#10b981',
  rejected: '#374151',
}

export default function ActivityTimeline({
  steps,
  currentStep,
  activities = DEFAULT_ACTIVITIES,
  height = 300,
}: Props) {
  const step = steps[currentStep] as ActivityStep | undefined

  const activityStates = useMemo(() => {
    const states: Record<number, 'normal' | 'considering' | 'selected' | 'rejected'> = {}
    activities.forEach(a => { states[a.id] = 'normal' })

    for (let i = 0; i <= currentStep && i < steps.length; i++) {
      const s = steps[i] as ActivityStep
      if (!s) continue
      if (s.op === 'consider') states[s.activity_id] = 'considering'
      else if (s.op === 'select') states[s.activity_id] = 'selected'
      else if (s.op === 'reject') states[s.activity_id] = 'rejected'
    }

    return states
  }, [steps, currentStep, activities])

  const maxTime = Math.max(...activities.map(a => a.end), 1)
  const BAR_H = 26
  const LABEL_W = 32
  const PADDING = 12

  const selectedCount = Object.values(activityStates).filter(s => s === 'selected').length

  return (
    <div className="flex flex-col gap-3" style={{ height }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        {step && (
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {step.op}
          </span>
        )}
        {step?.activity_id !== undefined && (
          <span className="font-mono text-xs text-tx-muted">
            activity: <span className="text-tx-secondary">{activities[step.activity_id]?.name ?? step.activity_id}</span>
          </span>
        )}
        <div className="ml-auto font-mono text-xs text-emerald-400">
          Selected: {selectedCount}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: 400 }}>
          {/* Time axis */}
          <div
            className="flex mb-1"
            style={{ paddingLeft: LABEL_W + PADDING }}
          >
            {Array.from({ length: maxTime + 1 }, (_, t) => (
              <div
                key={t}
                className="font-mono text-[9px] text-tx-muted"
                style={{ width: `${100 / maxTime}%`, textAlign: 'left' }}
              >
                {t}
              </div>
            ))}
          </div>

          {/* Grid lines + bars */}
          <div className="relative">
            {/* Vertical grid lines */}
            <div
              className="absolute inset-0 flex pointer-events-none"
              style={{ paddingLeft: LABEL_W + PADDING }}
            >
              {Array.from({ length: maxTime + 1 }, (_, t) => (
                <div
                  key={t}
                  className="border-l border-border-subtle h-full"
                  style={{ width: `${100 / maxTime}%` }}
                />
              ))}
            </div>

            {/* Activity bars */}
            {activities.map(activity => {
              const state = activityStates[activity.id] ?? 'normal'
              const leftPct = (activity.start / maxTime) * 100
              const widthPct = ((activity.end - activity.start) / maxTime) * 100
              const isActive = step?.activity_id === activity.id

              return (
                <div
                  key={activity.id}
                  className="flex items-center mb-1"
                  style={{ height: BAR_H }}
                >
                  {/* Label */}
                  <div
                    className="font-mono text-xs shrink-0 text-right pr-2"
                    style={{
                      width: LABEL_W,
                      color: ACTIVITY_TEXT[state],
                    }}
                  >
                    {activity.name}
                  </div>

                  {/* Track */}
                  <div
                    className="flex-1 relative rounded-sm overflow-hidden"
                    style={{
                      height: BAR_H - 4,
                      marginLeft: PADDING,
                    }}
                  >
                    {/* Bar */}
                    <div
                      className="absolute top-0 rounded transition-all duration-200 flex items-center px-2"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        height: '100%',
                        backgroundColor: ACTIVITY_COLORS[state],
                        border: `1px solid ${ACTIVITY_BORDER[state]}`,
                        opacity: state === 'rejected' ? 0.4 : 1,
                        boxShadow: isActive ? `0 0 8px ${ACTIVITY_COLORS[state]}60` : undefined,
                      }}
                    >
                      <span
                        className="font-mono text-[9px] truncate"
                        style={{ color: ACTIVITY_TEXT[state] }}
                      >
                        {activity.start}–{activity.end}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 shrink-0">
        {[
          { color: '#f59e0b', label: 'considering' },
          { color: '#10b981', label: 'selected' },
          { color: '#374151', label: 'rejected' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-[2px]" style={{ backgroundColor: color }} />
            <span className="font-mono text-[9px] text-tx-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
