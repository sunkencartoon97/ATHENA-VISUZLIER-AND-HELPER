'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { ALGORITHM_REGISTRY } from '@/lib/algorithms'
import { NAV_LINKS } from '@/lib/nav'

const CATEGORIES = Array.from(new Set(ALGORITHM_REGISTRY.map(a => a.category)))

interface SidebarProps {
  availableAlgos?: string[]
}

export default function Sidebar({ availableAlgos = [] }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 h-full border-r border-border-subtle bg-bg-surface flex flex-col">
      {/* Logo */}
      <div className="h-12 flex items-center px-4 border-b border-border-subtle shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-5 h-5 grid grid-cols-2 grid-rows-2 gap-0.5">
            <div className="bg-accent-blue rounded-[1px]" />
            <div className="bg-accent-cyan rounded-[1px]" />
            <div className="bg-accent-cyan rounded-[1px] opacity-60" />
            <div className="bg-accent-blue rounded-[1px] opacity-80" />
          </div>
          <span className="font-mono font-semibold text-sm tracking-widest text-tx-primary group-hover:text-accent-blue transition-colors">
            ATHENA
          </span>
          <span className="font-mono text-[10px] text-tx-muted">v3</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="p-2 border-b border-border-subtle">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-all duration-150',
                isActive
                  ? 'bg-bg-elevated text-tx-primary'
                  : 'text-tx-muted hover:text-tx-secondary hover:bg-bg-elevated/50'
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Algorithm list by category */}
      <div className="flex-1 overflow-y-auto p-2">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="mb-3">
            <p className="text-[10px] font-medium text-tx-muted uppercase tracking-wider px-2.5 py-1">
              {cat}
            </p>
            {ALGORITHM_REGISTRY.filter(a => a.category === cat).map((algo) => {
              const isActive = pathname === `/run/${algo.id}`
              const isAvailable = availableAlgos.length === 0 || availableAlgos.includes(algo.id)
              return (
                <Link
                  key={algo.id}
                  href={`/run/${algo.id}`}
                  className={clsx(
                    'flex items-center justify-between px-2.5 py-1 rounded text-xs transition-all duration-150',
                    isActive
                      ? 'bg-bg-elevated text-tx-primary'
                      : isAvailable
                      ? 'text-tx-muted hover:text-tx-secondary hover:bg-bg-elevated/50'
                      : 'text-tx-muted/40 cursor-default'
                  )}
                  onClick={!isAvailable ? (e) => e.preventDefault() : undefined}
                >
                  <span className="truncate">{algo.name}</span>
                  {!isAvailable && (
                    <span className="text-[9px] font-mono text-tx-muted/40 shrink-0">soon</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}
