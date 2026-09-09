# telemethree-ego

The player layer between `telemethree` and application-specific instrumentation. No Rapier, input, game-store or development-API dependency.

```tsx
import {useEgoTelemetry} from 'telemethree-ego/react'

function PlayerMetrics({telemetry, controller, aim}) {
  useEgoTelemetry({
    telemetry,
    intervalMs: 1000,
    read: () => ({
      position: controller.position(),
      velocity: controller.velocity(),
      aim: aim.read(), // {origin, direction, hit?: {point, distance} | null}
    }),
  })
  return null
}
```

The single `/react` entry requires `@react-three/fiber/webgpu`. The default-Fiber implementation, injected frame-hook factory and `/react/webgpu` alias have been removed. The hook samples in the finish phase, acquires a delivery timer and releases it on unmount. It skips hidden pages and clears differentiation history on visibility changes. Source functions may change without restarting collection; keep optional attribute objects stable.

The framework-independent `EgoTelemetry` accepts the same options. Call `update()` each frame; its cheap cadence gate calls the source only when due, including any expensive raycast. `record(sample, monotonicTimeMs?)` bypasses the gate for externally scheduled sampling. Use `telemetry.start()` separately outside React. Return `null` when no player exists. `SlopGalleryTelemetry.createEgo(options)` supplies the shared client automatically.

## Measurements

- `ego.position.x/y/z`: world-space player position in meters.
- `ego.velocity.x/y/z`, `ego.speed`: meters per second. Explicit physical velocity is preferred; camera smoothing, head bob and inspection movement should not count as locomotion.
- `ego.velocity.valid`: whether velocity is available. If omitted, velocity is differentiated from copied positions and monotonic timestamps. The first sample, a gap longer than `maxVelocityGapMs` (default 3× the interval), `reset()` or `discontinuity: true` suppresses differentiation. Explicit velocity remains authoritative during discontinuities. Mark teleports explicitly when deriving velocity.
- `ego.aim.origin.x/y/z`, `ego.aim.direction.x/y/z`: world-space aim ray, with normalized direction.
- `ego.aim.yaw`, `ego.aim.pitch`: radians; zero yaw points along −Z, positive pitch looks up.
- `ego.aim.valid`, `ego.aim.hit`: validity flags.
- `ego.aim.distance`, `ego.aim.point.x/y/z`: hit distance and position in meters.

`metersPerUnit` defaults to 1 and scales positions, velocities and hit distances. No coordinate, object identity or direction becomes a metric label. Caller attributes should be bounded dimensions such as a local player slot. No-hit and invalid-aim samples emit zeroed hit fields and validity flags; filter on those flags rather than interpreting zero as a real hit. Invalid player positions are discarded. Raycasting/filtering belongs to the source, allowing reuse of the game’s actual aiming logic rather than introducing a second definition of “aim”.
