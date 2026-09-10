/** Exact, bounded reporting window. The owner flushes before capacity is exceeded. */
export class Distribution {
  count = 0
  sum = 0
  private readonly values: Float64Array

  constructor(readonly capacity: number) {
    this.values = new Float64Array(capacity)
  }

  add(value: number) {
    this.values[this.count++] = value
    this.sum += value
  }

  reset() {
    this.count = 0
    this.sum = 0
  }

  summarize() {
    const sorted = this.values.subarray(0, this.count).toSorted()
    const rank = (fraction: number) => sorted[Math.ceil(this.count * fraction) - 1]!
    return {
      mean: this.sum / this.count,
      p50: rank(0.5),
      p95: rank(0.95),
      p99: rank(0.99),
      max: sorted.at(-1)!,
    }
  }
}
