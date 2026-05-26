'use client'

import { useMemo } from 'react'
import type { AnyStep, VisualizerType } from '@/lib/types'
import SortingVisualizer from './SortingVisualizer'
import GraphVisualizer from './GraphVisualizer'
import RecursionTree from './RecursionTree'
import DPTable from './DPTable'
import NQueensBoard from './NQueensBoard'
import HashVisualizer from './HashVisualizer'
import StringMatcher from './StringMatcher'
import HuffmanTree from './HuffmanTree'
import ActivityTimeline from './ActivityTimeline'
import KnapsackVisualizer from './KnapsackVisualizer'

type Props = {
  visualizerType: VisualizerType
  steps: AnyStep[]
  currentStep: number
  height?: number
  algoId?: string
}

function defaultGraphEdges(algoId?: string) {
  const graphAlgos = new Set([
    'bfs',
    'dfs',
    'dijkstra',
    'bellmanford',
    'floydwarshall',
    'kruskal',
    'prim',
    'topological',
    'hamiltonpath',
    'graphcoloring',
    'kosaraju',
  ])

  // Keep a stable, readable topology for graph traversals so the canvas
  // always looks complete even when traces only include partial edge events.
  if (algoId === 'bfs' || algoId === 'dfs') {
    return [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 4 },
      { from: 3, to: 5 },
      { from: 4, to: 6 },
      { from: 5, to: 6 },
    ]
  }

  if (algoId && graphAlgos.has(algoId)) {
    return [
      { from: 0, to: 1, weight: 4 },
      { from: 0, to: 2, weight: 2 },
      { from: 1, to: 3, weight: 3 },
      { from: 2, to: 3, weight: 1 },
      { from: 2, to: 4, weight: 5 },
      { from: 3, to: 5, weight: 2 },
      { from: 4, to: 6, weight: 4 },
      { from: 5, to: 6, weight: 1 },
    ]
  }

  return undefined
}

export default function VisualizerRouter({
  visualizerType,
  steps,
  currentStep,
  height = 300,
  algoId,
}: Props) {
  const graphDefaultEdges = useMemo(() => defaultGraphEdges(algoId), [algoId])

  if (steps.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 text-tx-muted"
        style={{ height }}
      >
        <div className="grid-bg rounded-lg border border-border-subtle w-full h-full flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded border border-border flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          </div>
          <p className="text-xs">Configure and run the algorithm to begin</p>
        </div>
      </div>
    )
  }

  switch (visualizerType) {
    case 'sorting':
      return (
        <SortingVisualizer
          steps={steps as any}
          currentStep={currentStep}
          height={height}
        />
      )
    case 'graph':
      return (
        <GraphVisualizer
          steps={steps as any}
          currentStep={currentStep}
          algoId={algoId}
          height={height}
          edges={graphDefaultEdges}
          nodeCount={7}
          directed={algoId === 'topological' || algoId === 'bellmanford' || algoId === 'dijkstra'}
        />
      )
    case 'recursion':
      return (
        <RecursionTree
          steps={steps as any}
          currentStep={currentStep}
          height={height}
        />
      )
    case 'dp':
      return (
        <DPTable
          steps={steps as any}
          currentStep={currentStep}
          height={height}
        />
      )
    case 'nqueens':
      return (
        <NQueensBoard
          steps={steps as any}
          currentStep={currentStep}
          height={height}
        />
      )
    case 'hash':
      return (
        <HashVisualizer
          steps={steps as any}
          currentStep={currentStep}
          height={height}
          mode={algoId === 'chaining' ? 'chaining' : 'open'}
        />
      )
    case 'string':
      return (
        <StringMatcher
          steps={steps as any}
          currentStep={currentStep}
          height={height}
        />
      )
    case 'huffman':
      return (
        <HuffmanTree
          steps={steps as any}
          currentStep={currentStep}
          height={height}
        />
      )
    case 'activity':
      return (
        <ActivityTimeline
          steps={steps as any}
          currentStep={currentStep}
          height={height}
        />
      )
    case 'knapsack':
      return (
        <KnapsackVisualizer
          steps={steps as any}
          currentStep={currentStep}
          height={height}
        />
      )
    default:
      return (
        <div style={{ height }} className="flex items-center justify-center text-xs text-tx-muted">
          Unknown visualizer type: {visualizerType}
        </div>
      )
  }
}
