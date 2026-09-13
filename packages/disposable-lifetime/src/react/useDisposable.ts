import type {Disposable} from '../DisposableLifetime.ts'

import {useEffect, useMemo} from 'react'

import DisposableLifetime from '../DisposableLifetime.ts'

/** One owner per memoized resource. StrictMode effect replay is not a final unmount. */
export default function useDisposable<T extends Disposable>(resource: T) {
  const lifetime = useMemo(() => new DisposableLifetime(resource), [resource])
  useEffect(() => lifetime.retain(), [lifetime])
  return resource
}
