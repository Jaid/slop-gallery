# disposable-lifetime

Reference-counted ownership for objects with a synchronous `dispose()` method. The core has no React or renderer dependency.

`retain()` returns an idempotent release function. Final disposal is queued for the next microtask: a synchronous release–retain sequence (such as React StrictMode effect replay) keeps the resource alive. Multiple leases are supported; disposal runs exactly once after the final release. Retaining an already disposed lifetime throws.

```ts
import DisposableLifetime from 'disposable-lifetime'

const lifetime = new DisposableLifetime(resource)
const release = lifetime.retain()
// Use the resource.
release()
```

## React

```tsx
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

const texture = useDisposable(useMemo(() => createTexture(), []))
```

The hook returns the same resource and owns its final disposal, including dependency replacement. Give each memoized resource one owning hook. Do not also dispose it from another effect or renderer auto-disposal. This is for resources that already exist during render; asynchronously prepared resources should instead be created and owned inside their effect, with cancellation for late results.

Disposal is terminal: this does not resurrect disposed objects. The microtask grace period is not a cache or a timeout-based eviction policy.
