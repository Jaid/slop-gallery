# telemethree

Composable metrics, logs, explicit traces and Three statistics. The core has no React runtime dependency, network destination, global instrumentation or timers until started. Optional hooks target Fiber 10’s phased scheduler and React 19.

```tsx
import {Telemetry, OtlpHttpExporter} from 'telemethree'
import {TelemetryProvider, useTelemetry, useThreeTelemetry} from 'telemethree/react/webgpu'

const telemetry = new Telemetry({
  resource: {'service.name': 'my-game'},
  exporter: new OtlpHttpExporter({endpoint: '/otlp'}),
})

function Statistics() {
  useThreeTelemetry()
  return null
}

function Action() {
  const telemetry = useTelemetry()
  return <button onClick={() => telemetry.count('game.actions')}>Act</button>
}

// Place the provider around the app and Statistics inside Canvas.
// <TelemetryProvider telemetry={telemetry}><Canvas><Statistics/></Canvas><Action/></TelemetryProvider>
```

Use `/react` with Canvas from `@react-three/fiber`, or `/react/webgpu` with Canvas from `@react-three/fiber/webgpu`. Do not mix Fiber entry points. `useTelemetry` works outside Canvas too. Alternatively, `useThreeTelemetry({telemetry})` accepts an explicit instance. Providers and collection hooks acquire reference-counted delivery timers and clean up on unmount, including StrictMode. Keep the client and optional attribute objects stable across renders.

## Core API

```ts
const stop = telemetry.start()
telemetry.metric('game.temperature', 32, {unit: 'Cel', attributes: {room: 'engine'}})
telemetry.count('game.actions', 1, {attributes: {action: 'jump'}})
telemetry.log('Level ready.', 'info', {level: 'one'})

await telemetry.trace('load-level', async span => {
  telemetry.log('Loading.', 'debug', {}, span)
  await loadLevel()
})

const parent = telemetry.startSpan('mission')
const child = telemetry.startSpan('objective', {}, parent)
child.end('ok')
parent.end('ok')

await telemetry.flush()
console.log(telemetry.status())
stop()
await telemetry.dispose()
```

`metric` is a gauge; `count` is a nonnegative cumulative counter with a stable start time per attribute set. Units use UCUM conventions. Nonfinite measurements and negative counter increments are ignored. A name cannot change kind or unit. Traces use random W3C-sized hexadecimal IDs and epoch nanosecond strings on export. Parent context is explicit, so concurrent operations do not share mutable global context. `trace` preserves the operation’s result/error and records error type, not potentially sensitive exception messages. `Span.end` is idempotent.

Implement `TelemetryExporter.export(batch)` to consume any signal or use `OtlpHttpExporter` for OTLP/HTTP JSON. It supports a collector base URL, per-signal endpoint overrides, headers, an injectable fetch and a 10-second timeout. Credentials are omitted and redirects are rejected. Collector CORS, HTTPS and authentication remain the host’s responsibility; use a same-origin relay for private infrastructure.

### Delivery contract

- Default flush interval: 5000 ms. Each flush sends one batch per signal concurrently, with at most 256 records and approximately 65 kb of internal record data. Records queued during delivery remain pending.
- Each signal has a 2048-record queue and each record is limited to 16 kb. Overflow drops the newest record. Instrument names and retained counter series are limited to 1024. Use bounded attributes, not object IDs, positions or URLs as labels.
- Network failures and HTTP 429/502/503/504 retry with exponential backoff, jitter and `Retry-After`. Permanent HTTP errors drop the rejected batch. OTLP partial success is never retried.
- `status()` reports pending, sent, dropped, failures, retry time and last error per signal. Export failures do not reject `flush()` or emit recursive telemetry logs.
- Queues are in memory, not a durable outbox. Retries can duplicate records when acknowledgment is lost. Small requests use fetch keepalive; shutdown attempts are best-effort and may lose pending data. `dispose()` stops timers and recording and attempts one bounded flush, rather than blocking shutdown indefinitely.

## Three statistics

`useThreeTelemetry({intervalMs: 5000, maxSamples: 16384})` observes frame completion without taking over rendering or triggering React state updates. It resets renderer counters in the start phase and reads them after rendering, covering reflections, shadows and postprocessing rather than only the final pass. While mounted it owns `info.autoReset`, restoring the previous value on cleanup. Mount exactly one collector per renderer, including shared multi-canvas renderers. Other code must not reset `renderer.info` between these phases.

| Metrics | Meaning |
| --- | --- |
| `three.fps` | 1000 / mean frame interval in milliseconds |
| `three.frame.duration.mean`, `.p95`, `.p99`, `.max` | Wall-clock frame intervals in milliseconds, not GPU execution time |
| `three.frame.samples` | Number of intervals retained in the sample window |
| `three.render.draw_calls`, `.triangles`, `.points`, `.lines` | Last completed frame, summed across render passes |
| `three.memory.geometries`, `.textures`, `.programs`, `.bytes` | Renderer-reported resources; programs/bytes emitted only when available |
| `three.scene.objects`, `.meshes`, `.visible_meshes`, `.instances` | Scene inventory, traversed once per reporting interval |

Percentiles use nearest rank. At most the most recent 16 384 intervals are retained per reporting window. Hidden-page intervals and the first frame after resumption are excluded. Wall-clock timing bypasses Fiber’s clamped simulation delta, preserving real stalls. Demand rendering measures intervals between callbacks; idle scenes produce no samples. Visible meshes means visible ancestry, not frustum/occlusion/material-tested draw counts. Instances count scene instance slots. Memory bytes are Three’s estimate, not driver-wide VRAM usage.

Outside React, use `ThreeStatistics(telemetry, renderer.info, scene, options)`, acquire `connect()`, call `beginFrame()` before all passes and `endFrame(actualDeltaSeconds)` afterward, then release the returned cleanup. Call `reset()` across suspension/discontinuities.

Protocol reference: [OTLP specification](https://opentelemetry.io/docs/specs/otlp/).
