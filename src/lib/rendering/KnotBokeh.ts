import type {Node, NodeFrame} from 'three/webgpu'

import {Fn as fn, int, Loop as loop, max, mix, smoothstep, step, uniformArray, uv, vec2, vec3, vec4} from 'three/tsl'
import {RTTNode, Vector2} from 'three/webgpu'

const sampleCount = 64
const focusMargin = 0.12
const fullBlurDepthRange = 3
const highlightRetention = 0.14
const minimumWeight = 0.00001

export type KnotBokehOptions = {
  amount: Node<'float'>
  distance: Node<'float'>
  enabled: () => boolean
  radius: Node<'float'>
}

function halton(index: number, base: number) {
  let fraction = 1
  let result = 0
  while (index > 0) {
    fraction /= base
    result += fraction * (index % base)
    index = Math.floor(index / base)
  }
  return result
}
/** Low-discrepancy samples uniformly filling the existing six-bladed aperture. */
function apertureSamples() {
  const result = [new Vector2]
  const halfHeight = Math.sqrt(3) / 2
  for (let index = 1; result.length < sampleCount; index++) {
    const x = halton(index, 2) * 2 - 1
    const y = (halton(index, 3) * 2 - 1) * halfHeight
    if (Math.abs(x) + Math.abs(y) / Math.sqrt(3) <= 1) {
      result.push(new Vector2(x, y))
    }
  }
  return result
}
/** Built-in RTT ownership/state handling, with no GPU work outside the focus transition. */
class FocusTexture extends RTTNode {
  constructor(node: Node<'vec4'>, private readonly enabled: () => boolean, resolutionScale: number) {
    super(node, null, null, {
      depthBuffer: false,
      resolutionScale,
    })
  }

  override updateBefore(frame: NodeFrame): boolean | undefined {
    if (this.enabled()) {
      return super.updateBefore(frame)
    }
    return undefined
  }
}
/** Current-frame, far-field lens blur. RGB stays coverage-premultiplied until the full-resolution composite. */
class KnotBokeh {
  readonly backgroundNode: Node<'float'>
  readonly outputNode: Node<'vec4'>
  private readonly backgroundTexture: FocusTexture
  private readonly blurTexture: FocusTexture

  constructor(source: Node<'vec4'>, viewZ: Node<'float'>, {amount, distance, enabled, radius}: KnotBokehOptions) {
    const viewDistance = viewZ.negate()
    const coverage = step(distance.add(focusMargin), viewDistance)
    this.backgroundNode = smoothstep(distance.add(focusMargin), distance.add(0.32), viewDistance).mul(amount)
    // This pass MUST be full resolution: reject foreground at native pixel centers BEFORE
    // any bilinear sampling, downsampling or temporal reconstruction can mix its color in.
    this.backgroundTexture = new FocusTexture(vec4(source.rgb.mul(coverage), coverage), enabled, 1)
    this.backgroundTexture.name = 'knotFocusSource'
    const background = this.backgroundTexture
    const kernel = uniformArray<'vec2'>(apertureSamples(), 'vec2')
    const blur = fn(() => {
      const coc = smoothstep(distance.add(focusMargin), distance.add(fullBlurDepthRange), viewDistance).mul(amount)
      const sampleStep = vec2(1).div(vec2(background.size(int(0)) as Node<'uvec2'>)).mul(radius).mul(coc)
      const sum = vec4(0).toVar()
      const peak = vec3(0).toVar()
      loop(sampleCount, ({i}) => {
        const tap = background.sample(uv().add(sampleStep.mul(kernel.element(i))))
        sum.addAssign(tap)
        // Preserve bright aperture highlights, but never let an invalid or partially covered
        // tap introduce foreground RGB. Zero coverage means zero color in the packed source.
        peak.assign(max(peak, tap.rgb.div(max(tap.a, minimumWeight))))
      })
      const average = sum.rgb.div(max(sum.a, minimumWeight))
      const color = mix(average, peak, coc.mul(highlightRetention))
      const weight = sum.a.div(sampleCount)
      // Keep coverage through half-resolution filtering. Storing normalized RGB with alpha=1
      // here would turn empty foreground pixels into black outlines when upsampled.
      return vec4(color.mul(weight), weight)
    })
    this.blurTexture = new FocusTexture(blur(), enabled, 1)
    this.blurTexture.name = 'knotApertureGather'
    const filtered = this.blurTexture
    const valid = step(minimumWeight, filtered.a)
    const color = filtered.rgb.div(max(filtered.a, minimumWeight))
    this.outputNode = mix(source, vec4(color, source.a), this.backgroundNode.mul(valid))
  }

  dispose() {
    this.blurTexture.dispose()
    this.backgroundTexture.dispose()
  }
}

export default KnotBokeh
