'use client'

import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Keyboard } from 'lucide-react'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Props = {
  isPlaying: boolean
  currentStep: number
  totalSteps: number
  speed: number
  chunks?: number[][]
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBack: () => void
  onSeek?: (step: number) => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
  className?: string
}

const SPEEDS = [1, 2, 4]

export default function PlaybackControls({
  isPlaying,
  currentStep,
  totalSteps,
  speed,
  chunks,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onSeek,
  onReset,
  onSpeedChange,
  className,
}: Props) {
  const [mode, setMode] = useState<'step' | 'chunk'>('step')

  const normalizedChunks = useMemo(() => {
    if (!chunks || chunks.length === 0) return undefined
    return chunks
      .map(c => Array.from(new Set(c)).sort((a, b) => a - b))
      .filter(c => c.length > 0)
      .sort((a, b) => a[0] - b[0])
  }, [chunks])

  const currentChunkIndex = useMemo(() => {
    if (!normalizedChunks) return -1
    const idx = normalizedChunks.findIndex(c => c.includes(currentStep))
    if (idx >= 0) return idx
    let nearest = -1
    for (let i = 0; i < normalizedChunks.length; i += 1) {
      if (normalizedChunks[i][0] <= currentStep) nearest = i
    }
    return nearest
  }, [normalizedChunks, currentStep])

  const goChunk = useCallback((dir: -1 | 1) => {
    if (!normalizedChunks || !onSeek) {
      if (dir > 0) onStepForward()
      else onStepBack()
      return
    }
    const targetIndex = currentChunkIndex < 0
      ? (dir > 0 ? 0 : normalizedChunks.length - 1)
      : currentChunkIndex + dir
    if (targetIndex < 0 || targetIndex >= normalizedChunks.length) return
    onSeek(normalizedChunks[targetIndex][0])
  }, [normalizedChunks, onSeek, onStepForward, onStepBack, currentChunkIndex])

  const progress = totalSteps > 0 ? (currentStep / Math.max(totalSteps - 1, 1)) * 100 : 0

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return
      
      if (e.key === ' ') {
        e.preventDefault()
        if (totalSteps > 0) isPlaying ? onPause() : onPlay()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (mode === 'chunk') goChunk(-1)
        else if (currentStep > 0) onStepBack()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (mode === 'chunk') goChunk(1)
        else if (currentStep < totalSteps - 1) onStepForward()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, totalSteps, currentStep, mode, onPlay, onPause, onStepBack, onStepForward, goChunk])

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {/* Progress bar */}
      <div className="relative h-1 bg-bg-overlay rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-accent-blue rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Reset */}
        <button
          onClick={onReset}
          className="btn-icon text-tx-muted"
          title="Reset"
        >
          <RotateCcw size={14} />
        </button>

        {/* Step back */}
        <button
          onClick={() => {
            if (mode === 'chunk') {
              goChunk(-1)
              return
            }
            onStepBack()
          }}
          disabled={currentStep === 0 || isPlaying}
          className={clsx(
            'btn-icon',
            currentStep === 0 || isPlaying ? 'opacity-30 cursor-not-allowed' : ''
          )}
          title="Step back"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Play/Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={totalSteps === 0}
          className={clsx(
            'inline-flex items-center justify-center w-8 h-8 rounded',
            'bg-accent-blue text-white transition-all duration-150',
            'hover:bg-blue-500 active:scale-[0.95]',
            totalSteps === 0 ? 'opacity-40 cursor-not-allowed' : ''
          )}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        {/* Step forward */}
        <button
          onClick={() => {
            if (mode === 'chunk') {
              goChunk(1)
              return
            }
            onStepForward()
          }}
          disabled={currentStep >= totalSteps - 1 || isPlaying}
          className={clsx(
            'btn-icon',
            currentStep >= totalSteps - 1 || isPlaying ? 'opacity-30 cursor-not-allowed' : ''
          )}
          title="Step forward"
        >
          <ChevronRight size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-border mx-1" />

        {/* Speed selector */}
        <div className="flex items-center gap-2 pl-2">
          <span className="text-xs text-tx-muted">Speed</span>
          <input
            type="range"
            min={0}
            max={SPEEDS.length - 1}
            value={SPEEDS.indexOf(speed) >= 0 ? SPEEDS.indexOf(speed) : 1}
            onChange={(e) => onSpeedChange(SPEEDS[Number(e.target.value)])}
            className="w-16 accent-accent-blue"
          />
          <span className="text-xs font-mono text-tx-secondary w-8 text-right">{speed}x</span>
        </div>

        {normalizedChunks && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMode('step')}
                disabled={isPlaying}
                className={clsx(
                  'px-1.5 py-0.5 rounded text-xs font-mono transition-all duration-100',
                  isPlaying && 'opacity-40 cursor-not-allowed',
                  mode === 'step'
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                    : 'text-tx-muted hover:text-tx-secondary hover:bg-bg-elevated'
                )}
              >
                Step
              </button>
              <button
                onClick={() => setMode('chunk')}
                disabled={isPlaying}
                className={clsx(
                  'px-1.5 py-0.5 rounded text-xs font-mono transition-all duration-100',
                  isPlaying && 'opacity-40 cursor-not-allowed',
                  mode === 'chunk'
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                    : 'text-tx-muted hover:text-tx-secondary hover:bg-bg-elevated'
                )}
              >
                Chunk
              </button>
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1 flex justify-center">
          <div className="hidden md:flex items-center gap-1.5 opacity-0 hover:opacity-100 transition-opacity text-tx-muted group">
            <Keyboard size={12} className="group-hover:text-tx-secondary" />
            <span className="text-[10px] group-hover:text-tx-secondary">Space: Play/Pause | Left/Right: Step</span>
          </div>
        </div>

        {/* Step counter */}
        <div className="font-mono text-xs text-tx-muted tabular-nums">
          <span className="text-tx-secondary">{currentStep}</span>
          <span className="mx-1 text-tx-muted">/</span>
          <span>{Math.max(totalSteps - 1, 0)}</span>
        </div>
      </div>
    </div>
  )
}
