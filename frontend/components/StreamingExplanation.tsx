'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Bot, AlertCircle, RefreshCw } from 'lucide-react'
import { requestExplanation, createExplainStream } from '@/lib/api'

type Props = {
  algo: string
  context: string
  contextType?: 'step' | 'bug' | 'complexity' | 'whatif' | 'general'
  trigger?: number // increment to re-trigger
  className?: string
}

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export default function StreamingExplanation({
  algo,
  context,
  contextType = 'general',
  trigger = 0,
  className = '',
}: Props) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const closeRef = useRef<(() => void) | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const start = useCallback(async () => {
    if (closeRef.current) {
      closeRef.current()
      closeRef.current = null
    }

    setText('')
    setError('')
    setStatus('loading')

    try {
      const { request_id } = await requestExplanation(algo, context, contextType)
      setStatus('streaming')

      const close = createExplainStream(
        request_id,
        (token) => {
          setText(prev => prev + token)
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight
            }
          })
        },
        () => setStatus('done'),
        (err) => {
          setStatus('error')
          setError(err.message)
        }
      )

      closeRef.current = close
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Failed to load explanation')
    }
  }, [algo, context, contextType])

  useEffect(() => {
    if (trigger > 0) {
      start()
    }
    return () => {
      if (closeRef.current) {
        closeRef.current()
      }
    }
  }, [trigger, start])

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-accent-blue" />
          <span className="text-xs font-medium text-tx-secondary">AI Explanation</span>
          {status === 'streaming' && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-accent-blue animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-accent-blue animate-pulse [animation-delay:0.2s]" />
              <div className="w-1 h-1 rounded-full bg-accent-blue animate-pulse [animation-delay:0.4s]" />
            </div>
          )}
          {status === 'done' && (
            <span className="text-xs text-emerald-400">done</span>
          )}
        </div>
        {(status === 'done' || status === 'error') && (
          <button
            onClick={start}
            className="btn-icon w-6 h-6 text-tx-muted"
            title="Regenerate"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto max-h-64 text-sm text-tx-secondary leading-relaxed"
      >
        {status === 'idle' && (
          <p className="text-tx-muted text-xs italic">Run an algorithm to get an AI explanation.</p>
        )}

        {status === 'loading' && (
          <div className="space-y-2">
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-3 w-3/5" />
            <div className="skeleton h-3 w-4/5" />
          </div>
        )}

        {(status === 'streaming' || status === 'done') && text && (
          <p className={status === 'streaming' ? 'cursor-blink' : ''}>
            {text}
          </p>
        )}

        {status === 'done' && !text && (
          <p className="text-tx-muted text-xs italic">
            AI explanation requires Ollama — run:{' '}
            <code className="font-mono text-accent-cyan">ollama serve</code> then{' '}
            <code className="font-mono text-accent-cyan">ollama pull llama3.1:8b</code>
          </p>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 text-red-400">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium">Failed to load explanation</p>
              <p className="text-xs text-tx-muted mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

