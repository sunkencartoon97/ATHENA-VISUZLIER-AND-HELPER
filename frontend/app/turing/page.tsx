'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { getNextStep, getTable } from '@/lib/turing'

const PROGRAMS = [
  { label: 'Invert Bits', algo: 0 },
  { label: 'Add One', algo: 1 },
  { label: "Two's Complement", algo: 2 },
] as const

export default function TuringPage() {
  const [selectedAlgo, setSelectedAlgo] = useState<number>(0)
  const [tapeInput, setTapeInput] = useState('1011')

  const [tape, setTape] = useState<string[]>(['1', '0', '1', '1', 'B'])
  const [headPos, setHeadPos] = useState(0)
  const [state, setState] = useState('q0')
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)

  const halted = state === 'qe'

  const table = useMemo(() => getTable(selectedAlgo), [selectedAlgo])

  const resetMachine = () => {
    const cleaned = tapeInput.replace(/[^01B]/g, '') || '0'
    const normalized = [...cleaned.split(''), 'B']
    setTape(normalized)
    setHeadPos(0)
    setState('q0')
    setIsAutoPlaying(false)
  }

  useEffect(() => {
    resetMachine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlgo])

  const doStepRef = useRef<() => void>(() => {})

  useEffect(() => {
    doStepRef.current = doStep
  })

  useEffect(() => {
    if (!isAutoPlaying || halted) return
    const id = setInterval(() => {
      doStepRef.current()
    }, 300)
    return () => clearInterval(id)
  }, [isAutoPlaying, halted])

  const doStep = () => {
    if (halted) return

    const nextTape = [...tape]

    while (headPos >= nextTape.length) nextTape.push('B')
    while (headPos < 0) {
      nextTape.unshift('B')
      setHeadPos(0)
    }

    const read = nextTape[headPos] ?? 'B'
    const [newState, writeSymbol, direction] = getNextStep(state, read, selectedAlgo)

    nextTape[headPos] = writeSymbol

    let nextHead = headPos + (direction === 'R' ? 1 : -1)
    if (nextHead < 0) {
      nextTape.unshift('B')
      nextHead = 0
    }
    if (nextHead >= nextTape.length) {
      nextTape.push('B')
    }

    setTape(nextTape)
    setState(newState)
    setHeadPos(nextHead)
  }

  return (
    <div className="max-w-screen-xl mx-auto w-full flex flex-col gap-4">
      <div>
        <h1 className="text-base font-medium text-tx-primary">Turing Machine</h1>
        <p className="text-xs text-tx-muted">Step through invert bits, add one, and two&apos;s complement programs.</p>
      </div>

      <div className="panel p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-tx-secondary">Program</label>
          <select
            value={selectedAlgo}
            onChange={(e) => setSelectedAlgo(Number(e.target.value))}
            className="input text-xs"
          >
            {PROGRAMS.map(p => (
              <option key={p.algo} value={p.algo}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-56">
          <label className="text-xs text-tx-secondary">Initial Tape</label>
          <input
            value={tapeInput}
            onChange={(e) => setTapeInput(e.target.value)}
            className="input font-mono text-xs"
            placeholder="1011"
          />
        </div>

        <button onClick={resetMachine} className="btn-secondary">Load Tape</button>
        <button onClick={doStep} disabled={halted} className="btn-primary">Step</button>
        <button
          onClick={() => setIsAutoPlaying(v => !v)}
          disabled={halted}
          className="btn-primary"
        >
          {isAutoPlaying ? 'Pause' : 'Auto-play'}
        </button>
      </div>

      <div className="panel p-4 flex items-center justify-between">
        <p className="text-sm text-tx-primary">Current State: <span className="font-mono">{state}</span></p>
        {halted && <p className="text-sm text-status-success">Halted</p>}
      </div>

      <div className="panel p-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tape.map((symbol, idx) => (
            <div
              key={`cell-${idx}`}
              className={`w-10 h-10 rounded border flex items-center justify-center font-mono text-sm ${idx === headPos ? 'border-accent-blue bg-accent-blue/10 text-accent-blue step-highlight' : 'border-border text-tx-primary'}`}
            >
              {symbol}
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-4 overflow-auto">
        <h2 className="text-sm font-medium text-tx-primary mb-2">Transition Table</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-tx-muted border-b border-border-subtle">
              <th className="py-1 pr-2">Current State</th>
              <th className="py-1 pr-2">Read Symbol</th>
              <th className="py-1 pr-2">New State</th>
              <th className="py-1 pr-2">Write Symbol</th>
              <th className="py-1 pr-2">Direction</th>
            </tr>
          </thead>
          <tbody>
            {table
              .sort((a, b) => a.ruleIndex - b.ruleIndex)
              .map((row) => (
                <tr key={`${row.currentState}-${row.readSymbol}-${row.ruleIndex}`} className="border-b border-border-subtle/40">
                  <td className="py-1 pr-2 font-mono">{row.currentState}</td>
                  <td className="py-1 pr-2 font-mono">{row.readSymbol}</td>
                  <td className="py-1 pr-2 font-mono">{row.newState}</td>
                  <td className="py-1 pr-2 font-mono">{row.writeSymbol}</td>
                  <td className="py-1 pr-2 font-mono">{row.direction}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
