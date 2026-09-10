# telemethree

Composable metrics, logs, explicit traces and Three statistics. The core has no React runtime dependency, network destination, global instrumentation or timers until started. Optional hooks target Fiber 10’s phased scheduler and React 19.

```tsx
import {Telemetry, OtlpHttpExporter} from 'telemethree'
import {TelemetryProvider, useTelemetry, useThreeTelemetry} from 'telemethree/react'

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

The single `/react` entry uses Canvas from `@react-three/fiber/webgpu` exclusively. The former default-Fiber implementation and `/react/webgpu` alias have been removed. `useTelemetry` works outside Canvas too. Alternatively, `useThreeTelemetry({telemetry})` accepts an explicit instance. Providers and collection hooks acquire reference-counted delivery timers and clean up on unmount, including StrictMode. Keep the client stable across renders; callback options can read changing state.

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

`useThreeTelemetry({intervalMs: 5000, maxSamples: 16384})` resets renderer counters in Fiber’s start phase and reads them in its finish phase, after reflections, shadows and postprocessing. It owns `info.autoReset` and restores it on cleanup. Mount exactly one collector per renderer; no other code may reset its counters between those phases.

Frame intervals and renderer workload now use **the same exact sample window**. A window closes at five seconds, sample capacity, a context/output change, visibility loss or disconnect. Capacity triggers an early report rather than silently dropping old frames. Percentiles use nearest rank; means and counts cover every accepted interval. The first interval on mount/resume is excluded. Hidden time is never interpreted as a hitch. Demand-rendered idle gaps remain wall intervals, not active rendering time.

```tsx
useThreeTelemetry({
  telemetry,
  getAttributes: () => ({room: game.room, locked: game.locked}),
  getTraceContext: () => gameplaySpan,
  getHitchAttributes: () => ({'ego.speed': player.speed}),
  gpuIntervalMs: 1000,
  hitchThresholdMs: 100,
  hitchCooldownMs: 5000,
})
```

Callbacks read fresh state without recreating the collector. Keep labels categorical and bounded. Room, pointer lock and graphics flags belong in attributes; resolution, DPR, coordinates and frame/context IDs do not. Attributes and output dimensions are captured at frame start; a room transition during that frame takes effect on the next frame. Frame duration is a finish-to-finish wall interval, so it also includes browser scheduling/presentation waits, not just that frame’s render submission.

| Metrics | Meaning |
| --- | --- |
| `three.fps` | Accepted frames / total interval duration |
| `three.frame.duration.{mean,p50,p95,p99,max}` | Wall intervals in milliseconds |
| `three.frame.samples` | Number of frames in this exact window |
| `three.frames` | Cumulative accepted frames per attribute set |
| `three.frames.slow{threshold.ms}` | Cumulative frames strictly exceeding 16.67, 33.33, 50, 100, 250 or 1000 milliseconds; thresholds overlap |
| `three.render.{passes,draw_calls,triangles,points,lines}.{mean,p50,p95,p99,max}` | Per-frame work aggregated over the identical window |
| `three.compute.calls.{mean,p50,p95,p99,max}` | Per-frame compute calls over that window |
| `three.output.{pixel_ratio,width,height,pixels,samples}` | Actual drawing-buffer workload; output changes split windows |
| `three.memory.{geometries,textures,programs,render_targets,attributes,index_attributes,storage_attributes,indirect_storage_attributes,uniform_buffers,readback_buffers}` | Current renderer resource counts |
| `three.memory.total.bytes` and `three.memory.<category>.bytes` | Current estimated bytes; categories exclude geometries and render targets, which have no independent size field |
| `three.scene.{objects,meshes,visible_meshes,instances}` | Current scene inventory; visible ancestry is not frustum/occlusion visibility |

Memory and scene inventory remain instantaneous snapshots at report emission, not distributions. Memory is Three’s estimate, not physical VRAM; geometry data resides in attribute/index buffers and render-target textures already contribute to texture bytes. No double-counted geometry/target size is invented.

**Schema migration:** the former unsuffixed `three.render.*` and `three.compute.calls` final-frame gauges are removed; use `.mean`, `.max` or another distribution statistic. `three.memory.bytes` becomes `three.memory.total.bytes`. Old retained series should not be mixed with the new schema.

### Sparse GPU diagnostics

Construct the renderer with `trackTimestamp: true`. After initialization, the collector checks both this opt-in and the device’s actual `timestamp-query` feature. It installs a `ThreeInspector` only in place of the default `InspectorBase`; existing custom inspectors and their timing policy are left alone.

Timestamp **writes and readbacks** are enabled for one diagnostic frame per second, with an immediate follow-up sample after an admitted hitch. Other frames do not incur timestamp writes. There is only one in-flight readback group, with render and compute resolutions started together. This avoids continuously filling r186’s query pools and their automatic overflow readbacks. The collector restores the previous inspector and tracking setting on disconnect.

- `three.gpu.timestamp_query.available`: capability + opt-in + collector ownership, not a test for nonzero duration.
- `three.inspector.available` and `three.browser.long_animation_frame.available`: diagnostic availability.
- `three.gpu.{render,compute}.duration`: summed elapsed GPU milliseconds for the sampled frame’s exact context UIDs.
- `three.gpu.{render,compute}.frame_duration`: that sample’s associated wall interval, useful beside its GPU duration rather than an unrelated five-second percentile.
- `three.gpu.{render,compute}.samples`: cumulative successfully resolved diagnostic frames.

Only fresh, complete UID matches produce totals. A missing pool, stale resolution, truncated pass list, unsupported feature or invalidated readback produces **no duration**, not a synthetic zero. Async results retain the sampled context. Compute duration is absent when no compute calls ran. Resolutions after visibility reset/disconnect are ignored. The returned `info.*.timestamp` value alone is never trusted: r186 can return its previous value.

An unsampled hitch cannot be GPU-timed retroactively. Its follow-up sample describes the next frame, never the original hitch. Even a matched GPU duration is not a complete accounting of wall time: CPU/GPU work can overlap and the interval includes browser scheduling.

### Hitch traces and browser attribution

Frames ≥100 milliseconds produce sparse `three.frame.hitch` spans with historical start/end times, workload, drawing-buffer size, memory state and previous-frame resource deltas, scene inventory and optional application attributes/parent. A five-second cooldown applies separately to ≥100, ≥250 and ≥1000-millisecond severity levels; escalation bypasses lower-severity cooldowns. All slow frames still contribute to metrics.

The inspector retains at most 128 pass descriptions for the current frame, with no retained Three objects. Hitch events contain UID, broad pass kind, optional application name, target size/samples, inclusive CPU time and exact GPU duration when available. Nested CPU times overlap and must not be summed. Shadow classification recognizes r186’s `ShadowMap` target name; fullscreen and offscreen classifications are structural heuristics, not claims that a pass is GTAO/bloom. Supply `describePass(scene, camera, target)` for application-owned semantic names.

Hitches wait up to 500 milliseconds for late GPU/browser attribution, without extending their recorded duration. At most four are pending. The feature-detected Long Animation Frames observer retains 16 entries, attaches only overlapping entries and includes the four most expensive scripts per entry. Source URLs omit credentials, query strings and fragments; source/function strings are length-limited. A missing LoAF is not proof that the CPU was idle. Pass events are ordered by cost before bounded span-event storage truncates them; `droppedEventsCount` and `render.pass_details.dropped` expose truncation.

Outside React, construct `ThreeStatistics(telemetry, renderer, scene, options)`, acquire `connect()`, call `beginFrame()` before all passes and `endFrame(actualDeltaSeconds)` afterward, then call the returned cleanup. Call `reset()` across suspension/discontinuities.

### Span events

`span.addEvent(name, attributes, epochMs?)` snapshots events, up to 64 events and 8192 serialized event bytes per span. Overflow increments OTLP `droppedEventsCount`; events after `end()` are ignored. Long-lived sessions therefore cannot grow unboundedly. `startSpan(name, attributes, parent, startTime?)` and `span.end(status, attributes, endTime?)` support historical epoch-millisecond timestamps for browser observations.

References: [Three backend timestamp API](https://threejs.org/docs/pages/Backend.html), [renderer API](https://threejs.org/docs/pages/Renderer.html), [Long Animation Frames](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming) and [OTLP](https://opentelemetry.io/docs/specs/otlp/). Implementation semantics were checked against installed Three 0.186.0, including its query-pool and inspector source.
