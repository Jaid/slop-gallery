# Gallery telemetry

Slop Gallery’s application-specific instrumentation is built directly on `victoria-browser-client`. The reusable `telemethree`, `telemethree-ego` and `telemethree-pause-menu` packages now contain collection/instrumentation only; Victoria queueing, encoding, retry, transport, delivery status and browser lifecycle behavior belong to `victoria-browser-client`.

The browser-only `index.ts` owns the configured `telemetry` singleton and the controller’s `playerTelemetry` source. Import `SlopGalleryTelemetry` directly when constructing an isolated client, such as in unit tests.

```ts
import SlopGalleryTelemetry from '#src/lib/telemetry/SlopGalleryTelemetry.ts'

const telemetry = new SlopGalleryTelemetry({endpoints: {logs: 'https://logs.example.com/insert/jsonline'}})
const disconnect = telemetry.connect(galleryStore, galleryEvents)
const ego = telemetry.createEgo({read: readPlayerAndAim})
// Call ego.update() after controller/camera updates, then disconnect on unmount.
```

`useSlopGalleryTelemetry(telemetry, store, events)` pairs gallery subscriptions with React cleanup. A null client disables the hook. Use the reusable Three and ego hooks inside Canvas with the same Victoria client. The hook closes application-owned session/gameplay spans on `pagehide` and reconnects after `pageshow`; `victoria-browser-client` owns the actual bounded keepalive transport, visibility delivery and periodic scheduler.

## Gallery signals

- Five-second gauges: portrait totals and hung/imported/pending/merging counts, readiness, pointer lock, AI enabled, holding, inspection, narration activity, save errors and storage recovery. `gallery.room.active{room}` emits a bounded one-hot series for every room, including zero for rooms that were left.
- Logs and event counters: attachment, room changes, menu/lock/readiness changes, collection revisions, resets, narration transitions and import/merge/narration/teleport requests.
- Traces: session/startup/gameplay parents, state-change events, real persistence duration/outcome, label generation and local/AI fusion, plus sparse renderer hitch diagnostics.
- Ego measurements use the controller’s physical feet position and collision-corrected velocity, plus the existing `AimInspector` semantics. The camera provides aim, not locomotion. Raycasting runs once per second, not every rendered frame.

Automatic telemetry selects only counts, flags, state names and numeric player/aim measurements. Explicit X-key dumps (only with `?development`) additionally include scene object names and scalar metadata as described below. Those automatic samples do not serialize keys, artwork sources, titles, descriptions, prompts, event payloads or exception messages. `victoria-browser-client` supplies the 15-character `service.instance.id` used to distinguish concurrent clients and counter lifetimes. New sessions create new series; retention/cardinality policy belongs to the deployment.

## Victoria delivery

Telemetry is opt-in in every build. Without `?telemetry=true`, the `telemetry` singleton is `null` and nothing is collected or sent. `?ai=false` disables AI, not telemetry.

The browser sends straight to Victoria. There is no relay, Vite proxy or default endpoint. Pass a full ingestion URL per signal; a signal without one is not sent:

| Signal | URL parameter | Format | Example |
| --- | --- | --- | --- |
| logs | `logs_ingestion_endpoint` | VictoriaLogs JSON lines | `https://logs.example.com/insert/jsonline?_stream_fields=service.name` |
| metrics | `metrics_ingestion_endpoint` | VictoriaMetrics JSON import | `https://metrics.example.com/api/v1/import` |
| traces | `traces_ingestion_endpoint` | OTLP/HTTP JSON | `https://traces.example.com/insert/opentelemetry/v1/traces` |

The endpoint parameters only apply together with `?telemetry=true`. Remember to URL-encode them. The ingestion hosts must accept unauthenticated POSTs and answer CORS preflights for the gallery origin. Native logs use `_msg`, `level` and flattened resource/attribute fields instead of OTLP’s `severity_text`. VictoriaLogs rejects OTLP JSON, so logs always use JSON lines. Metrics retain dotted names, while resource and measurement attributes become VictoriaMetrics labels. The Victoria client bounds request/item sizes, refuses redirects, omits browser credentials and keeps unload requests within its keepalive limit.

Native WebMCP `get_telemetry` returns the session ID plus `collectionStatus()` and `status()` from `victoria-browser-client`. This is read-only. Delivery is bounded and best-effort; HTTP acceptance is not a durable end-to-end storage guarantee.

## Queries

MetricsQL:

```text
{__name__="three.fps","service.name"="gallery"}
{__name__="three.frame.duration.p99","service.name"="gallery"}
{__name__="ego.speed","service.name"="gallery"}
```

VictoriaLogs LogsQL:

```text
_time:10m "service.name":="gallery"
```

VictoriaTraces’ underlying LogsQL fields use a resource prefix:

```text
_time:10m "resource_attr:service.name":="gallery"
```

## Performance capture workflow

