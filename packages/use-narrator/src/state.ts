import type {NarrationMetadata, NarrationState} from './types.ts'
import type {AudioEntry, AudioQueueSnapshot} from 'use-audio-queue/core'

const stateFor = (entry: AudioEntry<NarrationMetadata>): NarrationState => {
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

/** Foreground narration wins; otherwise return the newest explicitly concurrent narration. */
export function narrationState(snapshot: AudioQueueSnapshot<NarrationMetadata>): NarrationState | null {
  const entry = snapshot.current ?? snapshot.concurrent.at(-1)
  return entry ? stateFor(entry) : null
}

/** Every currently visible narration: serialized foreground first, then concurrent async entries. */
export function narrationStates(snapshot: AudioQueueSnapshot<NarrationMetadata>): ReadonlyArray<NarrationState> {
  const states = snapshot.current ? [stateFor(snapshot.current)] : []
  states.push(...snapshot.concurrent.map(stateFor))
  return states
}
