import type {NarrationMetadata, NarrationState} from './types.ts'
import type {AudioQueueSnapshot} from 'use-audio-queue/core'

/** Foreground narration wins; otherwise show the newest explicitly concurrent narration. */
export function narrationState(snapshot: AudioQueueSnapshot<NarrationMetadata>): NarrationState | null {
  const entry = snapshot.current ?? snapshot.concurrent.at(-1)
  if (!entry) {
    return null
  }
  let status: NarrationState['status']
  if (entry.phase === 'queued' || entry.phase === 'preparing') {
    status = 'preparing'
  } else if (entry.phase === 'starting') {
    status = 'before'
  } else {
    status = entry.phase
  }
  return {
    ...entry.metadata,
    status,
  }
}