Performance reports carry `room`, `locked`, `graphics.profile` and the effective shadows/postprocessing/floor-reflections/noise-textures flags, plus `graphics.anti_aliasing` (`traa`, `smaa` or `none`). Dimensions and DPR are metric values, not labels. Room, lock, graphics and output changes split the window; use the new workload distribution names, not retained unsuffixed final-frame gauges.

The gallery renderer opts into timestamp queries only when telemetry is enabled. It traces actual `init()` and `compileAsync()` calls. The load-time pipeline warmup (see the rendering readme) runs as ordinary frames behind the loading screen, not as `compileAsync()`.

`gallery.session` parents startup and pointer-lock gameplay intervals. Startup ends on readiness; unlock ends gameplay. State changes are bounded span events with the existing correlated logs/counters, not independent traces. Save/AI/merge operations inherit the active context at their start and retain it across async boundaries. Parent spans export when ended, so an ongoing session/gameplay parent may not yet be visible. On `pagehide`, the app ends those open gallery spans before requesting a final client flush; the Victoria browser client owns transport semantics and also handles visibility/page lifecycle delivery. Event overflow is explicit; logs continue independently.

The Victoria client schedules delivery every second while statistics still report every five seconds. Delivery remains bounded and best-effort. Use `get_telemetry` to inspect collection limits, pending records, rejection/drop counts and delivery failures before interpreting missing GPU/trace data.

### Manual comparison

1. Reload with `?development=true&telemetry=true&graphics=heavy`.
2. Enter and walk a repeatable route through the problematic rooms, including turns toward shadow-heavy interiors. Pause briefly in each room.
3. Note any long freeze and its approximate time.
4. Repeat with `graphics=fast`. Do not compare different rooms, pointer-lock states or output sizes as if only the profile changed.
5. Compare aligned workload distributions, sampled GPU/wall timing and hitch details. A second run with `telemetry=false` can assess observer overhead, but exports are intentionally absent there.

Example MetricsQL for the proportion of locked frames slower than 33.33 milliseconds, grouped by room/profile:

```text
100 *
sum by (room, graphics.profile) (
  increase({__name__="three.frames.slow","service.name"="gallery",locked="true","threshold.ms"="33.33"}[10m])
)
/
(sum by (room, graphics.profile) (
  increase({__name__="three.frames","service.name"="gallery",locked="true"}[10m])
) > 0)
```

Thresholds overlap; never sum different thresholds together. Counter increases need at least two exported samples; use traces to inspect a one-off short interval.

```text
{__name__=~"three.gpu.render.(duration|frame_duration)","service.name"="gallery"}
{__name__="three.render.passes.mean","service.name"="gallery"}
{__name__=~"three.memory.*bytes","service.name"="gallery"}
```

Hitch spans in VictoriaTraces:

```text
`resource_attr:service.name`:=gallery name:=three.frame.hitch _time:30m
| sort by (_time desc)
| limit 50
```

Use the returned trace ID for the gameplay/startup/operation context. Detailed pass UIDs and script URLs exist only in traces, never metric labels. GPU samples are sparse; missing GPU time is unknown, not evidence of a CPU-only stall.

## Player dumps and WebMCP

With `?development` (or `?development=true`), press X while playing to capture a detached diagnostic snapshot. Without that flag, X does nothing: the player gets no dump handler, so ego-player ignores the key and never creates its diagnostic raycaster. The app prints the snapshot with `console.dir`, copies it to the clipboard in Clank format (via `stringify-clank`) and emits an `ego.dump` log, followed by one `ego.dump.hit` log per visible mesh/instance hit. Join records by `dump.id`; `hit.index` preserves near-to-far order. The summary includes the closest hit, expected hit count, player state, camera matrices/FOV, timestamp, level, room and session ID. Per-hit records keep long sightlines from overflowing a single telemetry record. Normal queue/delivery limits still apply; compare the expected hit count when reconstructing a dump. No dump is sent when telemetry is disabled. Every dump also captures the current frame through the WebGPU capture bridge and downloads it as lossless `<level>-<dump.id>.webp`, independent of telemetry.

Query VictoriaLogs with `service.name:=gallery event.name:=ego.dump _time:1h | sort by(_time desc)` (use `knottingham` for that level). World-space `aim.hit.point` and `aim.hit.normal` in the JSON message provide placement coordinates. Use `dump.id` to retrieve all hit records for a snapshot.

Native WebMCP exposes read-only `get_aim`, `get_telemetry` and `dump_knots` through `document.modelContext`. The first two inspect player aim and telemetry delivery. `dump_knots` returns the current Knottingham world selection with live session rarity edits and returns an empty array on levels without knots. The tools do not move the player, acquire focus or enable telemetry. Their registrations are removed on unmount/HMR using AbortSignals. There is no replacement window namespace or compatibility API.

Pause-menu events use `telemethree-pause-menu`: discrete `pause_menu.attached`, `pause_menu.changed` and `pause_menu.detached` logs include the current/previous stage and lock state. They share the app’s Victoria client and session identity.
