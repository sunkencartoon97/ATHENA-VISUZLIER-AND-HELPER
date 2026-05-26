'use client'

import { useMemo } from 'react'
import type { ArrayStep } from '@/lib/types'

type NQueensStep = ArrayStep & {
  vars?: Record<string, string>
}

type Props = {
  steps: ArrayStep[]
  currentStep: number
  n?: number
  height?: number
}

export default function NQueensBoard({ steps, currentStep, n = 8, height = 320 }: Props) {
  const step = steps[currentStep] as NQueensStep | undefined
  const queenGlyph = '\u265B'

  const board = useMemo(() => step?.array ?? [], [step])
  const boardSizeN = Math.max(board.length || n, 1)

  const currentRow = step?.indices?.[0] ?? -1
  const currentCol = step?.indices?.[1] ?? -1
  const solutionCount =
    Number(step?.vars?.solutions_found ?? step?.vars?.solution_num ?? 0) || 0
  const backtrackRow = step?.vars?.backtrack_from_row

  const cellSize = Math.min(Math.floor((height - 40) / boardSizeN), 48)
  const renderedBoardSize = cellSize * boardSizeN

  const conflictCells = useMemo(() => {
    const cells = new Set<string>()
    const queens = board
      .map((col, row) => ({ row, col }))
      .filter(({ col }) => typeof col === 'number' && col >= 0)

    for (const queen of queens) {
      for (let row = 0; row < boardSizeN; row += 1) {
        for (let col = 0; col < boardSizeN; col += 1) {
          if (row === queen.row && col === queen.col) continue
          const sameCol = col === queen.col
          const sameDiag = Math.abs(row - queen.row) === Math.abs(col - queen.col)
          if (sameCol || sameDiag) {
            cells.add(`${row}-${col}`)
          }
        }
      }
    }

    return cells
  }, [board, boardSizeN])

  const queensPlaced = board.filter((col) => typeof col === 'number' && col >= 0).length

  return (
    <div className="flex flex-col items-center gap-3" style={{ height }}>
      {step && (
        <div className="flex items-center gap-2 self-start flex-wrap">
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {step.op}
          </span>
          {currentRow >= 0 && (
            <span className="font-mono text-xs text-tx-muted">
              row:{currentRow} col:{currentCol}
            </span>
          )}
          {backtrackRow !== undefined && (
            <span className="font-mono text-xs text-red-400">
              backtracking from row {backtrackRow}
            </span>
          )}
        </div>
      )}

      <div
        className="border border-border-subtle rounded overflow-hidden"
        style={{ width: renderedBoardSize, height: renderedBoardSize, position: 'relative' }}
      >
        {Array.from({ length: boardSizeN }, (_, row) =>
          Array.from({ length: boardSizeN }, (_, col) => {
            const isLight = (row + col) % 2 === 0
            const hasQueen = board[row] === col
            const isCurrentTry = row === currentRow && col === currentCol
            const key = `${row}-${col}`
            const conflict = conflictCells.has(key)
            const isSafe = !hasQueen && !conflict && row <= Math.max(currentRow, 0)

            type CellState = 'empty' | 'queen' | 'conflict' | 'safe' | 'current'
            let cellState: CellState = 'empty'
            if (isCurrentTry) cellState = 'current'
            else if (hasQueen) cellState = 'queen'
            else if (conflict) cellState = 'conflict'
            else if (isSafe) cellState = 'safe'

            let backgroundColor = isLight ? '#1a1e30' : '#131629'
            if (cellState === 'current') backgroundColor = '#3b82f620'
            if (cellState === 'queen') backgroundColor = '#3b82f620'
            if (cellState === 'conflict') backgroundColor = '#ef444430'
            if (cellState === 'safe') backgroundColor = '#10b98115'

            let borderColor = 'transparent'
            if (cellState === 'current') borderColor = '#3b82f660'
            if (cellState === 'queen') borderColor = '#3b82f680'
            if (cellState === 'conflict') borderColor = '#ef444460'
            if (cellState === 'safe') borderColor = '#10b98140'

            return (
              <div
                key={key}
                className="absolute flex items-center justify-center transition-all duration-150"
                style={{
                  left: col * cellSize,
                  top: row * cellSize,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor,
                  border: `1px solid ${borderColor}`,
                  position: 'absolute',
                }}
              >
                {hasQueen && (
                  <span
                    style={{
                      fontSize: cellSize * 0.55,
                      lineHeight: 1,
                      filter: 'drop-shadow(0 0 4px #3b82f6)',
                    }}
                  >
                    {queenGlyph}
                  </span>
                )}
                {isCurrentTry && !hasQueen && (
                  <span
                    style={{
                      fontSize: cellSize * 0.45,
                      lineHeight: 1,
                      opacity: 0.3,
                    }}
                  >
                    {queenGlyph}
                  </span>
                )}
              </div>
            )
          }),
        )}
      </div>

      <div className="flex items-center gap-4 text-xs font-mono text-tx-muted flex-wrap">
        <span>
          Queens placed: <span className="text-emerald-400">{queensPlaced}</span>
        </span>
        <span>
          Board: <span className="text-tx-secondary">{boardSizeN}x{boardSizeN}</span>
        </span>
        <span>
          Solutions found: <span className="text-accent-cyan">{solutionCount}</span>
        </span>
        {step?.op === 'sorted' && <span className="text-emerald-400">Solution found!</span>}
      </div>
    </div>
  )
}
