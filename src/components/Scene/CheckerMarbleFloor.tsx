import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {useGraphicsModeValue} from 'use-graphics-mode'

import MarbleFloorMaterial from '#src/lib/materials/MarbleFloorMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

import {checkerMarbleTexture} from './materials.ts'

export default function CheckerMarbleFloor({width, depth, reflections}: {
  depth: number
  reflections?: boolean
  width: number
}) {
  const texture = useDisposable(useMemo(() => checkerMarbleTexture(width, depth), [width, depth]))
  const {floorReflections} = useGraphicsModeValue(getGraphicsProfile)
  const reflective = reflections ?? floorReflections
  const material = useDisposable(useMemo(() => new MarbleFloorMaterial(texture, reflective), [reflective, texture]))
  const reflection = material.reflectionTarget
  return <mesh name='checker-marble-floor' position={[0, 0.001, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[width, depth]} />
    <primitive attach='material' object={material} />
    <Branch if={reflection}><primitive object={reflection!} /></Branch>
  </mesh>
}
