import { VERDICT_COLORS } from '@/lib/constants'
import { normalizeComplexityLabel } from '@/lib/complexityUtils'
import type { LieDetectorResult } from '@/lib/types'

interface LieDetectorBadgeProps {
  result: LieDetectorResult
  expectedOperations?: number
  actualOperations?: number
}

const VERDICT_LABELS: Record<string, string> = {
  MATCH: 'MATCH',
  WORSE_THAN_CLAIMED: 'WORSE THAN CLAIMED',
  BETTER_THAN_CLAIMED: 'BETTER THAN CLAIMED',
  UNVERIFIABLE: '? UNVERIFIABLE',
}

export function LieDetectorBadge({
  result,
  expectedOperations,
  actualOperations,
}: LieDetectorBadgeProps) {
  const color = VERDICT_COLORS[result.verdict] || '#4a5568'
  const label = VERDICT_LABELS[result.verdict] || result.verdict
  const claimed = normalizeComplexityLabel(result.claimed)
  const measured = normalizeComplexityLabel(result.measured)

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-tx-primary">Lie Detector</h3>
        <span
          className="px-3 py-1 text-xs font-semibold font-mono rounded"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-tx-muted mb-1">Claimed</p>
          <p className="font-mono text-tx-primary">{claimed}</p>
        </div>
        <div>
          <p className="text-xs text-tx-muted mb-1">Measured</p>
          <p className="font-mono text-tx-primary">{measured}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
        <div>
          <p className="text-xs text-tx-muted mb-1">Fit Confidence</p>
          <p className="font-mono text-tx-primary">R^2 {result.r_squared.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-xs text-tx-muted mb-1">Verdict</p>
          <p className="font-mono" style={{ color }}>{label}</p>
        </div>
      </div>

      {expectedOperations !== undefined && actualOperations !== undefined && (
        <div className="grid grid-cols-2 gap-4 text-sm mt-4 border-t border-border-subtle pt-3">
          <div>
            <p className="text-xs text-tx-muted mb-1">Expected Ops</p>
            <p className="font-mono text-tx-primary">{expectedOperations}</p>
          </div>
          <div>
            <p className="text-xs text-tx-muted mb-1">Actual Ops</p>
            <p className="font-mono text-tx-primary">{actualOperations}</p>
          </div>
        </div>
      )}

      {result.explanation && (
        <p className="mt-4 text-xs text-tx-secondary leading-relaxed border-t border-border-subtle pt-3">
          {result.explanation}
        </p>
      )}
    </div>
  )
}
