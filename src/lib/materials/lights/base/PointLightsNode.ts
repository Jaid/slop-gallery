import type {Node, NodeBuilder, NodeFrame, PointLight} from 'three/webgpu'

import {getDistanceAttenuation, Loop, NodeUpdateType, positionView, renderGroup, uniform, uniformArray, vec3} from 'three/tsl'
import {Color, LightingNode, Vector3, Vector4} from 'three/webgpu'

type LightingContext = {
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
 * three copies the whole lighting code into every shader once per light, which makes each material build and compile in proportion to the scene’s lights. A loop keeps one copy for the group, with the same math per light.
 */
export default class PointLightsNode extends LightingNode {
  static readonly type = 'PointLightsNode'
  private readonly colors: Array<Color> = []
  private readonly colorsNode
  private readonly countNode = uniform(0, 'int').setGroup(renderGroup)
  private readonly decays: Array<Vector4> = []
  private readonly decaysNode
  /** view-space positions and cutoff distances */
  private readonly positions: Array<Vector4> = []
  private readonly positionsNode

  /**
   * @param lights - the lights to shade, read every frame
   */
  constructor(readonly capacity: number, private readonly lights: () => Iterable<PointLight>) {
    super()
    for (let i = 0; i < capacity; i++) {
      this.colors.push(new Color)
      this.positions.push(new Vector4)
      this.decays.push(new Vector4)
    }
    this.colorsNode = uniformArray(this.colors, 'color').setGroup(renderGroup)
    this.positionsNode = uniformArray(this.positions, 'vec4').setGroup(renderGroup)
    this.decaysNode = uniformArray(this.decays, 'vec4').setGroup(renderGroup)
    this.updateType = NodeUpdateType.RENDER
  }

  override setup(builder: NodeBuilder): undefined {
    const context = builder.context as LightingContext
    const surfacePosition = context.positionView ?? positionView
    const {lightingModel, reflectedLight} = context
    const directDiffuse = vec3(0).toVar()
    const directSpecular = vec3(0).toVar()
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
      const lightColor = color.mul(attenuation)
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
    })
    reflectedLight.directDiffuse.addAssign(directDiffuse)
    reflectedLight.directSpecular.addAssign(directSpecular)
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
      i++
    }
    this.countNode.value = i
  }
}
