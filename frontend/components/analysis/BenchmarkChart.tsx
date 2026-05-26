'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { normalizeComplexityLabel, scaleCurveToData } from '@/lib/complexityUtils'

interface BenchmarkChartProps {
  dataPoints: { n: number; time_ms: number }[]
  claimedComplexity?: string | null
  measuredComplexity?: string | null
  title?: string
}

export function BenchmarkChart({
  dataPoints,
  claimedComplexity,
  measuredComplexity,
  title = 'Performance Curve',
}: BenchmarkChartProps) {
  const claimedCurve = scaleCurveToData(dataPoints, claimedComplexity)
  const measuredCurve = scaleCurveToData(dataPoints, measuredComplexity)

  const chartData = dataPoints.map((point, index) => ({
    n: point.n,
    measured_ms: point.time_ms,
    claimed_curve: claimedCurve[index]?.value,
    measured_curve: measuredCurve[index]?.value,
  }))

  const showClaimed =
    claimedComplexity &&
    normalizeComplexityLabel(claimedComplexity) !== normalizeComplexityLabel(measuredComplexity)

  return (
    <div className="bg-bg-base rounded-lg border border-border-subtle p-5">
      <h3 className="text-[10px] text-tx-muted uppercase tracking-wider mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2236" />
          <XAxis
            dataKey="n"
            stroke="#4a5568"
            tick={{ fill: '#4a5568', fontSize: 11 }}
            tickLine={{ stroke: '#1e2236' }}
            axisLine={{ stroke: '#1e2236' }}
            label={{ value: 'n (input size)', position: 'insideBottom', offset: -10, fill: '#4a5568', fontSize: 10 }}
          />
          <YAxis
            stroke="#4a5568"
            tick={{ fill: '#4a5568', fontSize: 11 }}
            tickLine={{ stroke: '#1e2236' }}
            axisLine={{ stroke: '#1e2236' }}
            tickFormatter={(value) => `${value.toFixed(1)}ms`}
            label={{ value: 'time (ms)', angle: -90, position: 'insideLeft', fill: '#4a5568', fontSize: 10 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0d0f1a',
              border: '1px solid #1e2236',
              borderRadius: '6px',
              fontSize: 12,
            }}
            labelStyle={{ color: '#4a5568' }}
            formatter={(value: number, name: string) => [`${value.toFixed(2)}ms`, name]}
            labelFormatter={(label) => `n = ${label}`}
          />

          {showClaimed && (
            <Line
              type="monotone"
              dataKey="claimed_curve"
              name={`claimed ${normalizeComplexityLabel(claimedComplexity)}`}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
            />
          )}

          {measuredComplexity && (
            <Line
              type="monotone"
              dataKey="measured_curve"
              name={`fit ${normalizeComplexityLabel(measuredComplexity)}`}
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
            />
          )}

          <Line
            type="monotone"
            dataKey="measured_ms"
            name="measured data"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
            activeDot={{ fill: '#60a5fa', strokeWidth: 0, r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
