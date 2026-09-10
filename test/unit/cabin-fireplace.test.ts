import type {Vec3} from '../../src/lib/gallery/types.ts'
import type {ReactElement, ReactNode} from 'react'

import {expect, test} from 'bun:test'

import {Children, isValidElement} from 'react'
import {Euler, Matrix4, MeshBasicMaterial, Texture, Vector3} from 'three/webgpu'

import renderCabinRoom from '../../src/components/Scene/CabinRoom.tsx'
import {cabin} from '../../src/lib/gallery/cabin.ts'

type Props = {children?: ReactNode
  colliders?: false | string
  name?: string
  position?: Vec3
  rotation?: Vec3
  type?: string}
const descendants = (node: ReactNode): Array<ReactElement<Props>> => Children.toArray(node).flatMap(child => {
  return isValidElement<Props>(child) ? [child, ...descendants(child.props.children)] : []
})
test('the complete fireplace faces inward from the south wall without moving the furniture', () => {
  const stone = new MeshBasicMaterial
  const wood = new Texture
  try {
    const room = renderCabinRoom({
      stone,
      wood,
    })
    const fireplace = descendants(room).find(child => child.props.name === 'cabin-fireplace')!
    expect(fireplace.props.rotation).toEqual([0, Math.PI, 0])
    const parts = descendants(fireplace.props.children)
    expect(parts.find(child => child.props.colliders === 'cuboid')!.props.type).toBe('fixed')
    const transform = (new Matrix4).makeRotationFromEuler(new Euler(...fireplace.props.rotation!)).setPosition(cabin.center[0], cabin.floorY, cabin.center[1])
    for (const [name, expectedZ] of [['cabin-hearth', -26.65], ['cabin-embers', -26.8], ['cabin-firelight', -27.15]] as const) {
      const part = parts.find(child => child.props.name === name)!
      const position = new Vector3(...part.props.position!).applyMatrix4(transform)
      expect(position.x).toBeCloseTo(cabin.center[0])
      expect(position.z).toBeCloseTo(expectedZ)
    }
    expect(new Vector3(0, 0, 1).transformDirection(transform).z).toBeCloseTo(-1)
    expect(descendants(room).find(child => child.props.position?.[0] === -3.7)).toBeDefined()
    expect(parts.some(child => child.props.position?.[0] === -3.7)).toBe(false)
  } finally {
    stone.dispose()
    wood.dispose()
  }
})
