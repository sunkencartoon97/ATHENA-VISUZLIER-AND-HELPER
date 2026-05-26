import { useState, useEffect, useRef, useCallback } from 'react'

export function usePlayback(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Auto-advance when playing
  useEffect(() => {
    clearTimer()
    if (!isPlaying || totalSteps === 0) return

    const ms = Math.max(60, Math.round(500 / speed))
    intervalRef.current = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, ms)

    return clearTimer
  }, [isPlaying, speed, totalSteps, clearTimer])

  // Pause when reaching end
  useEffect(() => {
    if (currentStep >= totalSteps - 1 && totalSteps > 0) {
      setIsPlaying(false)
    }
  }, [currentStep, totalSteps])

  const play = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      setCurrentStep(0)
    }
    setIsPlaying(true)
  }, [currentStep, totalSteps])

  const pause = useCallback(() => setIsPlaying(false), [])

  const stepForward = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
  }, [totalSteps])

  const stepBack = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(0)
  }, [])

  const goToStep = useCallback((step: number) => {
    setIsPlaying(false)
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)))
  }, [totalSteps])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev && currentStep >= totalSteps - 1) {
        setCurrentStep(0)
        return true
      }
      return !prev
    })
  }, [currentStep, totalSteps])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') stepForward();
      if (e.key === 'ArrowLeft') stepBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepForward, stepBack]);

  return {
    currentStep,
    isPlaying,
    speed,
    play,
    pause,
    stepForward,
    stepBack,
    reset,
    goToStep,
    setSpeed,
    togglePlay,
  }
}
