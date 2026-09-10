/** Deterministic event doubles; these tests never attach to a real browser. */
export class TestDocument extends EventTarget {
  defaultView = new EventTarget
  exitError: Error | undefined
  exitPointerLock = () => {
    if (this.exitError) {
      throw this.exitError
    }
    this.exits++
    // Browser completion is deliberately separate from the request.
  }
  exits = 0
  focused = true
  hasFocus = () => this.focused
  hidden = false
  pointerLockElement: HTMLElement | null = null
  blur() {
    this.focused = false
    this.defaultView.dispatchEvent(new Event('blur'))
  }
  change(target: TestTarget | null) {
    this.pointerLockElement = target?.element ?? null
    this.dispatchEvent(new Event('pointerlockchange'))
  }
  escape() {
    this.dispatchEvent(Object.assign(new Event('keydown'), {
      code: 'Escape',
      repeat: false,
    }))
  }
  hide() {
    this.hidden = true
    this.dispatchEvent(new Event('visibilitychange'))
  }
}

export class TestTarget {
  isConnected = true
  request: () => Promise<void> = async () => {}
  requestPointerLock = (options?: PointerLockOptions) => {
    this.requests.push(options)
    return this.request()
  }
  requests: Array<PointerLockOptions | undefined> = []
  constructor(readonly ownerDocument = new TestDocument) {}
  get element() {
    return this as unknown as HTMLElement
  }
}
