import {useEffect, useMemo} from 'react'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import {MarbleFloorMaterial} from '#src/lib/materials/MarbleFloorMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

import {checkerMarbleTexture} from './materials.ts'

export default function CheckerMarbleFloor({width, depth}: {depth: number
  width: number}) {
  const texture = useMemo(() => checkerMarbleTexture(width, depth), [width, depth])
  const {floorReflections} = useGraphicsQualityValue(getGraphicsProfile)
  const material = useMemo(() => new MarbleFloorMaterial(texture, floorReflections), [texture, floorReflections])
  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => () => material.dispose(), [material])
  return <mesh name="knot-room-marble-floor" position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[width, depth]}/>
    <primitive object={material} attach="material"/>
    {material.reflection && <primitive object={material.reflection.target}/>}
  </mesh>
}
