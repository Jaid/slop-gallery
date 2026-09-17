export type Disposer = () => void

/** An effect replay may reacquire a resource before the queued final release. */
export default class RetainedLifetime {
  private disposed = false
  private references = 0

  constructor(private readonly dispose: Disposer) {}

  retain(): DisposableStack {
    if (this.disposed) {
      throw new Error('Cannot retain a disposed resource.')
    }
    this.references++
    const lease = new DisposableStack
    lease.defer(() => {
      this.references--
      queueMicrotask(() => {
        if (!this.disposed && this.references === 0) {
          this.disposed = true
          this.dispose()
        }
      })
    })
    return lease
  }
}
