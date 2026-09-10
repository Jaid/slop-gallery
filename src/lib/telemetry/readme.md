# Gallery telemetry

Slop Gallery instrumentation layered on `telemethree` and `telemethree-ego`, with Victoria delivery. This application-specific implementation lives in `src/lib/telemetry`; only the reusable Three and player telemetry layers are workspace packages.

The browser-only `index.ts` owns the configured `telemetry` singleton and the controller’s `playerTelemetry` source. Import the classes directly when constructing an isolated client, such as in unit tests.

```ts
import {SlopGalleryTelemetry} from '#src/lib/telemetry/SlopGalleryTelemetry.ts'

const telemetry = new SlopGalleryTelemetry({endpoint: '/api/telemetry'})
const disconnect = telemetry.connect(galleryStore, galleryEvents)
const ego = telemetry.createEgo({read: readPlayerAndAim})
// Call ego.update() after controller/camera updates, then disconnect on unmount.
```

`useSlopGalleryTelemetry(telemetry, store, events)` from `useSlopGalleryTelemetry.ts` pairs subscriptions with cleanup and attempts a flush on pagehide/visibility loss. A null client disables the hook. Use the reusable Three and ego hooks inside Canvas with this same client.

## Gallery signals

- Five-second gauges: portrait totals and hung/imported/pending/merging counts, readiness, pointer lock, AI enabled, holding, inspection, narration activity, save errors and storage recovery. `gallery.room.active{room}` emits a bounded one-hot series for every room, including zero for rooms that were left.
- Logs and event counters: attachment, room changes, menu/lock/readiness changes, collection revisions, resets, narration transitions and import/merge/narration/teleport requests.
- Traces: session/startup/gameplay parents, state-change events, real persistence duration/outcome, label generation and local/AI fusion, plus sparse renderer hitch diagnostics.
- Ego measurements use the controller’s physical feet position and collision-corrected velocity, plus the existing `AimInspector` semantics. The camera provides aim, not locomotion. Raycasting runs once per second, not every rendered frame.

Only counts, flags, state names and numeric player/aim measurements are selected. Keys, artwork sources, titles, descriptions, prompts, event payloads and exception messages are not serialized. A 15-character `compose-id` session ID is attached as `service.instance.id` to distinguish concurrent clients and counter lifetimes. New sessions create new series; retention/cardinality policy belongs to the deployment.

## Existing NAS setup – unchanged

