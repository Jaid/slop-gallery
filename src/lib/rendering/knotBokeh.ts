import type {Node, NodeBuilder, NodeFrame} from 'three/webgpu'

import {context, convertToTexture, float, Fn as fn, Loop as loop, max, mix, passTexture, perspectiveDepthToViewZ, smoothstep, step, uniform, uniformArray, uv, vec3, vec4} from 'three/tsl'
import {NodeMaterial, NodeUpdateType, QuadMesh, RendererUtils, RenderTarget, TempNode, Vector2} from 'three/webgpu'

const sampleCount = 64
const resolutionScale = 0.5
const backgroundDepthMargin = 0.12
const fullBlurDepthRange = 3
const foregroundInpaintRadius = 0.28
const highlightRetention = 0.14
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
/** Low-discrepancy samples uniformly filling a six-bladed aperture. */
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
const aperture = apertureSamples()

type SharedContextBuilder = NodeBuilder & {getSharedContext: () => unknown}

class KnotBokehNode extends TempNode<'vec4'> {
  private readonly amountNode: Node<'float'>
  private readonly cameraFar: number
  private readonly cameraNear: number
  private readonly colorNode: ReturnType<typeof convertToTexture>
  private readonly depthNode: ReturnType<typeof convertToTexture>
  private readonly enabled: () => boolean
  private readonly focusDistanceNode: Node<'float'>
  private readonly invSize = uniform(new Vector2)
  private readonly material = new NodeMaterial
  private readonly quad = new QuadMesh(this.material)
  private readonly radiusNode: Node<'float'>
  private rendererState: ReturnType<typeof RendererUtils.saveRendererState> | undefined
  private readonly target = new RenderTarget(1, 1, {depthBuffer: false})
  private readonly textureNode = passTexture(this as unknown as Parameters<typeof passTexture>[0], this.target.texture)

  constructor(colorNode: Node<'vec4'>, depthNode: Node, focusDistanceNode: Node<'float'>, amountNode: Node<'float'>, radiusNode: Node<'float'>, cameraNear: number, cameraFar: number, enabled: () => boolean) {
    super('vec4')
    this.colorNode = convertToTexture(colorNode)
    this.depthNode = convertToTexture(depthNode)
    this.focusDistanceNode = focusDistanceNode
    this.amountNode = amountNode
    this.radiusNode = radiusNode
    this.cameraNear = cameraNear
    this.cameraFar = cameraFar
    this.enabled = enabled
    this.target.texture.name = 'KnotBokeh.background'
    this.updateBeforeType = NodeUpdateType.FRAME
  }

  dispose() {
    this.target.dispose()
    this.material.dispose()
    super.dispose()
  }

  getTextureNode(): Node<'vec4'> {
    return this.textureNode
  }

  setup(builder: NodeBuilder): Node<'vec4'> {
    const kernel = uniformArray<'vec2'>(aperture, 'vec2')
    const cameraNear = float(this.cameraNear)
    const cameraFar = float(this.cameraFar)
    const uvNode = uv()
    const focusEdge = this.focusDistanceNode.add(backgroundDepthMargin)
    const blur = fn(() => {
      const original = this.colorNode.sample(uvNode)
      const destinationDistance = perspectiveDepthToViewZ(this.depthNode.sample(uvNode).r, cameraNear, cameraFar).negate()
      const destinationBackground = step(focusEdge, destinationDistance)
      const farCoC = smoothstep(this.focusDistanceNode.add(backgroundDepthMargin), this.focusDistanceNode.add(fullBlurDepthRange), destinationDistance)
      // Foreground texels near the silhouette still gather only background samples. This prevents
      // half-resolution upsampling from reintroducing the focused Knot's color at the boundary.
      const CoC = max(farCoC, float(1).sub(destinationBackground).mul(foregroundInpaintRadius)).mul(this.amountNode)
      const sampleStep = this.invSize.mul(this.radiusNode).mul(CoC)
      const sum = vec3(0).toVar()
      const peak = vec3(0).toVar()
      const weight = float(0).toVar()
      loop(sampleCount, ({i}) => {
        const sampleUV = uvNode.add(sampleStep.mul(kernel.element(i)))
        const sampleDistance = perspectiveDepthToViewZ(this.depthNode.sample(sampleUV).r, cameraNear, cameraFar).negate()
        const accepted = step(focusEdge, sampleDistance)
        const sampleColor = this.colorNode.sample(sampleUV).rgb.mul(accepted)
        sum.addAssign(sampleColor)
        peak.assign(max(peak, sampleColor))
        weight.addAssign(accepted)
      })
      const average = sum.div(max(weight, 1))
      const bokeh = mix(average, peak, CoC.mul(highlightRetention))
      return vec4(bokeh, original.a)
    })
    this.material.contextNode = context((builder as SharedContextBuilder).getSharedContext())
    this.material.fragmentNode = blur()
    this.material.name = 'Knot depth-aware aperture bokeh'
    this.material.needsUpdate = true
    return this.textureNode
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    if (!this.enabled()) {
      return undefined
    }
    const renderer = frame.renderer
    if (!renderer) {
      return undefined
    }
    const map = this.colorNode.value
    const image = map.image as {
      height: number
      width: number
    }
    const width = Math.max(Math.round(image.width * resolutionScale), 1)
    const height = Math.max(Math.round(image.height * resolutionScale), 1)
    this.invSize.value.set(1 / image.width, 1 / image.height)
    this.target.setSize(width, height)
    this.target.texture.type = map.type
    this.rendererState = RendererUtils.resetRendererState(renderer, this.rendererState ?? RendererUtils.saveRendererState(renderer))
    renderer.setRenderTarget(this.target)
    this.quad.name = 'Knot bokeh'
    this.quad.render(renderer)
    RendererUtils.restoreRendererState(renderer, this.rendererState)
    return undefined
  }
}
// eslint-disable-next-line perfectionist/sort-modules
function knotBokeh(colorNode: Node<'vec4'>, depthNode: Node, focusDistanceNode: Node<'float'>, amountNode: Node<'float'>, radiusNode: Node<'float'>, cameraNear: number, cameraFar: number, enabled: () => boolean): Node<'vec4'> {
  return new KnotBokehNode(colorNode, depthNode, focusDistanceNode, amountNode, radiusNode, cameraNear, cameraFar, enabled)
}

export default knotBokeh
