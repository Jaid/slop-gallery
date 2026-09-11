import type {Camera, ComputeNode, RenderTarget, Scene} from 'three/webgpu'

import {InspectorBase} from 'three/webgpu'

export type RenderPassKind = 'fullscreen' | 'main' | 'offscreen' | 'shadow' | 'unknown'
export type RenderPassDescription = {kind: RenderPassKind
  name?: string}
export type DescribeRenderPass = (scene: Scene, camera: Camera, target: RenderTarget | null) => RenderPassDescription | undefined
export type PassSample = {cpuMs?: number
  gpuMs?: number
  height?: number
  kind: RenderPassKind | 'compute'
  name?: string
  samples?: number
  start: number
  uid: string
  width?: number}

/** Metadata only: never retains scenes, cameras, materials or render targets. */
export default class ThreeInspector extends InspectorBase {
  dropped = 0
  readonly passes: Array<PassSample> = []
  private readonly active = new Map<string, PassSample>

  constructor(private readonly now: () => number, private readonly describe?: DescribeRenderPass) {
    super()
  }

  override beginCompute(uid: string, _node: ComputeNode) {
    this.record({
      uid,
      kind: 'compute',
      start: this.now(),
    })
  }

  override beginRender(uid: string, scene: Scene, camera: Camera, target: RenderTarget | null) {
    const description = this.describe?.(scene, camera, target)
    let kind: RenderPassKind = target ? 'offscreen' : 'main'
    if ('isQuadMesh' in scene) {
      kind = 'fullscreen'
    }
    if (target?.texture.name === 'ShadowMap') {
      kind = 'shadow'
    }
    kind = description?.kind ?? kind
    this.record({
      uid,
      kind,
      name: description?.name?.slice(0, 80),
      width: target?.width,
      height: target?.height,
      samples: target?.samples,
      start: this.now(),
    })
  }

  override finishCompute(uid: string) {
    this.finishRender(uid)
  }

  override finishRender(uid: string) {
    const pass = this.active.get(uid)
    if (pass) {
      pass.cpuMs = Math.max(0, this.now() - pass.start)
      this.active.delete(uid)
    }
  }

  reset() {
    this.passes.length = 0
    this.active.clear()
    this.dropped = 0
  }

  private record(pass: PassSample) {
    if (this.passes.length >= 128) {
      this.dropped++
      return
    }
    this.passes.push(pass)
    this.active.set(pass.uid, pass)
  }
}
