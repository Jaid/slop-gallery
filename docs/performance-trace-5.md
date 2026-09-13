# Performance trace 5

## Findings

Reviewed the user-supplied temp/trace_5.json5 (about 1.20 GB / 5.35 million trace events) after commits 1c13916 and 65ae526. The CPU profile covers 309.12 seconds. The application uses development mode, telemetry, quality graphics and shots=10. Jaid confirmed the boards, walls and floor are graphically correct.

| Measurement | Trace 4 | Trace 5 |
| --- | ---: | ---: |
| Sampled createImageBitmap self time | about 134.15 s | 0.0033 s |
| Longest RunMicrotasks event | 133.55 s | 0.0195 s |
| Total RunMicrotasks wall duration | 134.59 s | 0.446 s |

The huge bitmap synchronization stall is gone. Trace 5 also samples only 0.0025 s in copyExternalImageToTexture and 0.0018 s in writeTexture. API-entry timings do not measure GPU-side completion, but there is no evidence for another texture-format change as the next optimization.

The remaining startup signal is **238.28 s of cumulative GPUTask wall duration / 223.12 s of thread CPU time**. The longest task takes 14.78 s wall / 14.62 s CPU. There are 39 tasks longer than one second, starting between about 4.2 and 199.1 seconds after navigation. Several intervening 30-second windows have no renderer animation-frame callbacks while the GPU service remains busy.

Two early animation callbacks themselves take 5.23 and 5.83 seconds. Three node building accounts for about 10.65 seconds of inclusive sampled time, mostly near startup. First contentful paint is about 2.40 seconds after navigation, but that is UI text, not a ready gallery.

### Shader variants

Passive live inspection found 256 cached render pipelines and 498 shader programs (246 vertex / 252 fragment), totaling about 12.66 MB of source. Representative fragment programs are around 68–81 KB each.

Source comparison confirmed paired full-material variants:
- The main postprocessing scene pass writes color and view normals to two MRT attachments for GTAO.
- The planar reflection pass writes one color attachment; Three's reflector explicitly clears MRT.

This supports changing when full-material pipelines are compiled. The capture has no native compiler stacks, so it cannot prove that every second of GPU-process work is compilation or rank materials by native compile latency. The short sampled createRenderPipeline call does not imply cheap work in the separate GPU process.

## Implemented startup change

Jaid approved neutral placeholders with progressive, nearest-first full materials.

ProgressiveKnotMaterials observes the real scene/camera/render-target/MRT combinations used to render each placeholder. After the frame, it compiles **one material at a time**, across its observed contexts, through Three's asynchronous node builder and native createRenderPipelineAsync path. It activates the full material only after those contexts finish. Moving the player updates the priority of queued work; an in-flight compile is not restarted. Unseen meshes are admitted when first rendered.

The mesh, full-resolution geometry, raycasting and physics exist immediately. Final material quality, reflections, AO and lighting are unchanged. Failures are reported once and leave a placeholder rather than poisoning the rest of the queue. Disposal waits for in-flight compilation before releasing shared geometry, materials and environment; StrictMode effect replay uses disposable-lifetime ownership.

Each material emits a knot.material.compile performance measure with its ID, context count and status, so subsequent traces can identify slow material warmups directly.

### Validation and limits

A detached browser test renders a real Captured Tempest material into both color+normal MRT and single-color targets while compilation proceeds. Its initial run completed 1,463 render iterations during a roughly 27-second warmup. Later driver-cache-warm runs are much shorter and are not cold-start measurements. The test verifies two native asynchronous material pipelines, no new shader programs or synchronous full-material pipelines on activation, and zero WebGPU validation errors. Three may still initialize small shared transfer/mipmap pipelines on first use.

Passive inspection also confirmed that the live gallery reported ready for entry while 40 Knots still had placeholder materials.

This verifies the staged rendering mechanism, **not** a cold-start FPS guarantee for the entire gallery. It does not eliminate total native compilation cost. Contexts first introduced later (for example by changing rendering configuration) can still require additional variants. This is not an unconditional compile-all-shadow/reflection/postprocessing promise.

No browser input, navigation, focus or viewport changes were simulated.

## Steady-state CPU corrections

### Picking

The interaction frame callback accounts for about 23.51 s inclusively; its intersectObject calls account for about 22.62 s. The hot stack walks Knot triangles through getVertexPosition, fromBufferAttribute and intersectTriangle.

Knot resources now build one shared indirect BVH for their identical CPU triangle topology, reused across displacement-bound geometry variants. Only Knot mesh instances receive accelerated raycasts; Three prototypes are untouched. The interaction ray requests the nearest hit, while other raycasters still receive all hits.

Expanded culling/collider bounds, GPU displacement, triangle order, face IDs, UVs and material-side semantics are unchanged. Native CPU picking already ignores shader-only vertex displacement; the BVH retains that behavior.

An isolated Bun benchmark of 1,000 deterministic rays took about 2,169 ms with native picking versus 8.0 ms with BVH nearest-hit picking. Both returned 740 hit rays and the same sum of nearest distances. This is a picking microbenchmark, not a browser FPS or startup-speed claim. Regression tests compare both paths across transformed meshes, both geometry variants, all material sides and near/far clipping.

### Label transforms

InstancedPropVisuals.update accounts for about 6.43 s inclusively. Each sign's source transform was resolved and updated separately for five visual layers. It is now resolved and updated once, then reused across layers. Per-layer inverse transforms, float32 change detection, uploads and bounding-volume rebuilds retain their previous behavior. Tests cover moving, missing and replaced sources and unchanged instance buffers.

## Measurement caveats

Profile self time is sampled wall time, not native thread CPU time. Inclusive stack totals overlap and must not be added. GPU-process task durations measure CPU-side processing, not GPU timestamp-query execution. Trace 4 and trace 5 cover different intervals, so their cumulative totals are not a startup-speed comparison. Development and production results also need separate measurements.

## Reusable material queue extraction

The compilation mechanism now lives in packages/three-async-materials as the React-independent AsyncMaterials class. ProgressiveKnotMaterials remains a small gallery owner for KnotResources, neutral placeholders, live distance priority and knot.material.compile telemetry. The package never disposes caller-owned resources; the gallery waits for queue shutdown before releasing them. The package GPU fixture and the real Captured Tempest integration fixture both verify asynchronous main/reflection variants. This extraction preserves behavior and is not a new performance claim.
