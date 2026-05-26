import type { AlgorithmDef, VisualizerType } from './types'

export const SORTING_COMPLEXITY: Record<string, {
  time: { best: string; average: string; worst: string }
  space: string
  stable: boolean
  inPlace: boolean
}> = {
  bubblesort: {
    time: { best: 'O(n)', average: 'O(n^2)', worst: 'O(n^2)' },
    space: 'O(1)',
    stable: true,
    inPlace: true,
  },
  selectionsort: {
    time: { best: 'O(n^2)', average: 'O(n^2)', worst: 'O(n^2)' },
    space: 'O(1)',
    stable: false,
    inPlace: true,
  },
  insertionsort: {
    time: { best: 'O(n)', average: 'O(n^2)', worst: 'O(n^2)' },
    space: 'O(1)',
    stable: true,
    inPlace: true,
  },
  mergesort: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    stable: true,
    inPlace: false,
  },
  quicksort: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n^2)' },
    space: 'O(log n)',
    stable: false,
    inPlace: true,
  },
}

export const ALGORITHM_REGISTRY: AlgorithmDef[] = [
  { id: 'bubblesort', name: 'Bubble Sort', category: 'Sorting', timeComplexity: 'O(n^2)', spaceComplexity: 'O(1)', visualizer: 'sorting', description: 'Repeatedly swaps adjacent elements that are in the wrong order.', tags: ['sorting', 'simple'] },
  { id: 'insertionsort', name: 'Insertion Sort', category: 'Sorting', timeComplexity: 'O(n^2)', spaceComplexity: 'O(1)', visualizer: 'sorting', description: 'Builds sorted array by inserting one element at a time.', tags: ['sorting', 'adaptive'] },
  { id: 'selectionsort', name: 'Selection Sort', category: 'Sorting', timeComplexity: 'O(n^2)', spaceComplexity: 'O(1)', visualizer: 'sorting', description: 'Finds minimum element and places it at the beginning.', tags: ['sorting', 'simple'] },
  { id: 'quicksort', name: 'Quick Sort', category: 'Sorting', timeComplexity: 'O(n log n)', spaceComplexity: 'O(log n)', visualizer: 'sorting', description: 'Divides array around a pivot, recursively sorts partitions.', tags: ['sorting', 'divide-conquer', 'fast'] },
  { id: 'mergesort', name: 'Merge Sort', category: 'Sorting', timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)', visualizer: 'sorting', description: 'Divides array in half, sorts each half, then merges.', tags: ['sorting', 'stable', 'divide-conquer'] },
  { id: 'heapsort', name: 'Heap Sort', category: 'Sorting', timeComplexity: 'O(n log n)', spaceComplexity: 'O(1)', visualizer: 'sorting', description: 'Uses a binary heap data structure to sort elements.', tags: ['sorting', 'in-place'] },
  { id: 'countingsort', name: 'Counting Sort', category: 'Sorting', timeComplexity: 'O(n + k)', spaceComplexity: 'O(k)', visualizer: 'sorting', description: 'Counts occurrences of each distinct element.', tags: ['sorting', 'non-comparison', 'linear'] },
  { id: 'radixsort', name: 'Radix Sort', category: 'Sorting', timeComplexity: 'O(nk)', spaceComplexity: 'O(n + k)', visualizer: 'sorting', description: 'Sorts integers digit by digit from least to most significant.', tags: ['sorting', 'non-comparison'] },
  { id: 'bucketsort', name: 'Bucket Sort', category: 'Sorting', timeComplexity: 'O(n + k)', spaceComplexity: 'O(n)', visualizer: 'sorting', description: 'Distributes elements into buckets, then sorts each bucket.', tags: ['sorting', 'distribution'] },
  { id: 'randomizedquicksort', name: 'Randomized Quicksort', category: 'Sorting', timeComplexity: 'O(n log n)', spaceComplexity: 'O(log n)', visualizer: 'sorting', description: 'Quicksort with random pivot selection to avoid worst case.', tags: ['sorting', 'randomized'] },

  { id: 'linearsearch', name: 'Linear Search', category: 'Searching', timeComplexity: 'O(n)', spaceComplexity: 'O(1)', visualizer: 'sorting', description: 'Sequentially checks each element until target found.', tags: ['searching', 'simple'] },
  { id: 'binarysearch', name: 'Binary Search', category: 'Searching', timeComplexity: 'O(log n)', spaceComplexity: 'O(1)', visualizer: 'sorting', description: 'Searches sorted array by halving search range each step.', tags: ['searching', 'fast', 'divide-conquer'] },
  { id: 'exponentialsearch', name: 'Exponential Search', category: 'Searching', timeComplexity: 'O(log n)', spaceComplexity: 'O(1)', visualizer: 'sorting', description: 'Finds range where an element may be, then binary searches.', tags: ['searching'] },

  { id: 'bfs', name: 'Breadth-First Search', category: 'Graph', timeComplexity: 'O(V + E)', spaceComplexity: 'O(V)', visualizer: 'graph', description: 'Explores all neighbors at the current depth before going deeper.', tags: ['graph', 'traversal', 'shortest-path'] },
  { id: 'dfs', name: 'Depth-First Search', category: 'Graph', timeComplexity: 'O(V + E)', spaceComplexity: 'O(V)', visualizer: 'graph', description: 'Explores as far as possible along each branch before backtracking.', tags: ['graph', 'traversal'] },
  { id: 'dijkstra', name: "Dijkstra's Algorithm", category: 'Graph', timeComplexity: 'O((V + E) log V)', spaceComplexity: 'O(V)', visualizer: 'graph', description: 'Finds shortest paths from source to all vertices in a weighted graph.', tags: ['graph', 'shortest-path', 'greedy'] },
  { id: 'bellmanford', name: 'Bellman-Ford', category: 'Graph', timeComplexity: 'O(VE)', spaceComplexity: 'O(V)', visualizer: 'graph', description: 'Finds shortest paths in graphs with negative edge weights.', tags: ['graph', 'shortest-path'] },
  { id: 'floydwarshall', name: 'Floyd-Warshall', category: 'Graph', timeComplexity: 'O(V^3)', spaceComplexity: 'O(V^2)', visualizer: 'graph', description: 'All-pairs shortest path algorithm using dynamic programming.', tags: ['graph', 'all-pairs', 'dp'] },
  { id: 'kruskal', name: "Kruskal's MST", category: 'Graph', timeComplexity: 'O(E log E)', spaceComplexity: 'O(V)', visualizer: 'graph', description: 'Builds a minimum spanning tree by adding edges in weight order.', tags: ['graph', 'mst', 'greedy'] },
  { id: 'prim', name: "Prim's MST", category: 'Graph', timeComplexity: 'O((V + E) log V)', spaceComplexity: 'O(V)', visualizer: 'graph', description: 'Builds a minimum spanning tree outward from a starting vertex.', tags: ['graph', 'mst', 'greedy'] },
  { id: 'topological', name: 'Topological Sort', category: 'Graph', timeComplexity: 'O(V + E)', spaceComplexity: 'O(V)', visualizer: 'graph', description: 'Computes a linear ordering of vertices that respects edge directions.', tags: ['graph', 'dag'] },
  { id: 'hamiltonpath', name: 'Hamiltonian Path', category: 'Graph', timeComplexity: 'O(n!)', spaceComplexity: 'O(n)', visualizer: 'graph', description: 'Searches for a path that visits every vertex exactly once.', tags: ['graph', 'backtracking'] },
  { id: 'graphcoloring', name: 'Graph Coloring', category: 'Graph', timeComplexity: 'O(m^V)', spaceComplexity: 'O(V)', visualizer: 'graph', description: 'Assigns colors so no adjacent vertices share the same color.', tags: ['graph', 'backtracking'] },
  { id: 'kosaraju', name: "Kosaraju's SCC", category: 'Graph', timeComplexity: 'O(V + E)', spaceComplexity: 'O(V)', visualizer: 'graph', description: 'Finds strongly connected components using two DFS passes.', tags: ['graph', 'scc'] },

  { id: 'fibonacci', name: 'Fibonacci (Recursive)', category: 'Recursion', timeComplexity: 'O(2^n)', spaceComplexity: 'O(n)', visualizer: 'recursion', description: 'Computes the nth Fibonacci number via naive recursion.', tags: ['recursion'] },
  { id: 'hanoi', name: 'Tower of Hanoi', category: 'Recursion', timeComplexity: 'O(2^n)', spaceComplexity: 'O(n)', visualizer: 'recursion', description: 'Moves n disks from source to target peg using recursion.', tags: ['recursion'] },
  { id: 'subsetsum', name: 'Subset Sum', category: 'Recursion', timeComplexity: 'O(2^n)', spaceComplexity: 'O(n)', visualizer: 'recursion', description: 'Finds a subset of integers that sums to a target value.', tags: ['recursion', 'backtracking'] },

  { id: 'nqueens', name: 'N-Queens', category: 'Backtracking', timeComplexity: 'O(n!)', spaceComplexity: 'O(n)', visualizer: 'nqueens', description: 'Places N queens on an N x N board so none attack each other.', tags: ['backtracking'] },

  { id: 'knapsack01', name: '0/1 Knapsack', category: 'Dynamic Programming', timeComplexity: 'O(nW)', spaceComplexity: 'O(nW)', visualizer: 'dp', description: 'Maximizes value under a weight limit when each item is taken or skipped.', tags: ['dp'] },
  { id: 'lcs', name: 'Longest Common Subsequence', category: 'Dynamic Programming', timeComplexity: 'O(mn)', spaceComplexity: 'O(mn)', visualizer: 'dp', description: 'Finds the longest subsequence shared by two sequences.', tags: ['dp'] },
  { id: 'matrixchain', name: 'Matrix Chain Multiplication', category: 'Dynamic Programming', timeComplexity: 'O(n^3)', spaceComplexity: 'O(n^2)', visualizer: 'dp', description: 'Finds the optimal parenthesization for matrix multiplication.', tags: ['dp'] },
  { id: 'lis', name: 'Longest Increasing Subsequence', category: 'Dynamic Programming', timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)', visualizer: 'dp', description: 'Finds the longest strictly increasing subsequence.', tags: ['dp'] },
  { id: 'fibonaccidp', name: 'Fibonacci (DP)', category: 'Dynamic Programming', timeComplexity: 'O(n)', spaceComplexity: 'O(n)', visualizer: 'dp', description: 'Computes Fibonacci using memoization while showing the DP table fill.', tags: ['dp'] },

  { id: 'chaining', name: 'Hash Table (Chaining)', category: 'Hashing', timeComplexity: 'O(1) avg', spaceComplexity: 'O(n)', visualizer: 'hash', description: 'Resolves hash collisions using linked-list chains.', tags: ['hashing'] },
  { id: 'linearprobing', name: 'Linear Probing', category: 'Hashing', timeComplexity: 'O(1) avg', spaceComplexity: 'O(n)', visualizer: 'hash', description: 'Resolves collisions by checking the next slot sequentially.', tags: ['hashing'] },
  { id: 'quadraticprobing', name: 'Quadratic Probing', category: 'Hashing', timeComplexity: 'O(1) avg', spaceComplexity: 'O(n)', visualizer: 'hash', description: 'Resolves collisions with a quadratic probe sequence.', tags: ['hashing'] },
  { id: 'doublehashing', name: 'Double Hashing', category: 'Hashing', timeComplexity: 'O(1) avg', spaceComplexity: 'O(n)', visualizer: 'hash', description: 'Uses a second hash function to determine the probe sequence.', tags: ['hashing'] },

  { id: 'naivematch', name: 'Naive String Matching', category: 'String Matching', timeComplexity: 'O(nm)', spaceComplexity: 'O(1)', visualizer: 'string', description: 'Checks for a pattern at every position in the text.', tags: ['string'] },
  { id: 'kmp', name: 'KMP Algorithm', category: 'String Matching', timeComplexity: 'O(n + m)', spaceComplexity: 'O(m)', visualizer: 'string', description: 'Skips redundant comparisons using the failure function.', tags: ['string'] },
  { id: 'rabinkarp', name: 'Rabin-Karp', category: 'String Matching', timeComplexity: 'O(nm)', spaceComplexity: 'O(1)', visualizer: 'string', description: 'Uses a rolling hash to find pattern occurrences.', tags: ['string'] },

  { id: 'activityselection', name: 'Activity Selection', category: 'Greedy', timeComplexity: 'O(n log n)', spaceComplexity: 'O(1)', visualizer: 'activity', description: 'Selects the maximum number of non-overlapping activities.', tags: ['greedy'] },
  { id: 'jobsequencing', name: 'Job Sequencing', category: 'Greedy', timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)', visualizer: 'activity', description: 'Schedules jobs to maximize profit within deadlines.', tags: ['greedy'] },
  { id: 'huffman', name: 'Huffman Coding', category: 'Greedy', timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)', visualizer: 'huffman', description: 'Builds an optimal prefix-free code for data compression.', tags: ['greedy'] },
  { id: 'fractionalknapsack', name: 'Fractional Knapsack', category: 'Greedy', timeComplexity: 'O(n log n)', spaceComplexity: 'O(1)', visualizer: 'knapsack', description: 'Maximizes value by taking fractions of items.', tags: ['greedy'] },

  { id: 'turing', name: 'Turing Machine', category: 'Theoretical', timeComplexity: 'varies', spaceComplexity: 'varies', visualizer: 'string', description: "Steps through Turing machine programs like invert bits, add one, and two's complement.", tags: ['theoretical', 'automata'] },
]

export const ALGO_MAP: Record<string, AlgorithmDef> = Object.fromEntries(
  ALGORITHM_REGISTRY.map((algorithm) => [algorithm.id, algorithm]),
)

export const CATEGORIES = Array.from(new Set(ALGORITHM_REGISTRY.map((algorithm) => algorithm.category)))

export const getVisualizer = (algoId: string): VisualizerType => {
  return ALGO_MAP[algoId]?.visualizer ?? 'sorting'
}

export const DEFAULT_INPUTS: Record<VisualizerType, number[]> = {
  sorting: [38, 27, 43, 3, 9, 82, 10],
  graph: [1, 2, 3, 4, 5],
  recursion: [6],
  dp: [4, 5],
  nqueens: [6],
  hash: [12, 23, 34, 45, 56],
  string: [],
  huffman: [],
  activity: [],
  knapsack: [],
}

export const BUG_VARIANTS: Record<string, string[]> = {
  quicksort: ['fence_post', 'wrong_pivot'],
  mergesort: ['base_case'],
}

export const WHAT_IF_MODS = [
  { id: 'reverse', label: 'Reverse Input' },
  { id: 'sorted', label: 'Pre-sorted Input' },
  { id: 'sorted_desc', label: 'Reverse Sorted' },
]
