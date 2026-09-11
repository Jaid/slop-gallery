/** Exporters use this to distinguish permanent rejection from temporary delivery failure. */
export default class ExportError extends Error {
  constructor(message: string, readonly retryable = true, readonly retryAfterMs = 0) {
    super(message)
    this.name = 'ExportError'
  }
}
