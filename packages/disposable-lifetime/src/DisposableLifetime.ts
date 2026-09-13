export type Disposable = {dispose: () => void}

/** An effect replay may reacquire a resource before the queued final release. */
export default class DisposableLifetime {
  private disposed = false
  private references = 0

  constructor(private readonly resource: Disposable) {}

  retain() {
    if (this.disposed) {
      throw new Error('Cannot retain a disposed resource.')
    }
    this.references++
    let released = false
    return () => {
      if (released) {
        return
      }
      released = true
      this.references--
      queueMicrotask(() => {
        if (!this.disposed && this.references === 0) {
          this.disposed = true
          this.resource.dispose()
        }
      })
    }
  }
}
