export type AimDotBlocker = 'viewing' | 'zoom'

type Listener = () => void

const blockers = new Set<AimDotBlocker>
const listeners = new Set<Listener>
let visible = true
function publish() {
  const next = blockers.size === 0
  if (next === visible) {
    return
  }
  visible = next
  for (const listener of listeners) {
    listener()
  }
}
const aimDot = {
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

export default aimDot
