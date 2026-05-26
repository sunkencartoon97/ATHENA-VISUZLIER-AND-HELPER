'use client'

import { useMemo } from 'react'
import type { HashStep } from '@/lib/types'

type Props = {
  steps: HashStep[]
  currentStep: number
  bucketCount?: number
  mode?: 'chaining' | 'open'
  height?: number
}

type BucketEntry = {
  key: number | string
  state: 'normal' | 'collision' | 'probe' | 'inserted'
}

type BucketState = {
  entries: BucketEntry[]
  state: 'normal' | 'collision' | 'probe' | 'inserted' | 'empty'
}

export default function HashVisualizer({
  steps,
  currentStep,
  bucketCount = 8,
  mode = 'open',
  height = 300,
}: Props) {
  const { buckets, activeKey, activeOp, probePath, insertedKeys } = useMemo(() => {
    const buckets: BucketState[] = Array.from({ length: bucketCount }, () => ({
      entries: [],
      state: 'empty',
    }))
    let activeKey: number | string | undefined
    let activeOp = ''
    const probePath: number[] = []
    let probing = false
    const insertedKeys: Record<number, number | string> = {}

    for (let i = 0; i <= currentStep && i < steps.length; i++) {
      const s = steps[i] as HashStep
      if (!s) continue

      activeKey = s.key
      activeOp = s.op

      if (s.op === 'hash') {
        // Reset probe path on new hash
        probePath.length = 0
        probing = true
        if (s.bucket < bucketCount) {
          buckets[s.bucket].state = 'probe'
          probePath.push(s.bucket)
        }
      } else if (s.op === 'collision') {
        if (s.bucket < bucketCount) {
          buckets[s.bucket].state = 'collision'
        }
      } else if (s.op === 'probe') {
        if (s.new_bucket !== undefined && s.new_bucket < bucketCount) {
          buckets[s.new_bucket].state = 'probe'
          probePath.push(s.new_bucket)
        }
      } else if (s.op === 'insert') {
        if (s.bucket < bucketCount) {
          // Reset all probe states
          buckets.forEach(b => {
            if (b.state === 'probe') b.state = 'empty'
          })
          if (mode === 'chaining') {
            buckets[s.bucket].entries.push({ key: s.key, state: 'inserted' })
          }
          insertedKeys[s.bucket] = s.key
          buckets[s.bucket].state = 'inserted'
          probing = false
        }
      }
    }

    return { buckets, activeKey, activeOp, probePath, insertedKeys }
  }, [steps, currentStep, bucketCount, mode])

  const step = steps[currentStep] as HashStep | undefined

  const STATE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    empty: { bg: '#0d0f1a', border: '#1e2236', text: '#374151' },
    probe: { bg: '#f59e0b10', border: '#f59e0b', text: '#f59e0b' },
    collision: { bg: '#ef444415', border: '#ef4444', text: '#ef4444' },
    inserted: { bg: '#10b98115', border: '#10b981', text: '#10b981' },
    normal: { bg: '#1e223640', border: '#252a3e', text: '#8892a4' },
  }

  const BUCKET_H = 36
  const totalH = bucketCount * (BUCKET_H + 4)

  return (
    <div className="flex flex-col gap-3" style={{ height }}>
      {/* Op header */}
      <div className="flex items-center gap-3">
        {step && (
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {activeOp}
          </span>
        )}
        {activeKey !== undefined && (
          <span className="font-mono text-xs text-tx-secondary">
            key: <span className="text-accent-cyan">{activeKey}</span>
          </span>
        )}
        {step?.bucket !== undefined && (
          <span className="font-mono text-xs text-tx-muted">
            bucket: {step.bucket}
          </span>
        )}
      </div>

      {/* Hash function visualization */}
      {activeKey !== undefined && step?.bucket !== undefined && (
        <div className="flex items-center gap-2 font-mono text-xs text-tx-muted bg-bg-elevated border border-border px-3 py-2 rounded">
          <span className="text-tx-secondary">h({activeKey})</span>
          <span>= {activeKey} mod {bucketCount}</span>
          <span className="text-tx-muted">=</span>
          <span className="text-amber-400">{step.bucket}</span>
        </div>
      )}

      {/* Buckets */}
      <div className="flex-1 overflow-auto">
        <div className="flex gap-6">
          {/* Bucket array */}
          <div className="flex flex-col gap-1">
            {buckets.map((bucket, i) => {
              const colors = STATE_COLORS[bucket.state] ?? STATE_COLORS.empty
              const isInProbePath = probePath.includes(i)

              return (
                <div
                  key={i}
                  className="flex items-center gap-2"
                  style={{ height: BUCKET_H }}
                >
                  {/* Index */}
                  <div className="w-5 text-right font-mono text-xs text-tx-muted shrink-0">
                    {i}
                  </div>

                  {/* Slot */}
                  <div
                    className="transition-all duration-200 rounded flex items-center justify-center"
                    style={{
                      width: 120,
                      height: BUCKET_H - 4,
                      backgroundColor: colors.bg,
                      border: `1.5px solid ${colors.border}`,
                      boxShadow: bucket.state !== 'empty' && bucket.state !== 'normal'
                        ? `0 0 8px ${colors.border}40`
                        : undefined,
                    }}
                  >
                    {mode === 'open' ? (
                      <span
                        className="font-mono text-xs"
                        style={{ color: colors.text }}
                      >
                        {bucket.state === 'inserted' || bucket.state === 'normal'
                          ? (insertedKeys[i] ?? '—')
                          : bucket.state === 'empty' ? '—' : '?'}
                      </span>
                    ) : (
                      /* Chaining: show list */
                      <div className="flex items-center gap-1 px-2 w-full overflow-hidden">
                        {bucket.entries.length === 0 ? (
                          <span className="font-mono text-xs text-tx-muted">null</span>
                        ) : (
                          bucket.entries.map((entry, j) => (
                            <div key={j} className="flex items-center gap-1">
                              <span
                                className="font-mono text-xs px-1.5 py-0.5 rounded border"
                                style={{
                                  borderColor: STATE_COLORS[entry.state]?.border ?? '#252a3e',
                                  color: STATE_COLORS[entry.state]?.text ?? '#8892a4',
                                  backgroundColor: STATE_COLORS[entry.state]?.bg ?? '#1e2236',
                                }}
                              >
                                {entry.key}
                              </span>
                              {j < bucket.entries.length - 1 && (
                                <span className="text-tx-muted text-xs">→</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Probe indicator */}
                  {isInProbePath && (
                    <div className="font-mono text-[9px] text-amber-400">
                      ← {probePath.indexOf(i) === 0 ? 'hash' : `probe ${probePath.indexOf(i)}`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 shrink-0">
        {[
          { color: '#f59e0b', label: 'probing' },
          { color: '#ef4444', label: 'collision' },
          { color: '#10b981', label: 'inserted' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border" style={{ borderColor: color, backgroundColor: `${color}15` }} />
            <span className="font-mono text-[9px] text-tx-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
