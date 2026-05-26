const NORMALIZED_LABELS: Array<[RegExp, string]> = [
  [/^o\(1\)$/i, 'O(1)'],
  [/^o\(log\s*n\)$/i, 'O(log n)'],
  [/^o\(n\)$/i, 'O(n)'],
  [/^o\(n\s*log\s*n\)$/i, 'O(n log n)'],
  [/^o\(n(?:\^2|²)\)$/i, 'O(n^2)'],
  [/^o\(n(?:\^3|³)\)$/i, 'O(n^3)'],
  [/^o\(2(?:\^n|ⁿ)\)$/i, 'O(2^n)'],
  [/^o\(n!\)$/i, 'O(n!)'],
]

export function normalizeComplexityLabel(label?: string | null): string {
  if (!label) return 'UNVERIFIABLE'

  const cleaned = label
    .replace(/Ãƒâ€šÃ‚Â²|Ã‚Â²|Â²/g, '²')
    .replace(/Ãƒâ€šÃ‚Â³|Ã‚Â³|Â³/g, '³')
    .replace(/2Ã¢ÂÂ¿|2â¿/g, '2ⁿ')
    .replace(/RÃ‚Â²|RÂ²/g, 'R^2')
    .replace(/\s+/g, ' ')
    .trim()

  for (const [pattern, normalized] of NORMALIZED_LABELS) {
    if (pattern.test(cleaned)) return normalized
  }

  return cleaned
}

export function getComplexityCurveValue(label: string, n: number): number {
  const normalized = normalizeComplexityLabel(label)
  const safeN = Math.max(n, 1)

  switch (normalized) {
    case 'O(1)':
      return 1
    case 'O(log n)':
      return Math.log2(Math.max(safeN, 2))
    case 'O(n)':
      return safeN
    case 'O(n log n)':
      return safeN * Math.log2(Math.max(safeN, 2))
    case 'O(n^2)':
      return safeN * safeN
    case 'O(n^3)':
      return safeN * safeN * safeN
    case 'O(2^n)':
      return Math.pow(2, Math.min(safeN, 20))
    case 'O(n!)': {
      let total = 1
      for (let i = 2; i <= Math.min(safeN, 12); i += 1) total *= i
      return total
    }
    default:
      return safeN
  }
}

export function scaleCurveToData(
  points: Array<{ n: number; time_ms: number }>,
  label?: string | null,
): Array<{ n: number; value: number }> {
  if (!label || points.length === 0) return []

  const curve = points.map((point) => ({
    n: point.n,
    raw: getComplexityCurveValue(label, point.n),
  }))

  const maxActual = Math.max(...points.map((point) => point.time_ms), 1)
  const maxCurve = Math.max(...curve.map((point) => point.raw), 1)
  const scale = maxActual / maxCurve

  return curve.map((point) => ({
    n: point.n,
    value: point.raw * scale,
  }))
}
