'use client'

import type { ComponentType } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { RecursionStep } from '@/lib/types'

const Tree = dynamic(() => import('react-d3-tree').then((m) => m.default as any), {
  ssr: false,
}) as ComponentType<any>

type Props = {
  steps: RecursionStep[]
  currentStep: number
  height?: number
}

const STATE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  active:    { fill: '#f59e0b20', stroke: '#f59e0b', text: '#f59e0b' },
  returned:  { fill: '#10b98120', stroke: '#10b981', text: '#10b981' },
  base_case: { fill: '#3b82f620', stroke: '#3b82f6', text: '#3b82f6' },
  pending:   { fill: '#1e2236',   stroke: '#252a3e', text: '#4a5568' },
}

type RecNode = {
  id: string
  name: string
  attributes?: Record<string, string | number>
  children?: RecNode[]
  state: 'active' | 'returned' | 'base_case' | 'pending'
}

export default function RecursionTree({ steps, currentStep, height = 400 }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 720, height: Math.max(height - 24, 280) })

  useEffect(() => {
    if (!wrapperRef.current) return
    const update = () => {
      if (!wrapperRef.current) return
      setSize({
        width: Math.max(wrapperRef.current.clientWidth, 420),
        height: Math.max(wrapperRef.current.clientHeight, 260),
      })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  const treeData = useMemo(() => {
    const nodeMap = new Map<string, RecNode>()
    const parentMap = new Map<string, string>()
    const depthStack: string[] = []

    for (let i = 0; i <= currentStep && i < steps.length; i++) {
      const s = steps[i]
      if (!s) continue

      if (s.op === 'call') {
        const state: RecNode['state'] = 'active'
        const params = s.params?.length ? `(${s.params.join(', ')})` : ''
        const node: RecNode = {
          id: s.node_id,
          name: `${s.node_id}${params}`,
          attributes: { depth: s.depth },
          children: [],
          state,
        }
        if (!nodeMap.has(s.node_id)) {
          nodeMap.set(s.node_id, node)
        }

        const parentByDepth = s.depth > 0 ? depthStack[s.depth - 1] : undefined
        if (parentByDepth && parentByDepth !== s.node_id) {
          parentMap.set(s.node_id, parentByDepth)
          const parent = nodeMap.get(parentByDepth)
          if (parent && !parent.children?.some((c) => c.id === s.node_id)) {
            parent.children = parent.children ?? []
            parent.children.push(nodeMap.get(s.node_id)!)
          }
        }

        depthStack[s.depth] = s.node_id
      }

      if (s.op === 'return' || s.op === 'base_case') {
        const target = nodeMap.get(s.node_id)
        if (target) {
          target.state = s.op === 'base_case' ? 'base_case' : 'returned'
          if (s.value != null) {
            target.attributes = {
              ...(target.attributes ?? {}),
              return: s.value,
            }
          }
        }
      }
    }

    const roots = Array.from(nodeMap.values()).filter((n) => !parentMap.has(n.id))
    if (roots.length === 0) return undefined
    return roots[0]
  }, [steps, currentStep])

  const step         = steps[currentStep] as RecursionStep | undefined

  const activeId = step?.node_id

  if (!treeData) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-tx-muted">
        No recursion data — run a recursive algorithm
      </div>
    )
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Step label (sticky so it's always visible while scrolling) */}
      {step && (
        <div className="sticky top-2 left-2 z-10 inline-flex items-center gap-2 mb-2">
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {step.op}
          </span>
          <span className="font-mono text-xs text-tx-muted">{step.node_id}</span>
        </div>
      )}

      <div ref={wrapperRef} className="w-full" style={{ height: height - 24 }}>
        <Tree
          data={treeData as any}
          translate={{ x: size.width / 2, y: 48 }}
          orientation="vertical"
          pathFunc="step"
          collapsible={false}
          zoomable
          separation={{ siblings: 1.2, nonSiblings: 1.5 }}
          nodeSize={{ x: 180, y: 90 }}
          renderCustomNodeElement={({ nodeDatum }: any) => {
            const nodeId = String(nodeDatum.id ?? nodeDatum.name)
            const state = nodeId === activeId ? 'active' : (nodeDatum.state ?? 'pending')
            const colors = STATE_COLORS[state] ?? STATE_COLORS.pending
            const ret = nodeDatum.attributes?.return

            return (
              <g>
                <circle r={22} fill={colors.fill} stroke={colors.stroke} strokeWidth={2} />
                <text
                  fill={colors.text}
                  fontSize={10}
                  fontFamily="IBM Plex Mono"
                  textAnchor="middle"
                  dy={ret != null ? -3 : 4}
                >
                  {String(nodeDatum.name).slice(0, 16)}
                </text>
                {ret != null && (
                  <text
                    fill="#10b981"
                    fontSize={9}
                    fontFamily="IBM Plex Mono"
                    textAnchor="middle"
                    dy={12}
                  >
                    → {ret}
                  </text>
                )}
              </g>
            )
          }}
        />
      </div>

      {/* Legend */}
      <div className="sticky bottom-1 right-2 float-right flex items-center gap-3">
        {[
          { color: '#f59e0b', label: 'active' },
          { color: '#10b981', label: 'returned' },
          { color: '#3b82f6', label: 'base case' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-[2px] border"
              style={{ borderColor: color, backgroundColor: `${color}20` }}
            />
            <span className="font-mono text-[9px] text-tx-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
