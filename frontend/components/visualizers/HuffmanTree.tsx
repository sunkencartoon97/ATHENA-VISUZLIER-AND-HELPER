'use client'

import type { ComponentType } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { TraceStep } from '@/lib/types'

const Tree = dynamic(() => import('react-d3-tree').then((m) => m.default as any), {
  ssr: false,
}) as ComponentType<any>

type Props = {
  steps: HuffmanTraceStep[]
  currentStep: number
  height?: number
}

type HuffmanTraceStep = Omit<TraceStep, 'op'> & {
  op: string
  indices?: number[]
}

type HNode = {
  id: string
  freq: number
  char?: string
  left?: string
  right?: string
}

type RawNode = {
  id: string
  name: string
  attributes?: Record<string, string | number>
  children?: RawNode[]
  state?: 'normal' | 'active' | 'done'
}

function toNum(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function buildCodes(root: RawNode | undefined, prefix = ''): Record<string, string> {
  if (!root) return {}
  const leafChar = root.attributes?.char
  if (leafChar != null && (!root.children || root.children.length === 0)) {
    return { [String(leafChar)]: prefix || '0' }
  }
  const left = root.children?.[0]
  const right = root.children?.[1]
  return {
    ...buildCodes(left, `${prefix}0`),
    ...buildCodes(right, `${prefix}1`),
  }
}

export default function HuffmanTree({ steps, currentStep, height = 340 }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 720, height: Math.max(height - 24, 260) })

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

  const current = steps[currentStep] as HuffmanTraceStep | undefined

  const { root, activeIds } = useMemo(() => {
    const nodeMap = new Map<string, HNode>()
    let rootId: string | undefined
    const activeIds = new Set<string>()

    for (let i = 0; i <= currentStep && i < steps.length; i++) {
      const s = steps[i]
      const vars = s.vars ?? {}

      if (s.op === 'highlight' && vars.phase === 'init_priority_queue') {
        const id = String(toNum(vars.char_id) ?? s.indices?.[0] ?? i)
        const freq = toNum(vars.frequency) ?? 0
        if (!nodeMap.has(id)) {
          nodeMap.set(id, {
            id,
            freq,
            char: `c${id}`,
          })
        }
      }

      if (s.op === 'merge') {
        const left = String(toNum(vars.left_node) ?? s.indices?.[0] ?? '')
        const right = String(toNum(vars.right_node) ?? s.indices?.[1] ?? '')
        const newNode = String(toNum(vars.new_node_id) ?? s.indices?.[2] ?? i)
        const mergedFreq = toNum(vars.merged_freq) ?? (s.array_state?.[2] ?? 0)

        if (!nodeMap.has(left)) {
          nodeMap.set(left, { id: left, freq: toNum(vars.left_freq) ?? 0, char: `c${left}` })
        }
        if (!nodeMap.has(right)) {
          nodeMap.set(right, { id: right, freq: toNum(vars.right_freq) ?? 0, char: `c${right}` })
        }

        nodeMap.set(newNode, {
          id: newNode,
          freq: mergedFreq,
          left,
          right,
        })

        rootId = newNode
      }

      if (s.op === 'done') {
        const doneRoot = toNum(vars.huffman_root_freq)
        if (doneRoot != null) {
          for (const node of Array.from(nodeMap.values())) {
            if (node.freq === doneRoot) {
              rootId = node.id
              break
            }
          }
        }
      }
    }

    const cv = current?.vars ?? {}
    if (current?.op === 'merge') {
      const l = toNum(cv.left_node)
      const r = toNum(cv.right_node)
      const n = toNum(cv.new_node_id)
      if (l != null) activeIds.add(String(l))
      if (r != null) activeIds.add(String(r))
      if (n != null) activeIds.add(String(n))
    }

    const toRaw = (id: string): RawNode | undefined => {
      const node = nodeMap.get(id)
      if (!node) return undefined
      const children = [node.left, node.right]
        .filter((x): x is string => Boolean(x))
        .map((childId) => toRaw(childId))
        .filter((x): x is RawNode => Boolean(x))

      return {
        id: node.id,
        name: node.char ? `${node.char}` : `n${node.id}`,
        attributes: {
          freq: node.freq,
          ...(node.char ? { char: node.char } : {}),
        },
        children: children.length ? children : undefined,
        state: activeIds.has(node.id)
          ? 'active'
          : current?.op === 'done'
          ? 'done'
          : 'normal',
      }
    }

    if (!rootId && nodeMap.size > 0) {
      rootId = Array.from(nodeMap.values()).sort((a, b) => b.freq - a.freq)[0].id
    }

    return {
      root: rootId ? toRaw(rootId) : undefined,
      activeIds,
    }
  }, [steps, currentStep, current])

  if (!root) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-tx-muted">
        No Huffman data - run Huffman coding algorithm
      </div>
    )
  }

  const codes = buildCodes(root)

  return (
    <div className="flex gap-4" style={{ height }}>
      <div ref={wrapperRef} className="flex-1 min-w-0">
        <Tree
          data={root as any}
          translate={{ x: size.width / 2, y: 48 }}
          orientation="vertical"
          pathFunc="step"
          collapsible={false}
          zoomable
          nodeSize={{ x: 140, y: 90 }}
          separation={{ siblings: 1.1, nonSiblings: 1.4 }}
          renderCustomNodeElement={({ nodeDatum }: any) => {
            const state = nodeDatum.state ?? 'normal'
            const isActive = state === 'active'
            const fill = state === 'done' ? '#10b98120' : isActive ? '#3b82f620' : '#1e2236'
            const stroke = state === 'done' ? '#10b981' : isActive ? '#3b82f6' : '#334155'

            return (
              <g>
                <circle r={22} fill={fill} stroke={stroke} strokeWidth={2} />
                <text
                  textAnchor="middle"
                  dy={-3}
                  fill={isActive ? '#3b82f6' : '#94a3b8'}
                  fontSize={10}
                  fontFamily="IBM Plex Mono"
                >
                  {nodeDatum.name}
                </text>
                <text
                  textAnchor="middle"
                  dy={10}
                  fill="#10b981"
                  fontSize={9}
                  fontFamily="IBM Plex Mono"
                >
                  f={nodeDatum.attributes?.freq ?? 0}
                </text>
              </g>
            )
          }}
        />
      </div>

      {Object.keys(codes).length > 0 && (
        <div className="w-44 shrink-0 panel p-3 flex flex-col gap-2 h-fit overflow-auto">
          <div className="text-xs font-medium text-tx-secondary">Encoding</div>
          <div className="flex flex-col gap-1">
            {Object.entries(codes)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([ch, code]) => (
                <div key={ch} className="flex items-center justify-between gap-2 font-mono text-xs">
                  <span className="text-accent-blue font-semibold">{ch}</span>
                  <span className="text-tx-muted">=</span>
                  <span className="text-emerald-400">{code}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
