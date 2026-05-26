'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { TraceStep, CacheEvent } from '@/lib/types'
import { runAlgorithm } from '@/lib/api'
import { getAlgorithmCodeSample, getHighlightedLineForStep } from '@/lib/codeSamples'

interface UseAlgorithmRunReturn {
  steps: TraceStep[]
  cacheEvents: CacheEvent[]
  currentStepIndex: number
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  truncated: boolean
  wallMs: number
  algoId: string | null
  highlightedLine: number
  codeSample: ReturnType<typeof getAlgorithmCodeSample> | null
  run: (algo: string, input: number[], mode?: 'trace' | 'cache') => Promise<void>
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  jumpToStart: () => void
  jumpToEnd: () => void
  goToStep: (index: number) => void
  setSpeed: (multiplier: number) => void
  speed: number
}

export function useAlgorithmRun(): UseAlgorithmRunReturn {
  const [steps, setSteps] = useState<TraceStep[]>([])
  const [cacheEvents, setCacheEvents] = useState<CacheEvent[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [wallMs, setWallMs] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [algoId, setAlgoId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const run = useCallback(async (algo: string, input: number[], mode: 'trace' | 'cache' = 'trace') => {
    setIsLoading(true)
    setError(null)
    setIsPlaying(false)

    try {
      const response = await runAlgorithm(algo, input, mode)
      setAlgoId(algo)
      setSteps(response.steps)
      setCacheEvents(response.cache_events)
      setTruncated(response.truncated)
      setWallMs(response.wall_ms)
      setCurrentStepIndex(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const play = useCallback(() => setIsPlaying(true), [])
  const pause = useCallback(() => setIsPlaying(false), [])

  const stepForward = useCallback(() => {
    setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1))
  }, [steps.length])

  const stepBack = useCallback(() => {
    setCurrentStepIndex((index) => Math.max(index - 1, 0))
  }, [])

  const jumpToStart = useCallback(() => setCurrentStepIndex(0), [])
  const jumpToEnd = useCallback(() => setCurrentStepIndex(Math.max(steps.length - 1, 0)), [steps.length])
  const goToStep = useCallback((index: number) => {
    setCurrentStepIndex(Math.max(0, Math.min(index, Math.max(steps.length - 1, 0))))
  }, [steps.length])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (isPlaying && steps.length > 0) {
      const intervalMs = Math.max(60, Math.round(500 / speed))
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex((index) => {
          if (index >= steps.length - 1) {
            setIsPlaying(false)
            return index
          }
          return index + 1
        })
      }, intervalMs)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed, steps.length])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        setIsPlaying((playing) => !playing)
      } else if (event.code === 'ArrowRight') {
        stepForward()
      } else if (event.code === 'ArrowLeft') {
        stepBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [stepForward, stepBack])

  const codeSample = useMemo(
    () => (algoId ? getAlgorithmCodeSample(algoId) : null),
    [algoId],
  )

  const highlightedLine = useMemo(
    () => (algoId ? getHighlightedLineForStep(algoId, steps[currentStepIndex], currentStepIndex) : 0),
    [algoId, steps, currentStepIndex],
  )

  return {
    steps,
    cacheEvents,
    currentStepIndex,
    isPlaying,
    isLoading,
    error,
    truncated,
    wallMs,
    algoId,
    highlightedLine,
    codeSample,
    run,
    play,
    pause,
    stepForward,
    stepBack,
    jumpToStart,
    jumpToEnd,
    goToStep,
    setSpeed,
    speed,
  }
}
