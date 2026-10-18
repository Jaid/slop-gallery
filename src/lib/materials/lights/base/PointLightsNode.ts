import type LanternLight from '../LanternLight.ts'
import type {Node, NodeBuilder, NodeFrame, PointLight} from 'three/webgpu'

import {cameraViewMatrix, float, getDistanceAttenuation, Loop, mix, NodeUpdateType, positionView, renderGroup, smoothstep, uniform, uniformArray, vec3, vec4} from 'three/tsl'
import {Color, LightingNode, Vector3, Vector4} from 'three/webgpu'

type LightingContext = {
  irradiance?: Node<'vec3'>
  lightingModel: {
    direct: (input: {
      lightColor: Node<'vec3'>
      lightDirection: Node<'vec3'>
      lightNode: {
        light: object
        shadowNode: null
      }
      reflectedLight: {
        directDiffuse: Node<'vec3'>
        directSpecular: Node<'vec3'>
      }
    }, builder: NodeBuilder) => void
  }
  positionView?: Node<'vec3'>
  reflectedLight: {
    directDiffuse: Node<'vec3'>
    directSpecular: Node<'vec3'>
  }
}

const viewPosition = new Vector3

/**
 * Shades a group of shadowless point lights in one shader loop over uniform arrays.
 *
 * three copies the whole lighting code into every shader once per light, which makes each material build and compile in proportion to the scene’s lights. A loop keeps one copy for the group, with the same math per light. With {@link lanterns}, every light is a {@link LanternLight} and gets the roof shading and bounce light of {@link LanternLightNode}.
 */
export default class PointLightsNode extends LightingNode {
  static readonly type = 'PointLightsNode'
  private readonly bounces: Array<Vector4> = []
  private readonly bouncesNode
  private readonly colors: Array<Color> = []
  private readonly colorsNode
  private readonly countNode = uniform(0, 'int').setGroup(renderGroup)
  private readonly decays: Array<Vector4> = []
  private readonly decaysNode
  /** view-space positions and cutoff distances */
  private readonly positions: Array<Vector4> = []
  private readonly positionsNode
  private readonly roofs: Array<Vector4> = []
  private readonly roofsNode

  /**
   * @param lights - the lights to shade, read every frame
   */
  constructor(readonly lanterns: boolean, readonly capacity: number, private readonly lights: () => Iterable<PointLight>) {
    super()
    for (let i = 0; i < capacity; i++) {
      this.colors.push(new Color)
      this.positions.push(new Vector4)
      this.decays.push(new Vector4)
      if (!lanterns) {
        continue
      }
      this.roofs.push(new Vector4)
      this.bounces.push(new Vector4)
    }
    this.colorsNode = uniformArray(this.colors, 'color').setGroup(renderGroup)
    this.positionsNode = uniformArray(this.positions, 'vec4').setGroup(renderGroup)
    this.decaysNode = uniformArray(this.decays, 'vec4').setGroup(renderGroup)
    this.roofsNode = lanterns ? uniformArray(this.roofs, 'vec4').setGroup(renderGroup) : null
    this.bouncesNode = lanterns ? uniformArray(this.bounces, 'vec4').setGroup(renderGroup) : null
    this.updateType = NodeUpdateType.RENDER
  }

  override setup(builder: NodeBuilder): undefined {
    const context = builder.context as LightingContext
    const surfacePosition = context.positionView ?? positionView
    const {lightingModel, reflectedLight, irradiance} = context
    const directDiffuse = vec3(0).toVar()
    const directSpecular = vec3(0).toVar()
    // Assigned to inside the loop, the context’s irradiance would be initialized there too when no light before it uses it, and lose every lamp but the last.
    const bounceIrradiance = vec3(0).toVar()
    // The light’s direction points from the surface toward the flame; the ray leaving the lantern runs opposite to it.
    const up = cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz
    Loop(this.countNode, ({i}) => {
      const position = this.positionsNode.element(i) as unknown as Node<'vec4'>
      const lightVector = position.xyz.sub(surfacePosition).toVar()
      const lightDirection = lightVector.normalize().toVar()
      const lightDistance = lightVector.length()
      const attenuation = getDistanceAttenuation({
        lightDistance,
        cutoffDistance: position.w,
        decayExponent: (this.decaysNode.element(i) as unknown as Node<'vec4'>).x,
      })
      const color = this.colorsNode.element(i) as unknown as Node<'vec3'>
      let lightColor = color.mul(attenuation)
      if (this.roofsNode) {
        const roof = this.roofsNode.element(i) as unknown as Node<'vec4'>
        const shade = smoothstep(roof.x, roof.y, lightDirection.negate().dot(up))
        lightColor = lightColor.mul(mix(float(1), roof.z, shade))
      }
      lightingModel.direct({
        lightDirection,
        lightColor: lightColor.toVar(),
        lightNode: {
          light: {},
          shadowNode: null,
        },
        reflectedLight: {
          directDiffuse,
          directSpecular,
        },
      }, builder)
      if (this.bouncesNode && irradiance) {
        // Shadowing does not apply: bounce light reaches around the corners the direct light cannot.
        const bounce = this.bouncesNode.element(i) as unknown as Node<'vec4'>
        const ratio = lightDistance.div(bounce.x.max(1e-4))
        const window = ratio.pow(4).oneMinus().saturate().pow(2)
        bounceIrradiance.addAssign(color.mul(bounce.z.div(lightDistance.div(bounce.y).pow(2).add(1)).mul(window)))
      }
    })
    reflectedLight.directDiffuse.addAssign(directDiffuse)
    reflectedLight.directSpecular.addAssign(directSpecular)
    if (this.bouncesNode && irradiance) {
      irradiance.addAssign(bounceIrradiance)
    }
  }

  override update({camera}: NodeFrame): undefined {
    let i = 0
    for (const light of this.lights()) {
      if (i === this.capacity) {
        throw new RangeError(`More point lights than the batch capacity of ${this.capacity}.`)
      }
      this.colors[i].copy(light.color).multiplyScalar(light.intensity)
      viewPosition.setFromMatrixPosition(light.matrixWorld).applyMatrix4(camera!.matrixWorldInverse)
      this.positions[i].set(viewPosition.x, viewPosition.y, viewPosition.z, light.distance)
      this.decays[i].x = light.decay
      if (this.lanterns) {
        const {roof, bounce} = light as LanternLight
        this.roofs[i].set(roof.start, roof.end, roof.leak, 0)
        this.bounces[i].set(bounce.distance, bounce.radius, bounce.share, 0)
      }
      i++
    }
    this.countNode.value = i
  }
}
