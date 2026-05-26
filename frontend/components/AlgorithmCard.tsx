'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { AlgorithmDef } from '@/lib/types'
import clsx from 'clsx'

const CATEGORY_COLORS: Record<string, string> = {
  Sorting: 'badge-blue',
  Searching: 'badge-cyan',
  Graph: 'badge-green',
  Recursion: 'badge-purple',
  Backtracking: 'badge-red',
  'Dynamic Programming': 'badge-yellow',
  Hashing: 'badge-gray',
  'String Matching': 'badge-cyan',
  Greedy: 'badge-green',
}

type Props = {
  algo: AlgorithmDef
  compact?: boolean
}

export default function AlgorithmCard({ algo, compact = false }: Props) {
  const badgeClass = CATEGORY_COLORS[algo.category] ?? 'badge-gray'

  return (
    <Link
      href={`/run/${algo.id}`}
      className={clsx(
        'group panel p-3 hover:border-border-strong hover:bg-bg-elevated/60',
        'transition-all duration-150 cursor-pointer block animate-fade-in',
        compact ? 'gap-2' : 'gap-3'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-tx-primary group-hover:text-accent-blue transition-colors truncate">
            {algo.name}
          </h3>
          {!compact && (
            <p className="text-xs text-tx-muted mt-0.5 line-clamp-2 leading-relaxed">
              {algo.description}
            </p>
          )}
        </div>
        <ArrowRight
          size={14}
          className="text-tx-muted group-hover:text-accent-blue group-hover:translate-x-0.5 transition-all duration-150 shrink-0 mt-0.5"
        />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <span className={badgeClass}>{algo.category}</span>
        <span className="font-mono text-xs text-tx-muted">{algo.timeComplexity}</span>
      </div>
    </Link>
  )
}
