export type ComplexityReferenceItem = {
  name: string
  color: string
  description: string
}

export const COMPLEXITY_REFERENCE: ComplexityReferenceItem[] = [
  { name: 'O(1)', color: '#6b7280', description: 'Constant' },
  { name: 'O(log n)', color: '#10b981', description: 'Logarithmic' },
  { name: 'O(n)', color: '#3b82f6', description: 'Linear' },
  { name: 'O(n log n)', color: '#22d3ee', description: 'Linearithmic' },
  { name: 'O(n^2)', color: '#f59e0b', description: 'Quadratic' },
  { name: 'O(n^3)', color: '#fb7185', description: 'Cubic' },
  { name: 'O(2^n)', color: '#ef4444', description: 'Exponential' },
]

export const SORTING_COMPLEXITY_BY_ID: Record<string, {
  best: string
  average: string
  worst: string
  space: string
  stable: boolean
  inPlace: boolean
}> = {
  bubblesort: {
    best: 'O(n)',
    average: 'O(n^2)',
    worst: 'O(n^2)',
    space: 'O(1)',
    stable: true,
    inPlace: true,
  },
  selectionsort: {
    best: 'O(n^2)',
    average: 'O(n^2)',
    worst: 'O(n^2)',
    space: 'O(1)',
    stable: false,
    inPlace: true,
  },
  insertionsort: {
    best: 'O(n)',
    average: 'O(n^2)',
    worst: 'O(n^2)',
    space: 'O(1)',
    stable: true,
    inPlace: true,
  },
  mergesort: {
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(n)',
    stable: true,
    inPlace: false,
  },
  quicksort: {
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n^2)',
    space: 'O(log n)',
    stable: false,
    inPlace: true,
  },
}
