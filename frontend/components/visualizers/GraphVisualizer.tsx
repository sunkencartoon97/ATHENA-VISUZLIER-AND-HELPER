'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GraphStep } from '@/lib/types'

type Props = {
  steps: GraphStep[]
  currentStep: number
  algoId?: string
  nodeCount?: number
  edges?: Array<{ from: number; to: number; weight?: number }>
  directed?: boolean
  height?: number
}

type GraphEdge = { from: number; to: number; weight?: number; synthetic?: boolean }
type GraphPoint = { x: number; y: number }

function numVar(
  vars: Record<string, string> | undefined,
  keys: string[],
  fallback?: number,
): number | undefined {
  if (vars) {
    for (const k of keys) {
      const v = vars[k]
      if (v != null) {
        const n = Number(v)
        if (!Number.isNaN(n)) return n
      }
    }
  }
  return fallback
}

function getNodeFromStep(step: any): number | undefined {
  const v = step?.vars as Record<string, string> | undefined
  return numVar(v, ['visiting', 'node', 'u', 'v', 'source', 'current', 'neighbor', 'parent'], step?.node)
}

function getFromStep(step: any): number | undefined {
  const v = step?.vars as Record<string, string> | undefined
  return numVar(v, ['from', 'u', 'current', 'node'], step?.from)
}

function getToStep(step: any): number | undefined {
  const v = step?.vars as Record<string, string> | undefined
  return numVar(v, ['to', 'v', 'neighbor', 'next', 'target'], step?.to)
}

function buildCircularLayout(count: number, width: number, height: number, padding = 38) {
  const cx = width / 2
  const cy = height / 2
  const radius = Math.max(24, Math.min(width, height) / 2 - padding)
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(count, 1) - Math.PI / 2
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  })
}

function edgeKey(from: number, to: number, directed: boolean) {
  if (directed) return `${from}->${to}`
  return `${Math.min(from, to)}-${Math.max(from, to)}`
}

