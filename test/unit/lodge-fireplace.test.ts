import type {Vec3} from '../../src/lib/gallery/types.ts'
import type {ReactElement, ReactNode} from 'react'

import {expect, test} from 'bun:test'

import {Children, isValidElement} from 'react'
import {Euler, Matrix4, MeshBasicMaterial, Texture, Vector3} from 'three/webgpu'

import renderLodgeRoom from '../../src/components/Scene/LodgeRoom.tsx'
import {lodge} from '../../src/lib/gallery/lodge.ts'

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
    const room = renderLodgeRoom({
      stone,
      wood,
    })
    const fireplace = descendants(room).find(child => child.props.name === 'lodge-fireplace')!
    expect(fireplace.props.rotation).toEqual([0, Math.PI, 0])
    const parts = descendants(fireplace.props.children)
    expect(parts.find(child => child.props.colliders === 'cuboid')!.props.type).toBe('fixed')
    const transform = (new Matrix4).makeRotationFromEuler(new Euler(...fireplace.props.rotation!)).setPosition(lodge.center[0], lodge.floorY, lodge.center[1])
    for (const [name, expectedZ] of [['lodge-hearth', -26.65], ['lodge-embers', -26.8], ['lodge-firelight', -27.15]] as const) {
      const part = parts.find(child => child.props.name === name)!
      const position = new Vector3(...part.props.position!).applyMatrix4(transform)
      expect(position.x).toBeCloseTo(lodge.center[0])
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
