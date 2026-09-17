import type {DisposableResource} from '../disposeResource.ts'

import {useEffect, useMemo} from 'react'

import disposeResource from '../disposeResource.ts'
import RetainedLifetime from '../RetainedLifetime.ts'

/** One owner per memoized resource. StrictMode effect replay is not a final unmount. */
export default function useDisposable<T extends DisposableResource>(resource: T) {
  const lifetime = useMemo(() => new RetainedLifetime(() => disposeResource(resource)), [resource])
  useEffect(() => {
    const lease = lifetime.retain()
    return () => lease[Symbol.dispose]()
  }, [lifetime])
  return resource
}
