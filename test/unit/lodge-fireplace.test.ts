import type {Vec3} from '../../src/lib/gallery/types.ts'
import type {ReactElement, ReactNode} from 'react'

import {expect, test} from 'bun:test'

import {Children, isValidElement} from 'react'
import {Euler, Matrix4, MeshBasicMaterial, Texture, Vector3} from 'three/webgpu'

import LodgeFire from '../../src/components/levels/gallery/LodgeFire/index.tsx'
import renderLodgeRoom from '../../src/components/levels/gallery/LodgeRoom/index.tsx'
import fire, {fireWorldOrigin} from '../../src/lib/gallery/fireplace/config.ts'
import lodge from '../../src/lib/gallery/lodge.ts'

type Props = {
  children?: ReactNode
  colliders?: false | string
  name?: string
  position?: Vec3
  rotation?: Vec3
  type?: string
}
const descendants = (node: ReactNode): Array<ReactElement<Props>> => Children.toArray(node).flatMap(child => {
  return isValidElement<Props>(child) ? [child, ...descendants(child.props.children)] : []
})
test('the complete fireplace faces inward from the south wall without moving the furniture', () => {
  const stone = new MeshBasicMaterial
  const wood = new Texture
  try {
    const room = renderLodgeRoom({
      stone,
      wood,
    })
    const fireplace = descendants(room).find(child => child.props.name === 'lodge-fireplace')!
    expect(fireplace.props.rotation).toEqual([0, Math.PI, 0])
    const parts = descendants(fireplace.props.children)
    expect(parts.find(child => child.props.colliders === 'cuboid')!.props.type).toBe('fixed')
    expect(parts.some(child => child.type === LodgeFire)).toBe(true)
    const transform = (new Matrix4).makeRotationFromEuler(new Euler(...fireplace.props.rotation!)).setPosition(lodge.center[0], lodge.floorY, lodge.center[1])
    const toWorld = (position: Vec3) => new Vector3(...position).applyMatrix4(transform)
    const hearth = toWorld(parts.find(child => child.props.name === 'lodge-hearth')!.props.position!)
    expect(hearth.x).toBeCloseTo(lodge.center[0])
    expect(hearth.z).toBeCloseTo(-26.65)
    // The fire sits where the old embers and firelight were.
    const origin = toWorld(fire.position)
    for (const [axis, value] of origin.toArray().entries()) {
      expect(value).toBeCloseTo(fireWorldOrigin[axis])
    }
    expect(origin.x).toBeCloseTo(lodge.center[0])
    expect(origin.z).toBeCloseTo(-26.8)
    expect(toWorld([fire.position[0], fire.position[1], fire.position[2] + fire.light.glowPosition[2]]).z).toBeCloseTo(-27.15)
    expect(new Vector3(0, 0, 1).transformDirection(transform).z).toBeCloseTo(-1)
    expect(descendants(room).find(child => child.props.position?.[0] === -3.7)).toBeDefined()
    expect(parts.some(child => child.props.position?.[0] === -3.7)).toBe(false)
  } finally {
    stone.dispose()
    wood.dispose()
  }
})
