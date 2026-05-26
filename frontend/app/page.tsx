'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Zap, Activity, GitBranch, Layers, Cpu, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { ALGORITHM_REGISTRY, CATEGORIES } from '@/lib/algorithms'
import { getAlgos, searchAlgorithms, detectCode } from '@/lib/api'
import { useDebounce } from '@/lib/hooks/useDebounce'
import type { AlgorithmDef, SearchResponse, DetectCodeResponse } from '@/lib/types'

/* ── Category design config ───────────────────────────────── */
const CATEGORY_BADGE: Record<string, string> = {
  Sorting:              'badge-blue',
  Searching:            'badge-cyan',
  Graph:                'badge-green',
  Recursion:            'badge-purple',
  Backtracking:         'badge-red',
  'Dynamic Programming':'badge-yellow',
  Hashing:              'badge-gray',
  'String Matching':    'badge-cyan',
  Greedy:               'badge-orange',
  Theoretical:          'badge-purple',
}

/* Per-category glow color on card hover */
const CATEGORY_GLOW: Record<string, string> = {
  Sorting:              'hover:border-sky-500/30 hover:shadow-sky-500/5',
  Searching:            'hover:border-cyan-500/30 hover:shadow-cyan-500/5',
  Graph:                'hover:border-emerald-500/30 hover:shadow-emerald-500/5',
  Recursion:            'hover:border-violet-500/30 hover:shadow-violet-500/5',
  Backtracking:         'hover:border-red-500/30 hover:shadow-red-500/5',
  'Dynamic Programming':'hover:border-yellow-500/30 hover:shadow-yellow-500/5',
  Hashing:              'hover:border-slate-400/30 hover:shadow-slate-400/5',
  'String Matching':    'hover:border-cyan-500/30 hover:shadow-cyan-500/5',
  Greedy:               'hover:border-orange-500/30 hover:shadow-orange-500/5',
  Theoretical:          'hover:border-violet-500/30 hover:shadow-violet-500/5',
}

/* Per-category title text color on hover */
const CATEGORY_TEXT: Record<string, string> = {
  Sorting:              'group-hover:text-sky-400',
  Searching:            'group-hover:text-cyan-400',
  Graph:                'group-hover:text-emerald-400',
  Recursion:            'group-hover:text-violet-400',
  Backtracking:         'group-hover:text-red-400',
  'Dynamic Programming':'group-hover:text-yellow-400',
  Hashing:              'group-hover:text-slate-300',
  'String Matching':    'group-hover:text-cyan-400',
  Greedy:               'group-hover:text-orange-400',
  Theoretical:          'group-hover:text-violet-400',
}

/* ── Category icons in filter bar ────────────────────────── */
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Sorting:              <Activity size={10} />,
  Graph:                <GitBranch size={10} />,
  'Dynamic Programming':<Layers size={10} />,
  Hashing:              <Cpu size={10} />,
}

type EngineStatus = 'loading' | 'ok' | 'error'

/* ═══════════════════════════════════════════════════════════ */

