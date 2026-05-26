export type Direction = 'L' | 'R'
export type TuringStepTuple = [newState: string, writeSymbol: string, direction: Direction, ruleIndex: number]

export type TransitionRow = {
  currentState: string
  readSymbol: string
  newState: string
  writeSymbol: string
  direction: Direction
  ruleIndex: number
}

type ProgramMap = Map<string, TuringStepTuple>

const PROGRAMS: ProgramMap[] = [
  // 0: Invert bits.
  new Map<string, TuringStepTuple>([
    ['q0|0', ['q0', '1', 'R', 1]],
    ['q0|1', ['q0', '0', 'R', 2]],
    ['q0|B', ['qe', 'B', 'R', 3]],
  ]),
  // 1: Add one.
  new Map<string, TuringStepTuple>([
    ['q0|0', ['q0', '0', 'R', 1]],
    ['q0|1', ['q0', '1', 'R', 2]],
    ['q0|B', ['q1', 'B', 'L', 3]],
    ['q1|1', ['q1', '0', 'L', 4]],
    ['q1|0', ['qe', '1', 'R', 5]],
    ['q1|B', ['qe', '1', 'R', 6]],
  ]),
  // 2: Two's complement.
  new Map<string, TuringStepTuple>([
    ['q0|0', ['q0', '0', 'R', 1]],
    ['q0|1', ['q0', '1', 'R', 2]],
    ['q0|B', ['q1', 'B', 'L', 3]],
    ['q1|0', ['q1', '0', 'L', 4]],
    ['q1|1', ['q2', '1', 'L', 5]],
    ['q1|B', ['qe', 'B', 'R', 6]],
    ['q2|0', ['q2', '1', 'L', 7]],
    ['q2|1', ['q2', '0', 'L', 8]],
    ['q2|B', ['qe', 'B', 'R', 9]],
  ]),
]

export function getNextStep(state: string, read: string, algo: number): TuringStepTuple {
  const program = PROGRAMS[algo] ?? PROGRAMS[0]
  return program.get(`${state}|${read}`) ?? ['qe', 'B', 'R', -1]
}

export function getTable(algo: number): TransitionRow[] {
  const program = PROGRAMS[algo] ?? PROGRAMS[0]
  return Array.from(program.entries()).map(([key, tuple]) => {
    const [currentState, readSymbol] = key.split('|')
    return {
      currentState,
      readSymbol,
      newState: tuple[0],
      writeSymbol: tuple[1],
      direction: tuple[2],
      ruleIndex: tuple[3],
    }
  })
}
