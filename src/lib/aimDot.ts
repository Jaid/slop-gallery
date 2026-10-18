import {crosshairAlways} from './crosshair.ts'

export type AimDotBlocker = 'viewing' | 'zoom'

type Listener = () => void

/** Whether the aim dot may show right now; V viewing and zoom block it unless `?crosshair=always` ignores blockers. */
export function createAimDot(ignoreBlockers = crosshairAlways) {
  const blockers = new Set<AimDotBlocker>
  const listeners = new Set<Listener>
  let visible = true
  const publish = () => {
    const next = ignoreBlockers || blockers.size === 0
    if (next === visible) {
      return
    }
    visible = next
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    getServerSnapshot: () => true,
    getSnapshot: () => visible,
    setBlocked(blocker: AimDotBlocker, blocked: boolean) {
      if (blocked) {
        blockers.add(blocker)
      } else {
        blockers.delete(blocker)
      }
      publish()
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const aimDot = createAimDot()

export default aimDot
