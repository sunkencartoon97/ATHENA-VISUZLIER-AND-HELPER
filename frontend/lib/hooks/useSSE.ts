'use client'

import { useState, useCallback, useRef } from 'react'
import { API_URL } from '@/lib/api'

interface UseSSEReturn {
  content: string
  isStreaming: boolean
  error: string | null
  startStream: (id: string) => void
  stopStream: () => void
}

export function useSSE(): UseSSEReturn {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const startStream = useCallback((id: string) => {
    stopStream()
    setContent('')
    setError(null)
    setIsStreaming(true)

    const es = new EventSource(`${API_URL}/explain-stream/${id}`)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      const data = event.data
      if (data === '[DONE]') {
        stopStream()
        return
      }
      
      let token: string
      try {
        const payload = JSON.parse(data)
        token = payload.token ?? data
      } catch {
        token = data
      }

      if (token.startsWith('[Ollama not running')) {
        setError('Ollama is not running. Please start Ollama with: ollama serve')
        stopStream()
        return
      }
      
      setContent((prev) => prev + token)
    }

    es.onerror = () => {
      setError('Stream connection failed')
      stopStream()
    }
  }, [stopStream])

  return { content, isStreaming, error, startStream, stopStream }
}
