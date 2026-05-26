import type { OpType } from './types'

export const OP_COLORS: Record<OpType | string, string> = {
  call: '#71717a',
  return: '#71717a',
  compare: '#f59e0b',
  swap: '#ef4444',
  assign: '#14b8a6',
  pivot: '#a855f7',
  merge: '#3b82f6',
  visit: '#6366f1',
}

export const VERDICT_COLORS: Record<string, string> = {
  MATCH: '#22c55e',
  WORSE_THAN_CLAIMED: '#ef4444',
  BETTER_THAN_CLAIMED: '#3b82f6',
  UNVERIFIABLE: '#71717a',
}

export const DIFF_COLORS: Record<string, { bg: string; border: string }> = {
  equal: { bg: 'rgba(30,34,54,0.3)', border: '#252a3e' },
  replace: { bg: 'rgba(245,158,11,0.08)', border: '#f59e0b' },
  delete: { bg: 'rgba(239,68,68,0.08)', border: '#ef4444' },
  insert: { bg: 'rgba(34,197,94,0.08)', border: '#22c55e' },
}

export const PLAYBACK_SPEEDS: Record<string, number> = {
  '0.25x': 2000,
  '0.5x': 1000,
  '1x': 500,
  '2x': 250,
  '4x': 125,
}

export const ALGO_NAMES: Record<string, string> = {
  quicksort: 'Quicksort',
  mergesort: 'Mergesort',
  bubblesort: 'Bubblesort',
  binarysearch: 'Binary Search',
  linearsearch: 'Linear Search',
  bfs: 'BFS',
  dfs: 'DFS',
  insertionsort: 'Insertion Sort',
  selectionsort: 'Selection Sort',
  heapsort: 'Heap Sort',
  countingsort: 'Counting Sort',
  radixsort: 'Radix Sort',
  bucketsort: 'Bucket Sort',
  randomizedquicksort: 'Randomized Quicksort',
  exponentialsearch: 'Exponential Search',
  dijkstra: 'Dijkstra',
  bellmanford: 'Bellman-Ford',
  floydwarshall: 'Floyd-Warshall',
  kruskal: 'Kruskal',
  prim: 'Prim',
  topological: 'Topological Sort',
  hamiltonpath: 'Hamiltonian Path',
  graphcoloring: 'Graph Coloring',
  kosaraju: 'Kosaraju SCC',
  fibonacci: 'Fibonacci (Recursive)',
  hanoi: 'Tower of Hanoi',
  subsetsum: 'Subset Sum',
  nqueens: 'N-Queens',
  knapsack01: '0/1 Knapsack',
  lcs: 'LCS',
  matrixchain: 'Matrix Chain',
  lis: 'LIS',
  fibonaccidp: 'Fibonacci (DP)',
  chaining: 'Hash Chaining',
  linearprobing: 'Linear Probing',
  quadraticprobing: 'Quadratic Probing',
  doublehashing: 'Double Hashing',
  naivematch: 'Naive Match',
  kmp: 'KMP',
  rabinkarp: 'Rabin-Karp',
  activityselection: 'Activity Selection',
  jobsequencing: 'Job Sequencing',
  huffman: 'Huffman Coding',
  fractionalknapsack: 'Fractional Knapsack',
}

export const COMPLEXITY_COLORS: Record<string, string> = {
  'O(1)': '#6b7280',
  'O(log n)': '#10b981',
  'O(n)': '#3b82f6',
  'O(n log n)': '#22d3ee',
  'O(n^2)': '#ef4444',
  'O(n^3)': '#f97316',
  'O(2^n)': '#a78bfa',
}
