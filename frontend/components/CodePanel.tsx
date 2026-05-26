'use client'

import { Highlight, themes } from 'prism-react-renderer'

type Props = {
  code: string
  language?: 'cpp' | 'python' | 'javascript' | 'typescript' | 'text'
  highlightedLine?: number
  title?: string
  className?: string
  /** When true the panel fills its parent height (for left-sidebar use) */
  fullHeight?: boolean
}

export default function CodePanel({
  code,
  language = 'cpp',
  highlightedLine,
  title = 'Code',
  className = '',
  fullHeight = false,
}: Props) {
  return (
    <div
      className={`panel overflow-hidden flex flex-col ${fullHeight ? 'h-full' : ''} ${className}`}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between shrink-0">
        <p className="text-xs text-tx-secondary font-medium truncate">{title}</p>
        {highlightedLine != null && highlightedLine > 0 && (
          <p className="text-[10px] text-tx-muted font-mono shrink-0 ml-2">line {highlightedLine}</p>
        )}
      </div>

      {/* Code area — scrollable, fills remaining height */}
      <div className={fullHeight ? 'flex-1 overflow-auto' : 'max-h-80 overflow-auto'}>
        <Highlight theme={themes.nightOwl} code={code} language={language}>
          {({ className: preClassName, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${preClassName} m-0 p-3 text-[13px] leading-6`} style={style}>
              {tokens.map((line, i) => {
                const lineNumber = i + 1
                const isActive = highlightedLine === lineNumber
                const { key: _k, ...restLineProps } = getLineProps({ line, key: i })

                return (
                  <div
                    key={i}
                    {...restLineProps}
                    className={`${restLineProps.className ?? ''} grid grid-cols-[2rem_1fr] gap-3 px-1 rounded transition-colors ${
                      isActive
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : ''
                    }`}
                  >
                    <span className="text-[10px] text-tx-muted text-right select-none">{lineNumber}</span>
                    <span>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token, key })} />
                      ))}
                    </span>
                  </div>
                )
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  )
}
