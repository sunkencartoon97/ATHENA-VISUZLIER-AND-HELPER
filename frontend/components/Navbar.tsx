'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useHealthCheck } from '@/lib/hooks/useHealthCheck'
import { NAV_LINKS } from '@/lib/nav'

const HEALTH_COLORS: Record<string, string> = {
  ok: 'bg-status-success',
  engine_not_compiled: 'bg-status-warning',
  error: 'bg-status-error',
  loading: 'bg-tx-muted',
}

const HEALTH_LABELS: Record<string, string> = {
  ok: 'online',
  engine_not_compiled: 'no engine',
  error: 'offline',
  loading: '...',
}

export default function Navbar() {
  const pathname = usePathname()
  const { status, version } = useHealthCheck()

  return (
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-bg-base/90 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-6 h-6 relative">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
              <div className="bg-accent-blue rounded-[1px]" />
              <div className="bg-accent-cyan rounded-[1px]" />
              <div className="bg-accent-cyan rounded-[1px] opacity-60" />
              <div className="bg-accent-blue rounded-[1px] opacity-80" />
            </div>
          </div>
          <span className="font-mono font-semibold text-sm tracking-widest text-tx-primary group-hover:text-accent-blue transition-colors">
            ATHENA
          </span>
          <span className="font-mono text-xs text-tx-muted">v3.0</span>
        </Link>

        {/* Divider */}
        <div className="w-px h-4 bg-border" />

        {/* Links */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const segment = href.split('/')[1]
            const isActive =
              href === '/'
                ? pathname === '/'
                : pathname.startsWith(`/${segment}`)

            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'px-2 sm:px-3 py-1 rounded text-sm transition-all duration-150 flex items-center gap-1.5 shrink-0',
                  isActive
                    ? 'text-tx-primary bg-bg-elevated'
                    : 'text-tx-muted hover:text-tx-secondary hover:bg-bg-elevated/50'
                )}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Health indicator */}
        <div className="flex items-center gap-2 text-xs text-tx-muted font-mono">
          <div
            className={clsx(
              'w-1.5 h-1.5 rounded-full',
              HEALTH_COLORS[status],
              status === 'ok' && 'animate-pulse-soft'
            )}
            title={`Backend ${HEALTH_LABELS[status]}`}
          />
          <span className={clsx(
            status === 'ok' ? 'text-tx-muted' :
            status === 'engine_not_compiled' ? 'text-status-warning' :
            status === 'error' ? 'text-status-error' : 'text-tx-muted'
          )}>
            {HEALTH_LABELS[status]}
            {version && status === 'ok' && ` · ${version}`}
          </span>
        </div>
      </div>
    </nav>
  )
}
