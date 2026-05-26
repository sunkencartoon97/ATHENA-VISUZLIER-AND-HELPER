import { Play, GitCompare, TrendingUp, Database, Bug, Shuffle, Search, BrainCircuit } from 'lucide-react'

export const NAV_LINKS = [
  { href: '/',              label: 'Search',     icon: Search },
  { href: '/run/quicksort', label: 'Visualizer', icon: Play },
  { href: '/compare',       label: 'Compare',    icon: GitCompare },
  { href: '/complexity',    label: 'Complexity', icon: TrendingUp },
  { href: '/cache',         label: 'Cache',      icon: Database },
  { href: '/turing',        label: 'Turing',     icon: BrainCircuit },
  { href: '/bug-injection', label: 'Bug Inject', icon: Bug },
  { href: '/whatif',        label: 'What-If',    icon: Shuffle },
]
