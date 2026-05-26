'use client'

import { useMemo } from 'react'
import type { StringStep } from '@/lib/types'

type Props = {
  steps: StringStep[]
  currentStep: number
  text?: string
  pattern?: string
  height?: number
}

type CharState = 'normal' | 'match' | 'mismatch' | 'current' | 'found' | 'gap'

const STATE_COLORS: Record<CharState, { bg: string; border: string; text: string }> = {
  normal:   { bg: '#0d0f1a', border: '#1e2236', text: '#4a5568' },
  match:    { bg: '#10b98120', border: '#10b981', text: '#10b981' },
  mismatch: { bg: '#ef444420', border: '#ef4444', text: '#ef4444' },
  current:  { bg: '#f59e0b15', border: '#f59e0b', text: '#f59e0b' },
  found:    { bg: '#10b98130', border: '#10b981', text: '#e2e8f0' },
  gap:      { bg: '#f59e0b20', border: '#f59e0b', text: '#f59e0b' },
}

export default function StringMatcher({
  steps,
  currentStep,
  text = 'ABABCABAB',
  pattern = 'ABAB',
  height = 280,
}: Props) {
  const step = steps[currentStep] as StringStep | undefined

  const { textStates, patternOffset, foundPositions } = useMemo(() => {
    const textStates: CharState[] = Array(text.length).fill('normal')
    let patternOffset = 0
    const foundPositions: number[] = []

    for (let i = 0; i <= currentStep && i < steps.length; i++) {
      const s = steps[i] as StringStep
      if (!s) continue

      if (s.op === 'compare_char') {
        if (s.text_idx !== undefined) {
          textStates[s.text_idx] = s.match ? 'match' : 'current'
        }
        if (s.pattern_idx !== undefined) {
          patternOffset = (s.text_idx ?? 0) - (s.pattern_idx ?? 0)
        }
      } else if (s.op === 'mismatch') {
        if (s.text_idx !== undefined) {
          textStates[s.text_idx] = 'mismatch'
        }
      } else if (s.op === 'found') {
        if (s.position !== undefined) {
          foundPositions.push(s.position)
          for (let j = s.position; j < s.position + pattern.length; j++) {
            if (j < text.length) textStates[j] = 'found'
          }
        }
      } else if (s.op === 'shift') {
        // Reset previous matches on shift
        patternOffset = s.text_idx ?? patternOffset

        const shiftGapPos = (s as any).vars?.removed_char ? (s.text_idx ?? -1) : -1
        if (shiftGapPos >= 0 && shiftGapPos < textStates.length) {
          textStates[shiftGapPos] = 'gap'
        }
      }
    }

    return { textStates, patternOffset, foundPositions }
  }, [steps, currentStep, text, pattern])

  const CHAR_SIZE = 32

  // KMP failure function display

  return (
    <div className="flex flex-col gap-4" style={{ height }}>
      {/* Op label */}
      {step && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {step.op}
          </span>
          {step.text_idx !== undefined && (
            <span className="font-mono text-xs text-tx-muted">
              text[{step.text_idx}]
              {step.pattern_idx !== undefined && ` vs pattern[${step.pattern_idx}]`}
            </span>
          )}
          {step.op === 'found' && (
            <span className="text-xs text-emerald-400 font-medium">
              Match found at position {step.position}!
            </span>
          )}
          {step.hash_value !== undefined && (
            <span className="font-mono text-xs text-cyan-400">hash={step.hash_value}</span>
          )}
        </div>
      )}

      {/* Text row */}
      <div className="flex flex-col gap-1">
        <div className="font-mono text-xs text-tx-muted mb-1">text</div>
        <div className="flex gap-1 flex-wrap">
          {text.split('').map((ch, i) => {
            const state = textStates[i]
            const colors = STATE_COLORS[state]
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-0.5 transition-all duration-150"
              >
                <div
                  className="flex items-center justify-center rounded font-mono font-medium text-sm transition-all duration-150"
                  style={{
                    width: CHAR_SIZE,
                    height: CHAR_SIZE,
                    backgroundColor: colors.bg,
                    border: `1.5px solid ${colors.border}`,
                    color: colors.text,
                    boxShadow: state !== 'normal' ? `0 0 8px ${colors.border}40` : undefined,
                  }}
                >
                  {ch}
                </div>
                <span className="font-mono text-[9px] text-tx-muted">{i}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pattern row - positioned under text with offset */}
      <div className="flex flex-col gap-1">
        <div className="font-mono text-xs text-tx-muted mb-1">
          pattern <span className="text-accent-cyan ml-1">offset:{patternOffset}</span>
        </div>
        <div
          className="flex gap-1"
          style={{ paddingLeft: patternOffset * (CHAR_SIZE + 4) }}
        >
          {pattern.split('').map((ch, i) => {
            const textIdx = patternOffset + i
            const isActive = step?.pattern_idx === i
            const isMatch = textStates[textIdx] === 'match' || textStates[textIdx] === 'found'
            const isMismatch = textStates[textIdx] === 'mismatch'

            const state: CharState = isActive
              ? 'current'
              : isMismatch
              ? 'mismatch'
              : isMatch
              ? 'match'
              : 'normal'

            const colors = STATE_COLORS[state]

            return (
              <div
                key={i}
                className="flex flex-col items-center gap-0.5 transition-all duration-150"
              >
                <div
                  className="flex items-center justify-center rounded font-mono font-medium text-sm transition-all duration-150"
                  style={{
                    width: CHAR_SIZE,
                    height: CHAR_SIZE,
                    backgroundColor: colors.bg,
                    border: `1.5px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {ch}
                </div>
                <span className="font-mono text-[9px] text-tx-muted">{i}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Found positions */}
      {foundPositions.length > 0 && (
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-tx-muted">Found at:</span>
          {foundPositions.map(p => (
            <span key={p} className="badge-green">{p}</span>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-auto">
        {[
          { color: '#10b981', label: 'match' },
          { color: '#ef4444', label: 'mismatch' },
          { color: '#f59e0b', label: 'current' },
          { color: '#f59e0b', label: 'gap' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border" style={{ borderColor: color, backgroundColor: `${color}20` }} />
            <span className="font-mono text-[9px] text-tx-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
