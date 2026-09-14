import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import MarbleFloorMaterial from '#src/lib/materials/MarbleFloorMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

import {checkerMarbleTexture} from './materials.ts'

export default function CheckerMarbleFloor({width, depth, reflections}: {depth: number
  reflections?: boolean
  width: number}) {
  const texture = checkerMarbleTexture(width, depth)
  const {floorReflections} = useGraphicsQualityValue(getGraphicsProfile)
  const reflective = reflections ?? floorReflections
  const material = new MarbleFloorMaterial(texture, reflective)
  useDisposable(texture)
  useDisposable(material)
  const reflection = material.reflection?.target
  return <mesh name="knot-room-marble-floor" position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[width, depth]}/>
    <primitive object={material} attach="material"/>
    <Branch if={reflection}><primitive object={reflection!}/></Branch>
  </mesh>
}
