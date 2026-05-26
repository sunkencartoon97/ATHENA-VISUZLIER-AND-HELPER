'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
} from 'recharts'
import type { ComplexityPoint } from '@/lib/types'
import { COMPLEXITY_COLORS } from '@/lib/constants'

type Props = {
  dataPoints: ComplexityPoint[]
  complexity: string
  recurrence?: string
  className?: string
}

// Generate curve data for comparison lines
function genCurveData(maxN: number) {
  const steps = 20
  const points = []
  for (let i = 1; i <= steps; i++) {
    const n = Math.round((maxN / steps) * i)
    points.push({
      n,
      'O(1)': 1,
      'O(log n)': Math.log2(n),
      'O(n)': n,
      'O(n log n)': n * Math.log2(n),
      'O(n²)': n * n,
    })
  }
  return points
}

// Imported COMPLEXITY_COLORS from constants

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="panel px-3 py-2 text-xs">
      <p className="font-mono text-tx-secondary mb-1">n = {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function ComplexityChart({
  dataPoints,
  complexity,
  recurrence,
  className = '',
}: Props) {
  const maxN = dataPoints.length > 0 ? Math.max(...dataPoints.map(d => d.n)) : 100
  const curveData = genCurveData(maxN)

  // Normalize data for display — scale actual data to curve magnitude
  const maxActual = dataPoints.length > 0 ? Math.max(...dataPoints.map(d => d.time_ms)) : 1

  // Scale actual data to the highlighted complexity curve at maxN, not always O(n)
  function curveValueAtN(label: string, n: number): number {
    switch (label) {
      case 'O(1)':       return 1
      case 'O(log n)':   return Math.log2(n)
      case 'O(n)':       return n
      case 'O(n log n)': return n * Math.log2(n)
      case 'O(n²)':      return n * n
      default:           return n
    }
  }
  const maxCurve = curveValueAtN(complexity, maxN)
  const scaleFactor = maxActual > 0 ? maxCurve / maxActual : 1

  const scatterData = dataPoints.map(d => ({
    n: d.n,
    actual: d.time_ms * scaleFactor,
  }))

  const highlightedComplexity = complexity

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Badge row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-tx-muted">Best fit:</span>
          <span className="badge-cyan font-mono">{complexity}</span>
        </div>
        {recurrence && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-tx-muted">Recurrence:</span>
            <span className="badge-blue font-mono text-xs">{recurrence}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curveData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, rgba(255,255,255,0.1))" />
            <XAxis
              dataKey="n"
              tick={{ fill: 'var(--tx-muted, #94a3b8)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              label={{ value: 'n', position: 'insideRight', fill: 'var(--tx-muted, #94a3b8)', fontSize: 10 }}
              stroke="var(--border, rgba(255,255,255,0.2))"
            />
            <YAxis
              tick={{ fill: 'var(--tx-muted, #94a3b8)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              stroke="var(--border, rgba(255,255,255,0.2))"
              width={32}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
            <Legend
              wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--tx-muted, #94a3b8)' }}
            />

            {/* Reference curves */}
            {Object.entries(COMPLEXITY_COLORS).map(([key, color]) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={key === highlightedComplexity ? 2 : 1}
                dot={false}
                strokeOpacity={key === highlightedComplexity ? 1 : 0.3}
                strokeDasharray={key === highlightedComplexity ? undefined : '4 4'}
              />
            ))}

            {/* Actual data points */}
            {scatterData.length > 0 && (
              <Scatter
                data={scatterData}
                dataKey="actual"
                fill="#f59e0b"
                opacity={0.8}
                name="measured"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {dataPoints.length === 0 && (
        <p className="text-center text-xs text-tx-muted mt-2">
          Run complexity analysis to plot data points
        </p>
      )}
    </div>
  )
}
