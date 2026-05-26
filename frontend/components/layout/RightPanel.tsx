'use client'

import { Bot, AlertCircle, RefreshCw, X, ChevronRight } from 'lucide-react'

interface RightPanelProps {
  text: string
  isStreaming: boolean
  error?: string
  onClear?: () => void
  onRegenerate?: () => void
}

export default function RightPanel({
  text,
  isStreaming,
  error,
  onClear,
  onRegenerate,
}: RightPanelProps) {
  // BUG 13 FIX: collapse to a slim indicator when there's nothing to show.
  // This saves the full 320px when the panel is idle.
  const hasContent = Boolean(text || error || isStreaming)

  if (!hasContent) {
    return (
      <aside
        className="w-10 shrink-0 h-full border-l border-border-subtle bg-bg-surface flex flex-col items-center pt-4 gap-3"
        title="AI explanation will appear here after running an algorithm"
      >
        <Bot size={14} className="text-tx-muted opacity-30" />
        <ChevronRight size={12} className="text-tx-muted opacity-20" />
      </aside>
    )
  }

  return (
    <aside className="w-80 shrink-0 h-full border-l border-border-subtle bg-bg-surface flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-accent-blue" />
          <span className="text-xs font-medium text-tx-secondary">AI Explanation</span>
          {isStreaming && (
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-1 rounded-full bg-accent-blue animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-accent-blue animate-pulse [animation-delay:0.2s]" />
              <div className="w-1 h-1 rounded-full bg-accent-blue animate-pulse [animation-delay:0.4s]" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="btn-icon w-6 h-6 text-tx-muted"
              title="Regenerate"
            >
              <RefreshCw size={11} />
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="btn-icon w-6 h-6 text-tx-muted"
              title="Clear"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="flex items-start gap-2 text-status-error">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium">Explanation failed</p>
              <p className="text-xs text-tx-muted mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {(text || isStreaming) && (
          <p
            className={`text-xs text-tx-secondary leading-relaxed whitespace-pre-wrap ${
              isStreaming ? 'cursor-blink' : ''
            }`}
          >
            {text}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border-subtle">
        <p className="text-[10px] text-tx-muted">Powered by Ollama · llama3.1</p>
      </div>
    </aside>
  )
}
