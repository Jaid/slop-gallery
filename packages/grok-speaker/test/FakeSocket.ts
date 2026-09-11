export default class FakeSocket extends EventTarget {
  static autoOpen = true
  static readonly CLOSED = 3
  static instances: Array<FakeSocket> = []
  static readonly OPEN = 1
  readyState = 0
  sent: Array<{delta?: string
    type: string}> = []

  constructor(readonly url: URL, readonly options: Bun.WebSocketOptions) {
    super()
    FakeSocket.instances.push(this)
    if (FakeSocket.autoOpen) {
      queueMicrotask(() => this.open())
    }
  }

  audio(bytes = [1, 2, 3, 4]) {
    this.emit({
      type: 'audio.delta',
      delta: Buffer.from(bytes).toString('base64'),
    })
  }

  close() {
    if (this.readyState !== FakeSocket.CLOSED) {
      this.readyState = FakeSocket.CLOSED
      this.dispatchEvent(new Event('close'))
    }
  }

  done() {
    this.emit({
      type: 'audio.done',
      trace_id: 'test-trace',
    })
  }

  emit(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', {data: JSON.stringify(data)}))
  }

  open() {
    if (this.readyState === 0) {
      this.readyState = FakeSocket.OPEN
      this.dispatchEvent(new Event('open'))
    }
  }

  send(data: string) {
    if (this.readyState !== FakeSocket.OPEN) {
      throw new Error('Socket is not open.')
    }
    this.sent.push(JSON.parse(data) as {delta?: string
      type: string})
  }
}
