export type Move = 'L' | 'R' | 'S'

export type Transition = {
  write: string
  move: Move
  nextState: string
}

export type MachineDefinition = {
  initialState: string
  acceptState: string
  rejectState: string
  blank: string
  transitions: Record<string, Record<string, Transition>>
}

export type MachineSnapshot = {
  state: string
  head: number
  tape: string[]
  halted: boolean
  accepted: boolean
  step: number
}

export function createBinaryIncrementMachine(): MachineDefinition {
  return {
    initialState: 'scanRight',
    acceptState: 'accept',
    rejectState: 'reject',
    blank: '_',
    transitions: {
      scanRight: {
        '0': { write: '0', move: 'R', nextState: 'scanRight' },
        '1': { write: '1', move: 'R', nextState: 'scanRight' },
        _: { write: '_', move: 'L', nextState: 'addOne' },
      },
      addOne: {
        '0': { write: '1', move: 'S', nextState: 'accept' },
        '1': { write: '0', move: 'L', nextState: 'addOne' },
        _: { write: '1', move: 'S', nextState: 'accept' },
      },
    },
  }
}

export function makeInitialSnapshot(input: string, machine: MachineDefinition): MachineSnapshot {
  const tape = input.trim().length ? input.trim().split('') : ['0']
  return {
    state: machine.initialState,
    head: 0,
    tape,
    halted: false,
    accepted: false,
    step: 0,
  }
}

export function stepMachine(
  snapshot: MachineSnapshot,
  machine: MachineDefinition,
): MachineSnapshot {
  if (snapshot.halted) return snapshot

  const nextTape = [...snapshot.tape]
  const safeHead = Math.max(0, snapshot.head)

  while (nextTape.length <= safeHead) {
    nextTape.push(machine.blank)
  }

  const read = nextTape[safeHead] ?? machine.blank
  const stateTransitions = machine.transitions[snapshot.state]
  const transition = stateTransitions?.[read]

  if (!transition) {
    return {
      ...snapshot,
      tape: nextTape,
      halted: true,
      accepted: false,
      state: machine.rejectState,
      step: snapshot.step + 1,
    }
  }

  nextTape[safeHead] = transition.write

  let nextHead = safeHead
  if (transition.move === 'L') {
    nextHead -= 1
    if (nextHead < 0) {
      nextTape.unshift(machine.blank)
      nextHead = 0
    }
  } else if (transition.move === 'R') {
    nextHead += 1
    if (nextHead >= nextTape.length) {
      nextTape.push(machine.blank)
    }
  }

  const nextState = transition.nextState
  const accepted = nextState === machine.acceptState
  const rejected = nextState === machine.rejectState

  return {
    state: nextState,
    head: nextHead,
    tape: nextTape,
    halted: accepted || rejected,
    accepted,
    step: snapshot.step + 1,
  }
}
