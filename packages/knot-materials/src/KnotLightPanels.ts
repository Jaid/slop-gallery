import type {KnotLightFracture, KnotLightSlot} from './KnotLights.ts'

import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {attribute, color, float, mix, positionGeometry, smoothstep, vec2} from 'three/tsl'
import {DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'

import {knotLight} from './KnotLights.ts'

export const knotLightHousingSize = [knotLight.size[0] + 0.16, 0.1, knotLight.size[2] + 0.16] as const
export const knotLightDiffuserSize = [knotLight.size[0] - 0.12, 0.024, knotLight.size[2] - 0.12] as const
export const knotLightHousingY = 0.025
// The entire luminous face sits BELOW the solid housing, not embedded inside it.
export const knotLightDiffuserY = -0.04
// Rapier needs a small contact skin to resolve a thin, face-on panel after CCD clamps its fall.
export const knotLightDiffuserContactSkin = 0.005
export const knotLightColor = '#fff3d8'
export const knotLightSurfaceIntensity = 4

/** Two draw calls, with fracture and emission evaluated on the actual visible face. */
export default class KnotLightPanels {
  readonly debrisMaterial = new MeshStandardNodeMaterial({
    color: '#696a61',
    roughness: 0.85,
  })
  readonly diffuserGeometry = new RoundedBoxGeometry(...knotLightDiffuserSize, 2, 0.01)
  readonly diffuserMaterial = new MeshBasicNodeMaterial({toneMapped: false})
  readonly diffusers: InstancedMesh
  readonly fractures: InstancedBufferAttribute
  readonly housingGeometry = new RoundedBoxGeometry(...knotLightHousingSize, 2, 0.025)
  readonly housingMaterial = new MeshStandardNodeMaterial({
    color: '#262725',
    roughness: 0.6,
    metalness: 0.25,
  })
  readonly housings: InstancedMesh
  readonly intensities: InstancedBufferAttribute
  readonly liveFractions: Float32Array
  private readonly matrix = new Matrix4

  constructor(readonly slots: ReadonlyArray<KnotLightSlot>) {
    this.intensities = new InstancedBufferAttribute(new Float32Array(slots.length).fill(1), 1).setUsage(DynamicDrawUsage)
    // Normal.xy, signed line offset, enabled. Local X/Z coordinates are normalized to [-1, 1].
    this.fractures = new InstancedBufferAttribute(new Float32Array(slots.length * 4), 4).setUsage(DynamicDrawUsage)
    this.liveFractions = new Float32Array(slots.length).fill(1)
    this.diffuserGeometry.setAttribute('lightIntensity', this.intensities)
    this.diffuserGeometry.setAttribute('lightFracture', this.fractures)
    const point = positionGeometry.xz.div(vec2(knotLightDiffuserSize[0] / 2, knotLightDiffuserSize[2] / 2))
    const fracture = attribute('lightFracture', 'vec4')
    const distance = point.dot(fracture.xy).sub(fracture.z)
    const live = float(1).sub(smoothstep(-0.006, 0.006, distance).mul(fracture.w))
    const edge = smoothstep(0.7, 1, point.x.abs().max(point.y.abs()))
    const emission = attribute('lightIntensity', 'float').mul(live).mul(float(1).sub(edge.mul(0.12)))
    this.diffuserMaterial.colorNode = mix(color('#383a33'), color(knotLightColor).mul(knotLightSurfaceIntensity), emission)
    this.diffuserMaterial.name = 'Knot exposed emissive LED diffusers'
    this.housings = new InstancedMesh(this.housingGeometry, this.housingMaterial, slots.length)
    this.housings.name = 'knot-slot-led-housings'
    this.diffusers = new InstancedMesh(this.diffuserGeometry, this.diffuserMaterial, slots.length)
    this.diffusers.name = 'knot-slot-led-diffusers'
    this.diffusers.instanceMatrix.setUsage(DynamicDrawUsage)
    for (const [index, slot] of slots.entries()) {
      this.housings.setMatrixAt(index, this.matrix.makeTranslation(slot.position[0], slot.position[1] + knotLightHousingY, slot.position[2]))
      this.diffusers.setMatrixAt(index, this.matrix.makeTranslation(slot.position[0], slot.position[1] + knotLightDiffuserY, slot.position[2]))
    }
    for (const mesh of [this.housings, this.diffusers]) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingBox()
      mesh.computeBoundingSphere()
    }
  }

  break(index: number) {
    this.diffusers.setMatrixAt(index, this.matrix.makeScale(0, 0, 0))
    this.diffusers.instanceMatrix.needsUpdate = true
    this.liveFractions[index] = 0
    this.setIntensity(index, 0)
  }

  dispose() {
    this.housings.dispose()
    this.diffusers.dispose()
    this.housingGeometry.dispose()
    this.diffuserGeometry.dispose()
    this.housingMaterial.dispose()
    this.diffuserMaterial.dispose()
    this.debrisMaterial.dispose()
  }

  fracture(index: number, fracture: KnotLightFracture) {
    const [nx, nz] = fracture.normal
    this.fractures.setXYZW(index, nx, nz, nx * fracture.point[0] + nz * fracture.point[1], 1)
    this.fractures.needsUpdate = true
    this.liveFractions[index] = fracture.liveFraction
  }

  setIntensity(index: number, intensity: number) {
    if (Math.abs(this.intensities.getX(index) - intensity) > 0.001) {
      this.intensities.setX(index, intensity)
      this.intensities.needsUpdate = true
    }
  }
}
