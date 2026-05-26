import { COMPLEXITY_COLORS } from '@/lib/constants'
import { normalizeComplexityLabel } from '@/lib/complexityUtils'

interface ComplexityBadgeProps {
  label: string
  rSquared?: number
}

export function ComplexityBadge({ label, rSquared }: ComplexityBadgeProps) {
  const normalizedLabel = normalizeComplexityLabel(label)
  const color = COMPLEXITY_COLORS[normalizedLabel] || '#4a5568'

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="px-3 py-1.5 text-sm font-mono font-medium rounded"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {normalizedLabel}
      </span>
      {rSquared !== undefined && (
        <span className="text-xs text-tx-muted font-mono">
          R^2 = {rSquared.toFixed(4)}
        </span>
      )}
    </div>
  )
}
