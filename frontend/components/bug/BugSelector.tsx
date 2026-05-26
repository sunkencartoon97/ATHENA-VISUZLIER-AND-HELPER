'use client'

import { BUG_VARIANTS } from '@/lib/algorithms'

interface BugSelectorProps {
  algo: string
  value: string
  onChange: (bugId: string) => void
  disabled?: boolean
}

export function BugSelector({ algo, value, onChange, disabled }: BugSelectorProps) {
  const bugs = BUG_VARIANTS[algo] || []
  const hasNoBugs = bugs.length === 0

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-tx-secondary">Bug Variant</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || hasNoBugs}
        className="input text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {hasNoBugs ? (
          <option value="">No bugs for this algorithm</option>
        ) : (
          bugs.map((bugId) => (
            <option key={bugId} value={bugId}>
              {bugId.replace(/_/g, ' ')}
            </option>
          ))
        )}
      </select>
      {hasNoBugs && (
        <p className="text-[10px] text-tx-muted">
          Only quicksort and mergesort support bug injection.
        </p>
      )}
    </div>
  )
}
