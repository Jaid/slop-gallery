import type {Texture} from 'three/webgpu'

import {useEffect, useMemo} from 'react'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import WoodFloorMaterial from '#src/lib/materials/WoodFloorMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

export default function WoodFloor({width, depth, texture, reflections}: {depth: number
  reflections?: boolean
  texture: Texture
  width: number}) {
  const {floorReflections} = useGraphicsQualityValue(getGraphicsProfile)
  const reflective = reflections ?? floorReflections
  const material = useMemo(() => new WoodFloorMaterial(texture, reflective), [texture, reflective])
  useEffect(() => () => material.dispose(), [material])
  return <mesh name="mona-ribbit-room-wood-floor" position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[width, depth]}/>
    <primitive object={material} attach="material"/>
    {material.reflection && <primitive object={material.reflection.target}/>}
  </mesh>
}
