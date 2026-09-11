import {ADDITION, Brush, Evaluator, SUBTRACTION} from 'three-bvh-csg'
import {BoxGeometry, BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, MeshBasicNodeMaterial, Shape} from 'three/webgpu'

import lowerGallery, {oculusPlatform, oculusRamps} from './lowerGallery.ts'
import tower, {towerArch, towerPlatformOutline, towerRamp, towerRampGradient, towerRampHalfWidth, towerRampHeight, towerRampSections} from './oculusTower.ts'
import RampGeometry from './RampGeometry.ts'

// One architectural solid supplies both the visible surface and collision.
export default class OculusGroundGeometry extends BufferGeometry {
  constructor() {
    super()
    const evaluator = new Evaluator
    evaluator.useGroups = false
    const material = new MeshBasicNodeMaterial
    const brushes: Array<Brush> = []
    const brush = (geometry: BufferGeometry) => {
      if (geometry.hasAttribute('position') && !geometry.hasAttribute('uv')) {
        geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2))
      }
      const result = new Brush(geometry, material)
      result.updateMatrixWorld(true)
      brushes.push(result)
      return result
    }
    const combine = (left: Brush, right: Brush, operation = ADDITION) => evaluator.evaluate(left, right, operation, brush(new BufferGeometry))
    const block = ({position, size}: typeof oculusPlatform) => brush(new BoxGeometry(...size).translate(...position))
    try {
      const {floorY} = lowerGallery
      const slope = new BoxGeometry(towerRamp.width, 1, towerRamp.endZ - towerRamp.startZ, 1, 1, towerRampSections.length - 1)
      const vertices = slope.getAttribute('position')
      for (let i = 0; i < vertices.count; i++) {
        const section = Math.round((vertices.getZ(i) / (towerRamp.endZ - towerRamp.startZ) + 0.5) * (towerRampSections.length - 1))
        const z = towerRampSections[section]
        const fraction = (z - towerRamp.startZ) / (towerRamp.endZ - towerRamp.startZ)
        const height = towerRampHeight(fraction) - floorY
        vertices.setX(i, Math.sign(vertices.getX(i)) * towerRampHalfWidth(z))
        vertices.setY(i, (vertices.getY(i) + 0.5) * height)
        vertices.setZ(i, z - (towerRamp.startZ + towerRamp.endZ) / 2)
      }
      slope.computeVertexNormals()
      const topNormals = slope.getAttribute('normal')
      for (let i = 0; i < vertices.count; i++) {
        if (topNormals.getY(i) > 0.5) {
          const fraction = vertices.getZ(i) / (towerRamp.endZ - towerRamp.startZ) + 0.5
          const gradient = towerRampGradient(fraction)
          const length = Math.hypot(1, gradient)
          topNormals.setXYZ(i, 0, 1 / length, -gradient / length)
        }
      }
      slope.translate(tower.x, floorY, (towerRamp.startZ + towerRamp.endZ) / 2)
      const halfWidth = towerArch.width / 2
      const roofSlope = (towerArch.height - towerArch.lowHeight) / towerArch.width
      const radius = towerArch.cornerRadius
      const cornerX = halfWidth - radius
      const cornerY = towerArch.lowHeight + roofSlope * radius - radius * Math.hypot(1, roofSlope)
      const highRadius = towerArch.highCornerRadius
      const highCornerX = -halfWidth + highRadius
      const highCornerY = towerArch.height - roofSlope * highRadius - highRadius * Math.hypot(1, roofSlope)
      const tangentAngle = Math.atan2(1, roofSlope)
      const shape = new Shape
      // Local −X faces the taller tower end after rotation. Circular fillets
      // join the sloping roof tangentially to both vertical jambs.
      shape.moveTo(-halfWidth, -0.1)
      shape.lineTo(halfWidth, -0.1)
      shape.lineTo(halfWidth, cornerY)
      shape.absarc(cornerX, cornerY, radius, 0, tangentAngle, false)
      shape.lineTo(highCornerX + highRadius * Math.cos(tangentAngle), highCornerY + highRadius * Math.sin(tangentAngle))
      shape.absarc(highCornerX, highCornerY, highRadius, tangentAngle, Math.PI, false)
      shape.closePath()
      const cutterDepth = towerRamp.width + towerRamp.baseCornerRadius * 2 + 2
      const cutter = new ExtrudeGeometry(shape, {
        depth: cutterDepth,
        bevelEnabled: false,
        curveSegments: 64,
      })
      cutter.translate(0, 0, -cutterDepth / 2).rotateY(Math.PI / 2).translate(tower.x, floorY, towerArch.z)
      const outline = new Shape
      for (const [i, [x, z]] of towerPlatformOutline.entries()) {
        if (i === 0) {
          outline.moveTo(x, z)
        } else {
          outline.lineTo(x, z)
        }
      }
      outline.closePath()
      const platform = new ExtrudeGeometry(outline, {
        depth: tower.height,
        bevelEnabled: false,
      })
      platform.rotateX(Math.PI / 2).translate(tower.x, tower.floorY + tower.height, tower.z)
      // Cut the joined support so the platform’s rounded shoulder cannot refill the opening.
      let solid = combine(brush(slope), brush(platform))
      solid = combine(solid, brush(cutter), SUBTRACTION)
      solid = combine(solid, block(oculusPlatform))
      for (const ramp of oculusRamps) {
        solid = combine(solid, brush(new RampGeometry(ramp.width, ramp.rise, ramp.run).translate(ramp.x, ramp.floorY, ramp.startZ)))
      }
      this.copy(solid.geometry)
      // World-scale projection keeps the stone grain consistent across the joined pieces.
      const positions = this.getAttribute('position')
      const normals = this.getAttribute('normal')
      const uv = new Float32Array(positions.count * 2)
      for (let i = 0; i < positions.count; i++) {
        const x = Math.abs(normals.getX(i))
        const y = Math.abs(normals.getY(i))
        const z = Math.abs(normals.getZ(i))
        uv[i * 2] = (x > y && x > z ? positions.getZ(i) : positions.getX(i)) / 8
        uv[i * 2 + 1] = (y >= x && y >= z ? positions.getZ(i) : positions.getY(i)) / 8
      }
      this.setAttribute('uv', new Float32BufferAttribute(uv, 2))
      this.computeBoundingBox()
      this.computeBoundingSphere()
    } finally {
      for (const value of brushes) {
        value.disposeCacheData()
        value.geometry.dispose()
      }
      material.dispose()
    }
  }
}
