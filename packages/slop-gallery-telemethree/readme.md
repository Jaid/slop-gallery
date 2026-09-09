# slop-gallery-telemethree

Slop Gallery instrumentation layered on `telemethree` and `telemethree-ego`, with Victoria delivery. It uses structural gallery-state/event contracts, never imports application source and can be consumed as a packed package.

```ts
import {SlopGalleryTelemetry} from 'slop-gallery-telemethree'

const telemetry = new SlopGalleryTelemetry({endpoint: '/api/telemetry'})
const disconnect = telemetry.connect(galleryStore, galleryEvents)
const ego = telemetry.createEgo({read: readPlayerAndAim})
// Call ego.update() after controller/camera updates, then disconnect on unmount.
```

`useSlopGalleryTelemetry(telemetry, store, events)` from `/react` pairs subscriptions with cleanup and attempts a flush on pagehide/visibility loss. A null client disables the hook. Use the reusable Three and ego hooks inside Canvas with this same client.

## Gallery signals

- Five-second gauges: portrait totals and hung/imported/pending/merging counts, readiness, pointer lock, AI enabled, holding, inspection, narration activity, save errors and storage recovery. `gallery.room.active{room}` emits a bounded one-hot series for every room, including zero for rooms that were left.
- Logs and event counters: attachment, room changes, menu/lock/readiness changes, collection revisions, resets, narration transitions and import/merge/narration/teleport requests.
- Traces: correlated event spans and real persistence duration/outcome. The application additionally wraps label generation and local/AI fusion in operation spans.
- Ego measurements use the controller’s physical feet position and collision-corrected velocity, plus the existing `AimInspector` semantics. The camera provides aim, not locomotion. Raycasting runs once per second, not every rendered frame.

Only counts, flags, state names and numeric player/aim measurements are selected. Keys, artwork sources, titles, descriptions, prompts, event payloads and exception messages are not serialized. A random session ID is attached as `service.instance.id` to distinguish concurrent clients and counter lifetimes. New sessions create new series; retention/cardinality policy belongs to the deployment.

## Existing NAS setup – unchanged

The checked configuration on 2026-09-09 has an OTLP collector for logs/traces only. Its metrics pipeline is not enabled. `VictoriaExporter` therefore uses native [VictoriaMetrics JSON import](https://docs.victoriametrics.com/victoriametrics/url-examples/#apiv1import) for metrics and OTLP/HTTP JSON for logs/traces. Metrics retain dotted names; resource/measurement attributes become labels. Duplicate series samples within the same millisecond in one batch keep their latest value.

The `/vite` entry exports `victoriaTelemetry()` and `createVictoriaRelay()`:

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
