import type {Node, NodeBuilder, Renderer} from 'three/webgpu'

import {cameraViewMatrix, float, lightViewPosition, mix, positionView, renderGroup, smoothstep, uniform, vec4} from 'three/tsl'
import {PointLightNode} from 'three/webgpu'

import LanternLight from './LanternLight.ts'

/** Shades a {@link LanternLight} toward the ceiling and adds its bounce light, mirroring {@link LanternLight.transmission} and {@link LanternLight.bounceAt} on the GPU. */
export default class LanternLightNode extends PointLightNode {
  static readonly type = 'LanternLightNode'
  /** Lets a renderer shade {@link LanternLight}s with this node. */
  static register(library: Renderer['library']) {
    library.addLight(LanternLightNode, LanternLight)
  }
  private readonly bounceDistanceNode = uniform(0).setGroup(renderGroup)
  private readonly bounceRadiusNode = uniform(1).setGroup(renderGroup)
  private readonly bounceShareNode = uniform(0).setGroup(renderGroup)
  private readonly endNode = uniform(1).setGroup(renderGroup)
  private readonly leakNode = uniform(1).setGroup(renderGroup)

  private readonly startNode = uniform(0).setGroup(renderGroup)
  override setup(builder: NodeBuilder): undefined {
    super.setup(builder)
    const context = builder.context as {
      irradiance?: Node<'vec3'>
      positionView?: Node<'vec3'>
    }
    if (!context.irradiance) {
      return
    }
    const distance = lightViewPosition(this.light!).sub(context.positionView ?? positionView).length()
    const ratio = distance.div(this.bounceDistanceNode.max(1e-4))
    const window = ratio.pow(4).oneMinus().saturate().pow(2)
    const falloff = this.bounceShareNode.div(distance.div(this.bounceRadiusNode).pow(2).add(1)).mul(window)
    // Shadowing does not apply: bounce light reaches around the corners the direct light cannot. A shadow-casting lamp’s color node is multiplied by its shadow once set up, so this uses the color from before.
    const {baseColorNode, colorNode} = this as unknown as {
      baseColorNode: Node<'vec3'> | null
      colorNode: Node<'vec3'>
    }
    context.irradiance.addAssign((baseColorNode ?? colorNode).mul(falloff))
  }

  override setupDirect(builder: NodeBuilder) {
    const direct = super.setupDirect(builder)
    if (!direct) {
      return direct
    }
    // The light’s direction points from the surface toward the flame; the ray leaving the lantern runs opposite to it.
    const up = cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz
    const elevation = (direct.lightDirection as Node<'vec3'>).negate().dot(up)
    const shade = smoothstep(this.startNode, this.endNode, elevation)
    return {
      ...direct,
      lightColor: (direct.lightColor as Node<'vec3'>).mul(mix(float(1), this.leakNode, shade)),
    }
  }

  override update(frame: Parameters<PointLightNode['update']>[0]) {
    const result = super.update(frame)
    const {roof, bounce} = this.light as LanternLight
    this.bounceDistanceNode.value = bounce.distance
    this.bounceRadiusNode.value = bounce.radius
    this.bounceShareNode.value = bounce.share
    this.startNode.value = roof.start
    this.endNode.value = roof.end
    this.leakNode.value = roof.leak
    return result
  }
}