The checked configuration on 2026-09-09 has an OTLP collector for logs/traces only. Its metrics pipeline is not enabled. `VictoriaExporter` therefore uses native [VictoriaMetrics JSON import](https://docs.victoriametrics.com/victoriametrics/url-examples/#apiv1import) for metrics and OTLP/HTTP JSON for logs/traces. Metrics retain dotted names; resource/measurement attributes become labels. Duplicate series samples within the same millisecond in one batch keep their latest value.

The server-only `vite.ts` module exports `victoriaTelemetry()` and `createVictoriaRelay()`:

| Same-origin POST route | Fixed upstream destination |
| --- | --- |
| `/api/telemetry/metrics` | `http://10.0.0.22:3304/api/v1/import` |
| `/api/telemetry/logs` | `http://10.0.0.22:4318/v1/logs` |
| `/api/telemetry/traces` | `http://10.0.0.22:4318/v1/traces` |

The relay avoids browser CORS/private-network access, omits cookies and authorization forwarding, rejects cross-origin browser requests and bounds request bodies to 262 kb. It only accepts exact routes, POST and the correct content type. Destinations are server-controlled. Network failures return 502 for retry. Keep this development relay bound to loopback; it is not an authenticated public ingestion gateway.

The Vite config supports server-only `SLOP_VICTORIA_METRICS_URL`, `SLOP_VICTORIA_LOGS_URL` and `SLOP_VICTORIA_TRACES_URL`, each a full upstream URL. No NAS configuration changes are needed.

The app enables telemetry in Vite development by default. `?telemetry=false` disables it; `?test=true` also disables it. Production builds are off unless `VITE_TELEMETRY_ENDPOINT` is set to a relay prefix (for example `/api/telemetry`). Static hosting must supply that relay separately; the Vite plugin also supports local preview. `?ai=false` disables AI, not telemetry; use both flags for a fully local session.

With `?development=true`, inspect `window['slop.gallery'].getTelemetry()` for the session ID and per-signal pending/sent/dropped/retry/error status. This is read-only. Delivery is bounded and best-effort; upstream acceptance is not a durable end-to-end acknowledgment.

## Queries

MetricsQL:

```text
{__name__="three.fps","service.name"="slop-gallery"}
{__name__="three.frame.duration.p99","service.name"="slop-gallery"}
{__name__="ego.speed","service.name"="slop-gallery"}
```

VictoriaLogs LogsQL:

```text
_time:10m "service.name":="slop-gallery"
```

VictoriaTraces’ underlying LogsQL fields use a resource prefix:

```text
_time:10m "resource_attr:service.name":="slop-gallery"
```

## Performance capture workflow

Performance reports carry `room`, `locked`, `graphics.profile` and the effective shadows/postprocessing/floor-reflections/noise-textures flags. Dimensions and DPR are metric values, not labels. Room, lock, graphics and output changes split the window; use the new workload distribution names, not retained unsuffixed final-frame gauges.

The gallery renderer opts into timestamp queries only when telemetry is enabled. It traces actual `init()` and `compileAsync()` calls. **No new compile/prewarm operation is introduced**: prewarming would change the baseline, and a camera-only scene compile would not warm every shadow/reflection/postprocessing variant. That is a separate optimization decision after capture.

`gallery.session` parents startup and pointer-lock gameplay intervals. Startup ends on readiness; unlock ends gameplay. State changes are bounded span events with the existing correlated logs/counters, not independent traces. Save/AI/merge operations inherit the active context at their start and retain it across async boundaries. Parent spans export when ended, so an ongoing session/gameplay parent may not yet be visible. Pagehide closes the attachment and attempts delivery; pageshow reconnects after a back/forward-cache restore. Event overflow is explicit; logs continue independently.

The app flushes every second to drain the richer reports without growing an online backlog; statistics still report every five seconds. Delivery remains bounded and best-effort. Use `getTelemetry()` to check dropped records or failed delivery before interpreting missing GPU/trace data.

### Manual comparison

1. Reload with `?development=true&telemetry=true&graphics=quality`.
2. Enter and walk a repeatable route through the problematic rooms, including turns toward shadow-heavy interiors. Pause briefly in each room.
3. Note any long freeze and its approximate time.
4. Repeat with `graphics=performance`. Do not compare different rooms, pointer-lock states or output sizes as if only the profile changed.
5. Compare aligned workload distributions, sampled GPU/wall timing and hitch details. A second run with `telemetry=false` can assess observer overhead, but exports are intentionally absent there.

Example MetricsQL for the proportion of locked frames slower than 33.33 milliseconds, grouped by room/profile:

```text
100 *
sum by (room, graphics.profile) (
  increase({__name__="three.frames.slow","service.name"="slop-gallery",locked="true","threshold.ms"="33.33"}[10m])
)
/
(sum by (room, graphics.profile) (
  increase({__name__="three.frames","service.name"="slop-gallery",locked="true"}[10m])
) > 0)
```

Thresholds overlap; never sum different thresholds together. Counter increases need at least two exported samples; use traces to inspect a one-off short interval.

```text
{__name__=~"three.gpu.render.(duration|frame_duration)","service.name"="slop-gallery"}
{__name__="three.render.passes.mean","service.name"="slop-gallery"}
{__name__=~"three.memory.*bytes","service.name"="slop-gallery"}
```

Hitch spans in VictoriaTraces:

```text
`resource_attr:service.name`:=slop-gallery name:=three.frame.hitch _time:30m
| sort by (_time desc)
| limit 50
```

Use the returned trace ID for the gameplay/startup/operation context. Detailed pass UIDs and script URLs exist only in traces, never metric labels. GPU samples are sparse; missing GPU time is unknown, not evidence of a CPU-only stall.
