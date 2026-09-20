# telemethree-ego

Player position, velocity and aim metrics for a `victoria-browser-client`.

```tsx
import useEgoTelemetry from 'telemethree-ego/react'

useEgoTelemetry({
  telemetry,
  read: () => ({
    position: player.position,
    velocity: player.velocity,
    aim: inspector.getAim(),
  }),
})
```

The framework-independent `EgoTelemetry` accepts the same options. Call `update()` each frame; its cadence gate calls the source only when due, including any expensive raycast. `record(sample, monotonicTimeMs?)` bypasses the gate for externally scheduled sampling. Browser delivery and lifecycle are owned by the Victoria client.
