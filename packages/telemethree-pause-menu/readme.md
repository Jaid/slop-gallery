# telemethree-pause-menu

Pause-menu lifecycle logs emitted through `victoria-browser-client`.

```tsx
import usePauseMenuTelemetry from 'telemethree-pause-menu/react'

const snapshot = usePauseMenuTelemetry({menu, telemetry})
```

For non-React consumers, construct `PauseMenuTelemetry` with the same Victoria client and call `connect()`. The returned cleanup only owns the menu subscription; delivery scheduling and browser lifecycle belong to the client.
