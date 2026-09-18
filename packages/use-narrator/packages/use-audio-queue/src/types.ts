export type AudioPriority = 'async' | 'destructive' | 'high' | 'inject' | 'normal' | 'shy' | 'volatile'
export type AudioPhase = 'after' | 'before' | 'playing' | 'preparing' | 'queued' | 'starting'

/** play resolves when playback starts; finished resolves only at the end. pause preserves position. */
export type AudioPlayback = {
  dispose: () => void
  finished: Promise<void>
  pause: () => void
  play: () => Promise<void> | void
}
export type AudioTask<T> = (context: {
  signal: AbortSignal
  update: (metadata: Partial<T>) => void
}) => AudioPlayback | Promise<AudioPlayback>

export type AudioResult =
  | {
    error: unknown
    status: 'failed'
  }
  | {
    reason: string
    status: 'skipped'
  }
  | {
    reason?: unknown
    status: 'cancelled'
  }
  | {status: 'completed'}

/** Cancellation and failure are values, so ignored fire-and-forget handles never reject. */
export type AudioHandle = {
  cancel: (reason?: unknown) => void
  finished: Promise<AudioResult>
  id: string
}
export type AudioEntry<T> = Readonly<{
  id: string
  key?: string
  metadata: Readonly<T>
  phase: AudioPhase
  /** Monotonic queue-clock deadline for the active timed phase. */
  phaseEndsAt?: number
  priority: AudioPriority
  suspended: boolean
}>
export type AudioQueueSnapshot<T> = Readonly<{
  concurrent: ReadonlyArray<AudioEntry<T>>
  current: AudioEntry<T> | null
  idle: boolean
  interrupted: ReadonlyArray<AudioEntry<T>>
  pending: ReadonlyArray<AudioEntry<T>>
}>
export type AudioPushOptions<T> = {
  appendedSilence?: number
  /** Deduplicates unfinished entries only. */
  key?: string
  metadata?: T
  /** Seconds. Captured when the entry is pushed. */
  prependedSilence?: number
  priority?: AudioPriority
  signal?: AbortSignal
}
export type AudioClock = {
  /** Monotonic seconds. */
  now: () => number
  schedule: (callback: () => void, seconds: number) => () => void
}
export type AudioQueueOptions = {
  appendedSilence?: number
  clock?: AudioClock
  /** Minimum seconds from the last serialized sound stopping to the next starting. Padding counts toward it. */
  gap?: number
  prependedSilence?: number
}