export default function GraphVisualizer({
  steps,
  currentStep,
  algoId,
  nodeCount = 7,
  edges,
  directed = false,
  height = 380,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const step = steps[currentStep] as GraphStep | undefined

  const { nodeStates, edgeStates, distances } = useMemo(() => {
    const ns: Record<number, 'unvisited' | 'enqueued' | 'visited' | 'current' | 'finalized'> = {}
    const es: Record<string, 'normal' | 'selected' | 'relaxing'> = {}
    const d: Record<number, number> = {}

    for (let i = 0; i <= currentStep && i < steps.length; i++) {
      const s: any = steps[i]
      if (!s) continue

      const node = getNodeFromStep(s)
      const from = getFromStep(s)
      const to = getToStep(s)
      const dist = numVar(s?.vars as Record<string, string> | undefined, ['dist', 'distance', 'path_len'], s?.distance)

      if (s.op === 'visit_node') {
        if (node != null) {
          ns[node] = 'visited'
          if (dist != null) d[node] = dist
        }
      } else if (s.op === 'enqueue') {
        if (node != null && ns[node] !== 'finalized') {
          ns[node] = 'enqueued'
          if (dist != null) d[node] = dist
        }
      } else if (s.op === 'finalize_node') {
        if (node != null) ns[node] = 'finalized'
      } else if (s.op === 'relax_edge') {
        if (from != null && to != null) es[edgeKey(from, to, directed)] = 'relaxing'
        if (node != null && ns[node] !== 'finalized') ns[node] = 'current'
      } else if (s.op === 'explore_edge' || s.op === 'consider_neighbor') {
        if (from != null && to != null) es[edgeKey(from, to, directed)] = 'selected'
        if (node != null && ns[node] !== 'finalized') ns[node] = 'current'
      }
    }

    return { nodeStates: ns, edgeStates: es, distances: d }
  }, [steps, currentStep, directed])

  const { derivedNodeCount, graphEdges } = useMemo(() => {
    if (edges) return { derivedNodeCount: nodeCount, graphEdges: edges as GraphEdge[] }

    let maxNode = nodeCount - 1
    const map = new Map<string, GraphEdge>()

    for (const sAny of steps as any[]) {
      const node = getNodeFromStep(sAny)
      const from = getFromStep(sAny)
      const to = getToStep(sAny)
      const w = numVar(sAny?.vars as Record<string, string> | undefined, ['weight', 'dist', 'path_len'])

      if (node != null) maxNode = Math.max(maxNode, node)
      if (from != null) maxNode = Math.max(maxNode, from)
      if (to != null) maxNode = Math.max(maxNode, to)

      if (from != null && to != null) {
        const k = edgeKey(from, to, directed)
        if (!map.has(k)) map.set(k, { from, to, weight: w })
      }
    }

    const derived = Math.max(1, maxNode + 1)
    if (map.size > 0) {
      const baseEdges = Array.from(map.values())

      // If some nodes never appear in edge relations, add subtle scaffold edges so
      // the canvas doesn't look visually broken with isolated nodes.
      const degree = Array.from({ length: derived }, () => 0)
      for (const e of baseEdges) {
        degree[e.from] += 1
        degree[e.to] += 1
      }

      const patched: GraphEdge[] = [...baseEdges]
      for (let i = 0; i < derived; i++) {
        if (degree[i] !== 0) continue
        const j = (i + 1) % derived
        const k = edgeKey(i, j, directed)
        if (!map.has(k)) {
          patched.push({ from: i, to: j, synthetic: true })
          degree[i] += 1
          degree[j] += 1
        }
      }

      return { derivedNodeCount: derived, graphEdges: patched }
    }

    const fallback = Array.from({ length: derived }, (_, i) => ({
      from: i,
      to: (i + 1) % derived,
      weight: ((i * 3 + 7) % 9) + 1,
      synthetic: true,
    }))
    return { derivedNodeCount: derived, graphEdges: fallback }
  }, [edges, steps, nodeCount, directed])

  const graphSignature = useMemo(
    () => `${directed ? 'D' : 'U'}:${graphEdges
      .map((e) => `${e.from}-${e.to}-${e.weight ?? ''}-${e.synthetic ? 1 : 0}`)
      .join('|')}`,
    [graphEdges, directed],
  )

  const width = 900
  const canvasHeight = Math.max(140, height - 24)
  const basePoints = useMemo(
    () => buildCircularLayout(derivedNodeCount, width, canvasHeight),
    [derivedNodeCount, canvasHeight],
  )

  const [editMode, setEditMode] = useState(false)
  const [selectedNode, setSelectedNode] = useState<number | null>(null)
  const [dragNode, setDragNode] = useState<number | null>(null)
  const [userEdges, setUserEdges] = useState<GraphEdge[]>(graphEdges)
  const [customPoints, setCustomPoints] = useState<GraphPoint[]>(basePoints)
  const [presetStatus, setPresetStatus] = useState<'idle' | 'saved' | 'loaded' | 'cleared' | 'exported' | 'imported' | 'error'>('idle')
  const movedDuringDragRef = useRef(false)

  const presetKey = useMemo(() => {
    const scope = algoId || 'graph-generic'
    return `athena.graph.preset.${scope}`
  }, [algoId])

  useEffect(() => {
    setUserEdges(graphEdges)
    setSelectedNode(null)
  }, [graphSignature])

  useEffect(() => {
    setCustomPoints(basePoints)
  }, [basePoints])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(presetKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as { points?: GraphPoint[]; edges?: GraphEdge[]; directed?: boolean }

      const validPoints = Array.isArray(parsed.points)
        ? parsed.points.filter((p): p is GraphPoint => Number.isFinite(p?.x) && Number.isFinite(p?.y))
        : []

      const validEdges = Array.isArray(parsed.edges)
        ? parsed.edges.filter((e): e is GraphEdge =>
            Number.isInteger(e?.from) &&
            Number.isInteger(e?.to) &&
            e.from >= 0 &&
            e.to >= 0 &&
            e.from < derivedNodeCount &&
            e.to < derivedNodeCount,
          )
        : []

      if (validPoints.length === derivedNodeCount) setCustomPoints(validPoints)
      if (validEdges.length > 0) setUserEdges(validEdges)
      if (validPoints.length === derivedNodeCount || validEdges.length > 0) {
        setPresetStatus('loaded')
      }
    } catch {
      setPresetStatus('error')
    }
  }, [presetKey, derivedNodeCount])

  const points = customPoints

  const activeNode = getNodeFromStep(step)
  const activeFrom = getFromStep(step)
  const activeTo = getToStep(step)

  const pointFromClient = useCallback((clientX: number, clientY: number): GraphPoint | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    const x = ((clientX - rect.left) / rect.width) * width
    const y = ((clientY - rect.top) / rect.height) * canvasHeight
    return {
      x: Math.max(22, Math.min(width - 22, x)),
      y: Math.max(22, Math.min(canvasHeight - 22, y)),
    }
  }, [canvasHeight])

  const toggleEdge = useCallback((from: number, to: number) => {
    if (from === to) return
    setUserEdges((prev) => {
      const key = edgeKey(from, to, directed)
      const existing = prev.findIndex((e) => edgeKey(e.from, e.to, directed) === key)
      if (existing >= 0) {
        return prev.filter((_, idx) => idx !== existing)
      }
      return [...prev, { from, to, weight: 1 }]
    })
  }, [directed])

  const onNodePointerDown = useCallback((node: number, e: React.PointerEvent<SVGCircleElement>) => {
    if (!editMode) return
    e.preventDefault()
    movedDuringDragRef.current = false
    setDragNode(node)
  }, [editMode])

  const onSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (dragNode == null || !editMode) return
    const p = pointFromClient(e.clientX, e.clientY)
    if (!p) return
    movedDuringDragRef.current = true
    setCustomPoints((prev) => prev.map((nodePoint, idx) => (idx === dragNode ? p : nodePoint)))
  }, [dragNode, editMode, pointFromClient])

  const stopDrag = useCallback(() => {
    setDragNode(null)
  }, [])

  const onNodeClick = useCallback((node: number) => {
    if (!editMode) return
    if (movedDuringDragRef.current) {
      movedDuringDragRef.current = false
      return
    }

    if (selectedNode == null) {
      setSelectedNode(node)
      return
    }

    if (selectedNode === node) {
      setSelectedNode(null)
      return
    }

    toggleEdge(selectedNode, node)
    setSelectedNode(null)
  }, [editMode, selectedNode, toggleEdge])

  const resetLayout = useCallback(() => {
    setCustomPoints(basePoints)
  }, [basePoints])

  const resetGraph = useCallback(() => {
    setUserEdges(graphEdges)
    setSelectedNode(null)
    setPresetStatus('idle')
  }, [graphEdges])

  const savePreset = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const payload = {
        directed,
        points,
        edges: userEdges,
      }
      window.localStorage.setItem(presetKey, JSON.stringify(payload))
      setPresetStatus('saved')
    } catch {
      setPresetStatus('error')
    }
  }, [directed, points, userEdges, presetKey])

  const loadPreset = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(presetKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as { points?: GraphPoint[]; edges?: GraphEdge[] }
      const nextPoints = Array.isArray(parsed.points)
        ? parsed.points.filter((p): p is GraphPoint => Number.isFinite(p?.x) && Number.isFinite(p?.y))
        : []
      const nextEdges = Array.isArray(parsed.edges)
        ? parsed.edges.filter((e): e is GraphEdge =>
            Number.isInteger(e?.from) &&
            Number.isInteger(e?.to) &&
            e.from >= 0 &&
            e.to >= 0 &&
            e.from < derivedNodeCount &&
            e.to < derivedNodeCount,
          )
        : []

      if (nextPoints.length === derivedNodeCount) setCustomPoints(nextPoints)
      if (nextEdges.length > 0) setUserEdges(nextEdges)
      setPresetStatus('loaded')
    } catch {
      setPresetStatus('error')
    }
  }, [presetKey, derivedNodeCount])

  const clearPreset = useCallback(() => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(presetKey)
    setPresetStatus('cleared')
  }, [presetKey])

  const exportPreset = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const payload = {
        algoId: algoId || null,
        directed,
        points,
        edges: userEdges,
        exportedAt: new Date().toISOString(),
      }
      const fileName = `athena-graph-preset-${algoId || 'graph'}.json`
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      setPresetStatus('exported')
    } catch {
      setPresetStatus('error')
    }
  }, [algoId, directed, points, userEdges])

  const importPreset = useCallback(() => {
    importInputRef.current?.click()
  }, [])

  const onImportFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as { points?: GraphPoint[]; edges?: GraphEdge[] }

      const nextPoints = Array.isArray(parsed.points)
        ? parsed.points.filter((p): p is GraphPoint => Number.isFinite(p?.x) && Number.isFinite(p?.y))
        : []
      const nextEdges = Array.isArray(parsed.edges)
        ? parsed.edges.filter((edge): edge is GraphEdge =>
            Number.isInteger(edge?.from) &&
            Number.isInteger(edge?.to) &&
            edge.from >= 0 &&
            edge.to >= 0 &&
            edge.from < derivedNodeCount &&
            edge.to < derivedNodeCount,
          )
        : []

      if (nextPoints.length === derivedNodeCount) setCustomPoints(nextPoints)
      if (nextEdges.length > 0) setUserEdges(nextEdges)

      if (typeof window !== 'undefined' && (nextPoints.length === derivedNodeCount || nextEdges.length > 0)) {
        const payload = {
          directed,
          points: nextPoints.length === derivedNodeCount ? nextPoints : points,
          edges: nextEdges.length > 0 ? nextEdges : userEdges,
        }
        window.localStorage.setItem(presetKey, JSON.stringify(payload))
      }

      setPresetStatus('imported')
    } catch {
      setPresetStatus('error')
    }
  }, [derivedNodeCount, directed, points, userEdges, presetKey])

  if (derivedNodeCount <= 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-tx-muted">
        No graph nodes available.
      </div>
    )
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 flex-wrap justify-end">
        <button
          type="button"
          onClick={() => {
            setEditMode((v) => !v)
            setSelectedNode(null)
            setDragNode(null)
          }}
          className={[
            'px-2 py-1 rounded border text-[10px] font-mono transition-colors',
            editMode
              ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-300'
              : 'border-border-subtle bg-white/[0.03] text-tx-secondary hover:bg-white/[0.06]',
          ].join(' ')}
        >
          {editMode ? 'Editing' : 'Edit Graph'}
        </button>
        <button
          type="button"
          onClick={resetLayout}
          className="px-2 py-1 rounded border border-border-subtle bg-white/[0.03] text-[10px] font-mono text-tx-secondary hover:bg-white/[0.06]"
        >
          Reset Layout
        </button>
        <button
          type="button"
          onClick={resetGraph}
          className="px-2 py-1 rounded border border-border-subtle bg-white/[0.03] text-[10px] font-mono text-tx-secondary hover:bg-white/[0.06]"
        >
          Reset Edges
        </button>
        <button
          type="button"
          onClick={savePreset}
          className="px-2 py-1 rounded border border-border-subtle bg-white/[0.03] text-[10px] font-mono text-tx-secondary hover:bg-white/[0.06]"
        >
          Save Preset
        </button>
        <button
          type="button"
          onClick={loadPreset}
          className="px-2 py-1 rounded border border-border-subtle bg-white/[0.03] text-[10px] font-mono text-tx-secondary hover:bg-white/[0.06]"
        >
          Load Preset
        </button>
        <button
          type="button"
          onClick={clearPreset}
          className="px-2 py-1 rounded border border-border-subtle bg-white/[0.03] text-[10px] font-mono text-tx-secondary hover:bg-white/[0.06]"
        >
          Clear Preset
        </button>
        <button
          type="button"
          onClick={exportPreset}
          className="px-2 py-1 rounded border border-border-subtle bg-white/[0.03] text-[10px] font-mono text-tx-secondary hover:bg-white/[0.06]"
        >
          Export Preset
        </button>
        <button
          type="button"
          onClick={importPreset}
          className="px-2 py-1 rounded border border-border-subtle bg-white/[0.03] text-[10px] font-mono text-tx-secondary hover:bg-white/[0.06]"
        >
          Import Preset
        </button>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={onImportFileChange}
        className="hidden"
      />

      {step && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {step.op}
          </span>
          {activeNode !== undefined && (
            <span className="font-mono text-xs text-tx-secondary">node:{activeNode}</span>
          )}
          {activeFrom !== undefined && activeTo !== undefined && (
            <span className="font-mono text-xs text-tx-secondary">{activeFrom}{'->'}{activeTo}</span>
          )}
          {editMode && (
            <span className="font-mono text-xs text-cyan-300/90">
              click two nodes to connect/disconnect; drag nodes to reposition
            </span>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${canvasHeight}`}
        className="w-full"
        style={{ height: canvasHeight, touchAction: 'none' }}
        onPointerMove={onSvgPointerMove}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
      >
        <defs>
          <marker id="arrow-head" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
            <polygon points="0 0, 8 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>

        {userEdges.map((e, idx) => {
          const p1 = points[e.from]
          const p2 = points[e.to]
          if (!p1 || !p2) return null

          const isActive =
            activeFrom != null &&
            activeTo != null &&
            ((e.from === activeFrom && e.to === activeTo) || (!directed && e.from === activeTo && e.to === activeFrom))

          const state = edgeStates[edgeKey(e.from, e.to, directed)] ?? 'normal'
          const stroke = isActive ? '#f59e0b' : state === 'selected' ? '#10b981' : state === 'relaxing' ? '#f97316' : '#64748b'
          const midX = (p1.x + p2.x) / 2
          const midY = (p1.y + p2.y) / 2
          const synthetic = e.synthetic === true && state === 'normal' && !isActive

          return (
            <g key={`edge-${idx}`}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={stroke}
                strokeWidth={isActive ? 3 : 2}
                opacity={synthetic ? 0.4 : 0.95}
                strokeDasharray={synthetic ? '5 4' : undefined}
                markerEnd={directed ? 'url(#arrow-head)' : undefined}
                onClick={() => {
                  if (!editMode) return
                  setUserEdges((prev) => prev.filter((_, edgeIdx) => edgeIdx !== idx))
                  setSelectedNode(null)
                }}
                style={{ cursor: editMode ? 'pointer' : 'default' }}
              />
              {e.weight != null && (
                <text
                  x={midX}
                  y={midY - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#e2e8f0"
                  className="font-mono"
                >
                  {String(e.weight)}
                </text>
              )}
            </g>
          )
        })}

        {Array.from({ length: derivedNodeCount }, (_, i) => {
          const p = points[i]
          if (!p) return null
          const state = nodeStates[i] ?? 'unvisited'
          const fill =
            state === 'finalized' ? '#10b981' :
            state === 'current' ? '#3b82f6' :
            state === 'visited' ? '#3b82f6' :
            state === 'enqueued' ? '#a78bfa' : '#475569'
          const stroke = activeNode === i ? '#f59e0b' : '#0b0d14'
          const isSelected = editMode && selectedNode === i
          const dist = distances[i]
          const label = dist != null ? `N${i} d=${dist}` : `N${i}`

          return (
            <g key={`node-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={18}
                fill={fill}
                stroke={isSelected ? '#22d3ee' : stroke}
                strokeWidth={isSelected || activeNode === i ? 3 : 2}
                onPointerDown={(e) => onNodePointerDown(i, e)}
                onClick={() => onNodeClick(i)}
                style={{ cursor: editMode ? 'grab' : 'default' }}
              />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fill="#f8fafc" className="font-mono">
                {label}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="absolute bottom-1 right-2 flex items-center gap-3 flex-wrap justify-end">
        {[
          { color: '#475569', label: 'unvisited' },
          { color: '#3b82f6', label: 'current' },
          { color: '#a78bfa', label: 'queued' },
          { color: '#10b981', label: 'done' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, border: '1.5px solid #64748b' }} />
            <span className="font-mono text-[10px] text-tx-secondary">{label}</span>
          </div>
        ))}
        <span className="font-mono text-[10px] text-tx-muted">nodes:{derivedNodeCount}</span>
        <span className="font-mono text-[10px] text-tx-muted">edges:{userEdges.length}</span>
        {presetStatus !== 'idle' && (
          <span className="font-mono text-[10px] text-cyan-300/90">preset:{presetStatus}</span>
        )}
      </div>
    </div>
  )
}
