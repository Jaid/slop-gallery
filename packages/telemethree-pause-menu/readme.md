# telemethree-pause-menu

Pause-menu lifecycle logs for `use-pause-menu`, delivered through `telemethree`. The core collector has no React or Three dependency. An exporter decides the destination; Slop Gallery uses VictoriaLogs.

```tsx
import usePauseMenuTelemetry from 'telemethree-pause-menu/react'

const snapshot = usePauseMenuTelemetry({menu, telemetry})
```

For non-React consumers, import `PauseMenuTelemetry` from the package default, then call `new PauseMenuTelemetry({menu, telemetry}).connect()`. Call the returned cleanup on unmount. Keep `attributes` stable when using the hook.

Logs have `event.name` equal to `pause_menu.attached`, `pause_menu.changed` or `pause_menu.detached`, with `pause_menu.stage` and `pause_menu.locked`. Changes include the previous stage and lock state. Stages are `first`, `return`, `reset`, `pause` and `unfocus`; while playing, the last menu stage is retained.

Only actual transitions are logged. Cleanup is idempotent and unsubscribes before stopping delivery. The shared telemetry instance provides session identity, batching, retries and queue limits.
