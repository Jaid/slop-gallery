export type MenuStage = 'first' | 'pause' | 'return' | 'unfocus'

export function startMenuVisit(): MenuStage {
  let returning = false
  try {
    returning = localStorage.getItem('slop-gallery-visited') === 'true' || localStorage.getItem('slop-gallery-controlled') === 'true'
  } catch {
    // Without storage, visits can only be remembered for this page’s lifetime.
  }
  try {
    localStorage.setItem('slop-gallery-visited', 'true')
  } catch {
    // A write failure must not discard a successfully read visit.
  }
  return returning ? 'return' : 'first'
}

export class MenuSession {
  locked = false
  stage: MenuStage
  private releaseReason: 'pause' | 'unfocus' | null = null

  constructor(stage: MenuStage) {
    this.stage = stage
  }

  change(locked: boolean, focused: boolean, connected: boolean) {
    if (locked) {
      this.releaseReason = null
    } else if (this.locked) {
      // Pointer Lock exposes no release reason. Infer Chromium’s Escape gesture when the page stays focused, the target stays connected and the application did not release it.
      this.stage = !focused || !connected ? 'unfocus' : this.releaseReason ?? 'pause'
      this.releaseReason = null
    }
    this.locked = locked
    return this.stage
  }

  release(reason: 'pause' | 'unfocus') {
    if (this.locked) {
      this.releaseReason = reason
    }
  }
}
