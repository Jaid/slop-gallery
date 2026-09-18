import type AudioQueue from './AudioQueue.ts'

import {useSyncExternalStore} from 'react'

/** Subscription only: the owner, not a subscribing component, controls the queue lifetime. */
export default function useAudioQueue<T extends object>(queue: AudioQueue<T>) {
  return useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot)
}