export default function HomePage() {
  const [query, setQuery]                 = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [availableAlgos, setAvailableAlgos] = useState<string[] | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [codeDetection, setCodeDetection] = useState<DetectCodeResponse | null>(null)
  const [isDetectingCode, setIsDetectingCode] = useState(false)
  const [isSearching, setIsSearching]     = useState(false)
  const [engineStatus, setEngineStatus]   = useState<EngineStatus>('loading')
  const [hoveredAlgo, setHoveredAlgo]     = useState<AlgorithmDef | null>(null)

  const debouncedQuery = useDebounce(query, 300)
  const router = useRouter()

  const [autocompleteResults, setAutocompleteResults] = useState<SearchResponse | null>(null)
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false)

  function looksLikeCode(s: string) {
    const t = s.trim()
    if (t.length < 8) return false
    if (t.includes('\n')) return true
    const indicators = ['def ', 'class ', 'function ', '=>', 'console.log', 'printf', 'cout', '#include', 'import ', 'var ', 'let ', 'const ']
    let hits = 0
    for (const k of indicators) if (t.includes(k)) hits++
    if (hits >= 1 && t.length > 20) return true
    if (/[{};]/.test(t) && t.length > 20) return true
    return false
  }

  /* ── Fetch which algorithms the engine supports ─────────── */
  useEffect(() => {
    getAlgos()
      .then(algos => {
        setAvailableAlgos(algos)
        setEngineStatus('ok')
      })
      .catch(() => {
        setAvailableAlgos([])
        setEngineStatus('error')
      })
  }, [])

  /* ── Backend semantic search ────────────────────────────── */
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 3) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    searchAlgorithms(debouncedQuery)
      .then(r => { setSearchResults(r); setIsSearching(false) })
      .catch(() => { setSearchResults(null); setIsSearching(false) })
  }, [debouncedQuery])

  /* ── Autocomplete (lighter-weight) search for suggestions */
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setAutocompleteResults(null)
      setIsAutocompleteLoading(false)
      return
    }
    // Fire autocomplete for short inputs as well
    setIsAutocompleteLoading(true)
    searchAlgorithms(debouncedQuery)
      .then(r => setAutocompleteResults(r))
      .catch(() => setAutocompleteResults(null))
      .finally(() => setIsAutocompleteLoading(false))
  }, [debouncedQuery])

  /* ── Client-side code detection (calls backend /detect-code) ───────── */
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setCodeDetection(null)
      setIsDetectingCode(false)
      return
    }
    if (!looksLikeCode(debouncedQuery)) {
      setCodeDetection(null)
      return
    }
    setIsDetectingCode(true)
    detectCode(debouncedQuery)
      .then(r => setCodeDetection(r))
      .catch(() => setCodeDetection(null))
      .finally(() => setIsDetectingCode(false))
  }, [debouncedQuery])

  /* ── Client-side filtering ──────────────────────────────── */
  const visibleAlgos = useMemo<AlgorithmDef[]>(() => {
    let list = ALGORITHM_REGISTRY
    if (activeCategory) list = list.filter(a => a.category === activeCategory)
    if (query.trim() && !searchResults) {
      const q = query.toLowerCase()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.tags.some(t => t.includes(q)) ||
        a.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [activeCategory, query, searchResults])

  const isAvailable = (id: string) =>
    availableAlgos === null || availableAlgos.includes(id)

  const compiledCount = availableAlgos?.length ?? 0
  const totalCount    = ALGORITHM_REGISTRY.length

  const clearAll = () => {
    setQuery('')
    setActiveCategory(null)
    setSearchResults(null)
  }

  /* ── AI search results (safe field access) ──────────────── */
  const aiResults = searchResults?.results ?? []
  const aiType    = (searchResults as any)?.type ?? 'semantic'

  /* ═══════════════════════════════════════════════════════════ */

  return (
    <div className="flex gap-8 pb-16 relative">
      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">

      {/* ══════════════════════════════════════════
          HERO BANNER
         ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0d14]">
        {/* Mesh glow */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-sky-500/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 rounded-full bg-indigo-500/5 blur-2xl" />

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8 p-8 md:p-10">
          {/* Left: text */}
          <div>
            {/* Status pill */}
            <div className="mb-4 flex items-center gap-2">
              {engineStatus === 'loading' && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                  Connecting to engine...
                </span>
              )}
              {engineStatus === 'ok' && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 size={10} />
                  Engine Online · {compiledCount} algorithms compiled
                </span>
              )}
              {engineStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/8 px-2.5 py-1 text-[11px] font-medium text-red-400">
                  <AlertCircle size={10} />
                  Engine Offline — start backend on :8001
                </span>
              )}
            </div>

            <h1 className="font-['Syne'] text-3xl font-bold tracking-tight text-white">
              ATHENA{' '}
              <span className="gradient-text">Algorithm Platform</span>
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/35">
              Visualize, trace, and analyze {totalCount} algorithms with step-by-step
              playback, complexity analysis, cache simulation, bug injection, and AI explanations.
            </p>
          </div>

          {/* Right: stats */}
          <div className="flex gap-8 shrink-0">
            {[
              { label: 'Algorithms', value: totalCount, color: 'text-sky-400' },
              { label: 'Compiled',   value: engineStatus === 'ok' ? compiledCount : '—', color: 'text-emerald-400' },
              { label: 'Categories', value: CATEGORIES.length, color: 'text-violet-400' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <span className={clsx('font-["Syne"] text-2xl font-bold tabular-nums', s.color)}>
                  {s.value}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-white/25">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SEARCH + FILTERS
         ══════════════════════════════════════════ */}
      <div className="flex flex-col gap-4">

        {/* Search bar */}
        <div className="relative max-w-2xl">
          <Search
            size={14}
            className={clsx(
              'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors',
              isSearching ? 'text-sky-400 animate-pulse' : 'text-white/20'
            )}
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search algorithms, paste code, or describe a problem..."
            className={clsx(
              'w-full rounded-xl border bg-white/[0.025] py-2.5 pl-9 pr-10',
              'text-sm text-white/80 outline-none placeholder:text-white/20',
              'transition-all duration-200',
              query
                ? 'border-sky-500/30 shadow-[0_0_0_3px_rgba(56,189,248,0.06)]'
                : 'border-white/[0.07] hover:border-white/[0.12]'
            )}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={clearAll}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/25 transition-colors hover:text-white/60"
            >
              ✕
            </button>
          )}

          {/* Autocomplete suggestions dropdown */}
          {autocompleteResults && autocompleteResults.results.length > 0 && query && (
            <div className="absolute left-0 right-0 mt-2 z-20">
              <div className="panel max-w-2xl p-1">
                {autocompleteResults.results.slice(0, 6).map(r => {
                  const algo = ALGORITHM_REGISTRY.find(a => a.id === r.algo)
                  if (!algo) return null
                  const onPick = () => {
                    const params = new URLSearchParams()
                    params.set('prefill', query)
                    if (r.action === 'auto_run') params.set('run', '1')
                    router.push(`/run/${r.algo}?${params.toString()}`)
                  }
                  return (
                    <div
                      key={r.algo}
                      onClick={onPick}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded hover:bg-white/[0.02] cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/70">{algo.name}</p>
                        <div className="mt-0.5 text-xs text-white/30">{algo.category}</div>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="font-mono text-[11px] text-white/25">{(r.score * 100).toFixed(0)}%</span>
                        {r.action === 'auto_run' && <span className="badge-blue text-[9px]">Run</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* AI Search results */}
        {aiResults.length > 0 && (
          <div className="panel animate-fade-in max-w-2xl border-sky-500/15 bg-sky-500/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Zap size={11} className="text-sky-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-400/70">
                AI Search · {aiType}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {aiResults.slice(0, 6).map((r: any) => {
                const algo = ALGORITHM_REGISTRY.find(a => a.id === r.algo)
                if (!algo) return null
                const badge = CATEGORY_BADGE[algo.category] ?? 'badge-gray'
                return (
                  <Link
                    key={r.algo}
                    href={`/run/${r.algo}`}
                    className="group flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 transition-all hover:border-sky-500/25 hover:bg-sky-500/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white/70 transition-colors group-hover:text-white/90">
                        {algo.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className={badge}>{algo.category}</span>
                        <span className="font-mono text-[10px] text-white/25">{algo.timeComplexity}</span>
                      </div>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-1.5">
                      <span className="font-mono text-[10px] tabular-nums text-white/25">
                        {(r.score * 100).toFixed(0)}%
                      </span>
                      {r.action === 'auto_run' && <span className="badge-blue text-[9px]">Run</span>}
                      <ChevronRight size={10} className="text-white/20 transition-colors group-hover:text-sky-400/60" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Code detection panel */}
        {(isDetectingCode || codeDetection) && (
          <div className="panel animate-fade-in max-w-2xl border-indigo-500/15 bg-indigo-500/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Activity size={11} className="text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400/70">
                Code Detection
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                {isDetectingCode ? (
                  <p className="truncate text-sm text-white/60">Detecting source code…</p>
                ) : codeDetection?.is_code ? (
                  <>
                    <p className="truncate text-sm text-white/70">{codeDetection.algorithm !== 'unknown' ? `Detected ${codeDetection.algorithm}` : 'Source code detected'}</p>
                    <div className="mt-1 text-xs text-white/30">Confidence: {(codeDetection.confidence * 100).toFixed(0)}%</div>
                  </>
                ) : (
                  <p className="truncate text-sm text-white/60">Looks like natural language, not code.</p>
                )}
              </div>
              <div className="ml-3 flex items-center gap-2">
                {codeDetection?.is_code && codeDetection.algorithm !== 'unknown' && isAvailable(codeDetection.algorithm) ? (
                  <Link href={`/run/${codeDetection.algorithm}?code=${encodeURIComponent(debouncedQuery)}&run=1`} className="btn-primary text-xs py-1 px-3">Run</Link>
                ) : codeDetection?.is_code && codeDetection.algorithm !== 'unknown' ? (
                  <button className="btn-muted text-xs py-1 px-3">Detected</button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {/* All button */}
          <button
            onClick={() => { setActiveCategory(null) }}
            className={clsx(
              'flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150',
              activeCategory === null
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                : 'border-white/[0.07] text-white/35 hover:border-white/15 hover:bg-white/[0.04] hover:text-white/60'
            )}
          >
            All
            <span className={clsx(
              'rounded px-1 py-0.5 text-[9px] tabular-nums',
              activeCategory === null ? 'bg-sky-500/20 text-sky-300' : 'bg-white/5 text-white/25'
            )}>
              {totalCount}
            </span>
          </button>

          {CATEGORIES.map(cat => {
            const count  = ALGORITHM_REGISTRY.filter(a => a.category === cat).length
            const active = activeCategory === cat
            const icon   = CATEGORY_ICON[cat]
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(active ? null : cat)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                  active
                    ? 'border-white/20 bg-white/[0.07] text-white'
                    : 'border-white/[0.07] text-white/35 hover:border-white/15 hover:bg-white/[0.04] hover:text-white/60'
                )}
              >
                {icon && <span className={active ? 'text-white/70' : 'text-white/25'}>{icon}</span>}
                {cat}
                <span className={clsx(
                  'rounded px-1 py-0.5 text-[9px] tabular-nums',
                  active ? 'bg-white/10 text-white/70' : 'bg-white/5 text-white/20'
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ALGORITHM GRID
         ══════════════════════════════════════════ */}
      {visibleAlgos.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleAlgos.map((algo, i) => {
            const available  = isAvailable(algo.id)
            const badge      = CATEGORY_BADGE[algo.category] ?? 'badge-gray'
            const glow       = CATEGORY_GLOW[algo.category] ?? 'hover:border-white/15'
            const titleColor = CATEGORY_TEXT[algo.category] ?? 'group-hover:text-white'

            return (
              <Link
                key={algo.id}
                href={algo.id === 'turing' ? '/turing' : `/run/${algo.id}`}
                onClick={!available ? e => e.preventDefault() : undefined}
                onMouseEnter={() => available && setHoveredAlgo(algo)}
                onMouseLeave={() => setHoveredAlgo(null)}
                className={clsx(
                  'group relative flex flex-col rounded-xl border p-4 shadow-sm',
                  'bg-white/[0.015] transition-all duration-200',
                  'animate-fade-in',
                  available
                    ? clsx('cursor-pointer hover:bg-white/[0.03] hover:shadow-lg', glow)
                    : 'cursor-not-allowed border-white/[0.04] opacity-40',
                  !available && 'border-white/[0.04]',
                  available && 'border-white/[0.06]'
                )}
                style={{ animationDelay: `${Math.min(i * 12, 200)}ms` }}
              >
                {/* Top: name + status icon */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className={clsx(
                      'text-sm font-semibold leading-tight truncate transition-colors duration-200 text-white/70',
                      available && titleColor
                    )}>
                      {algo.name}
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-white/28 line-clamp-2">
                      {algo.description}
                    </p>
                  </div>

                  {available ? (
                    <Zap
                      size={10}
                      className={clsx(
                        'mt-0.5 shrink-0 text-white/15 transition-colors duration-200',
                        CATEGORY_TEXT[algo.category]?.replace('group-hover:', '') ?? 'group-hover:text-white/60'
                      )}
                    />
                  ) : (
                    <span className="badge-gray shrink-0 text-[9px]">soon</span>
                  )}
                </div>

                {/* Bottom: badge + complexity */}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className={badge}>{algo.category}</span>
                  <span className="font-mono text-[10px] tabular-nums text-white/25">
                    {algo.timeComplexity}
                  </span>
                </div>

                {/* Bottom glow line on hover */}
                {available && (
                  <div className="absolute bottom-0 left-6 right-6 h-px origin-center scale-x-0 rounded-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
                )}
              </Link>
            )
          })}
        </div>
      ) : (
        /* ── Empty state ───────────────────────── */
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.04] bg-white/[0.01] py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
            <Search size={22} className="text-white/20" />
          </div>
          <div className="text-center">
            <p className="text-sm text-white/40">No algorithms match your search.</p>
            <p className="mt-1 text-xs text-white/20">Try a different keyword or category.</p>
          </div>
          <button
            onClick={clearAll}
            className="mt-1 rounded-lg border border-sky-500/25 bg-sky-500/8 px-4 py-1.5 text-xs font-medium text-sky-400 transition-all hover:bg-sky-500/15"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>

      {/* ══════════════════════════════════════════
          INFO SIDEBAR (LG+)
         ══════════════════════════════════════════ */}
      <div className="hidden xl:block w-72 shrink-0">
        <div className="sticky top-20 flex flex-col gap-4">
          <div className={clsx(
            "panel overflow-hidden transition-all duration-300",
            hoveredAlgo ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}>
            {/* Sidebar header */}
            <div className="h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
            
            <div className="p-5 flex flex-col gap-4">
              {hoveredAlgo && (
                <>
                  <div>
                    <h2 className="text-lg font-['Syne'] font-bold text-white mb-1">{hoveredAlgo.name}</h2>
                    <span className={CATEGORY_BADGE[hoveredAlgo.category] ?? 'badge-gray'}>
                      {hoveredAlgo.category}
                    </span>
                  </div>

                  <p className="text-xs text-white/40 leading-relaxed">
                    {hoveredAlgo.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Time Complexity</span>
                      <span className="font-mono text-xs text-sky-400">{hoveredAlgo.timeComplexity}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Space Complexity</span>
                      <span className="font-mono text-xs text-emerald-400">{hoveredAlgo.spaceComplexity}</span>
                    </div>
                  </div>

                  {hoveredAlgo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.05]">
                      {hoveredAlgo.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-[9px] text-white/30">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link 
                    href={`/run/${hoveredAlgo.id}`}
                    className="mt-2 btn-primary w-full justify-center text-xs py-2"
                  >
                    Launch Execution Lab
                  </Link>
                </>
              )}
            </div>
          </div>

          {!hoveredAlgo && (
            <div className="panel p-5 border-dashed border-white/[0.05] bg-transparent flex flex-col items-center justify-center text-center gap-3 py-12">
              <Activity size={24} className="text-white/10" />
              <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold leading-tight">
                Hover an algorithm<br />to see details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
