'use client'

import type { PropagationStep } from '@/lib/types'

interface PropagationChainProps {
  steps: PropagationStep[]
  firstErrorStep?: number
}

export function PropagationChain({ steps, firstErrorStep }: PropagationChainProps) {
  if (steps.length === 0) {
    return (
      <div className="panel p-6 flex items-center justify-center">
        <p className="text-sm text-tx-muted">No propagation data available.</p>
      </div>
    )
  }

  const flat = steps.flatMap((s) => [...(s.correct_state || []), ...(s.buggy_state || [])])
  const maxVal = flat.length > 0 ? Math.max(...flat, 1) : 1

  return (
    <div className="flex flex-col gap-3">
      {firstErrorStep !== undefined && (
        <div className="panel p-2.5 border-status-error/30 bg-status-error/5">
          <p className="text-xs text-status-error font-mono">
            First divergence at step {firstErrorStep}
          </p>
        </div>
      )}
      {steps.map((step, i) => (
        <div
          key={step.step_id}
          className={`panel p-4 ${
            firstErrorStep !== undefined && step.step_id >= firstErrorStep
              ? 'border-status-error/20'
              : ''
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-tx-primary">Step {step.step_id}</span>
            <span className="badge-gray font-mono">{step.op}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Correct state */}
            <div>
              <p className="text-xs text-status-success mb-2">Correct</p>
              <div className="flex items-end gap-0.5 h-10">
                {step.correct_state?.map((v, j) => (
                  <div
                    key={j}
                    className="flex-1 bg-status-success/60 rounded-t"
                    style={{ height: `${(v / maxVal) * 40}px`, minHeight: 2 }}
                  />
                ))}
              </div>
            </div>

            {/* Buggy state */}
            <div>
              <p className="text-xs text-status-error mb-2">Buggy</p>
              <div className="flex items-end gap-0.5 h-10">
                {step.buggy_state?.map((v, j) => {
                  const isDiff =
                    step.correct_state && step.correct_state[j] !== v
                  return (
                    <div
                      key={j}
                      className={`flex-1 rounded-t ${
                        isDiff ? 'bg-status-error' : 'bg-accent-blue/50'
                      }`}
                      style={{ height: `${(v / maxVal) * 40}px`, minHeight: 2 }}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          {i < steps.length - 1 && (
            <div className="flex justify-center mt-3">
              <span className="text-tx-muted text-xs">↓</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
