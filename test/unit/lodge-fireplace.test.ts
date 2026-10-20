import type {Vec3} from '../../src/lib/gallery/types.ts'
import type {ReactElement, ReactNode} from 'react'

import {expect, test} from 'bun:test'

import {Children, isValidElement} from 'react'
import {Euler, Matrix4, Vector3} from 'three/webgpu'

import LodgeFire from '../../src/components/levels/gallery/LodgeFire/index.tsx'
import renderLodgeRoom from '../../src/components/levels/gallery/LodgeRoom/index.tsx'
import fire, {fireWorldOrigin} from '../../src/lib/gallery/fireplace/config.ts'
import lodge from '../../src/lib/gallery/lodge.ts'
import lodgeInterior from '../../src/lib/gallery/lodgeInterior/layout.ts'
import LodgeMaterials from '../../src/lib/materials/LodgeMaterials.ts'

type Props = {
  children?: ReactNode
  colliders?: false | string
  name?: string
  position?: Vec3
  rotation?: Vec3
  size?: Vec3
  type?: string
}
const descendants = (node: ReactNode): Array<ReactElement<Props>> => Children.toArray(node).flatMap(child => {
  return isValidElement<Props>(child) ? [child, ...descendants(child.props.children)] : []
})
test('the complete fireplace faces inward from the south wall without moving the furniture', () => {
  const materials = new LodgeMaterials
  try {
    const room = renderLodgeRoom({materials})
    const fireplace = descendants(room).find(child => child.props.name === 'lodge-fireplace')!
    expect(fireplace.props.rotation).toEqual([0, Math.PI, 0])
    const parts = descendants(fireplace.props.children)
    expect(parts.find(child => child.props.colliders === 'cuboid')!.props.type).toBe('fixed')
    expect(parts.some(child => child.type === LodgeFire)).toBe(true)
    const transform = new Matrix4
    transform.makeRotationFromEuler(new Euler(...fireplace.props.rotation!)).setPosition(lodge.center[0], lodge.floorY, lodge.center[1])
    const toWorld = (position: Vec3) => {
      const worldPosition = new Vector3(...position)
      return worldPosition.applyMatrix4(transform)
    }
    const hearth = toWorld(parts.find(child => child.props.name === 'lodge-hearth')!.props.position!)
    expect(hearth.x).toBeCloseTo(lodge.center[0])
    expect(hearth.z).toBeCloseTo(-30.65)
    // The fire sits where the old embers and firelight were.
    const origin = toWorld(fire.position)
    for (const [axis, value] of origin.toArray().entries()) {
      expect(value).toBeCloseTo(fireWorldOrigin[axis])
    }
    expect(origin.x).toBeCloseTo(lodge.center[0])
    expect(origin.z).toBeCloseTo(-30.8)
    expect(toWorld([fire.position[0], fire.position[1], fire.position[2] + fire.light.glowPosition[2]]).z).toBeCloseTo(-31.15)
    const fireplaceForward = new Vector3(0, 0, 1)
    expect(fireplaceForward.transformDirection(transform).z).toBeCloseTo(-1)
    expect(descendants(room).find(child => child.props.position?.[0] === -3.7)).toBeDefined()
    expect(parts.some(child => child.props.position?.[0] === -3.7)).toBe(false)
    // The stonework keeps the firebox the fire was built for: hearth top 0.2 m, inner pillar faces ±1.15 m, lintel underside 1.9 m and the back 0.47 m behind the logs.
    const part = (name: string) => parts.filter(child => child.props.name === name).map(child => ({
      position: child.props.position!,
      size: child.props.size!,
    }))
    const [hearthBox] = part('lodge-hearth')
    expect(hearthBox.position[1] + hearthBox.size[1] / 2).toBeCloseTo(0.2)
    const pillars = part('lodge-fireplace-pillar')
    expect(pillars).toHaveLength(2)
    for (const pillar of pillars) {
      expect(Math.abs(pillar.position[0]) - pillar.size[0] / 2).toBeCloseTo(1.15)
      expect(pillar.position[1] - pillar.size[1] / 2).toBeCloseTo(0.2)
      expect(pillar.position[1] + pillar.size[1] / 2).toBeCloseTo(1.9)
    }
    const [lintel] = part('lodge-fireplace-lintel')
    expect(lintel.position[1] - lintel.size[1] / 2).toBeCloseTo(1.9)
    const [back] = part('lodge-firebox-back')
    expect(back.position[2] + back.size[2] / 2 - fire.position[2]).toBeCloseTo(-0.47)
    // The chimney breast reaches the ceiling and is buried in the south wall, so no seam shows against the logs.
    const [chimney] = part('lodge-chimney')
    expect(chimney.position[1] + chimney.size[1] / 2).toBeCloseTo(lodge.height)
    expect(-(chimney.position[2] - chimney.size[2] / 2)).toBeGreaterThan(lodge.size[1] / 2 - 0.105)
    expect(-(lintel.position[2] - lintel.size[2] / 2)).toBeGreaterThan(lodge.size[1] / 2 - 0.105)
    // The mantel sits on the lintel and stands proud of the breast.
    const [mantel] = part('lodge-mantel')
    expect(mantel.position[1] - mantel.size[1] / 2).toBeCloseTo(lintel.position[1] + lintel.size[1] / 2)
    expect(-(mantel.position[2] + mantel.size[2] / 2)).toBeLessThan(lodgeInterior.fireplace.front)
  } finally {
    materials.dispose()
  }
})
