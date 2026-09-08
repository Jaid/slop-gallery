import {useEffect, useMemo} from 'react'
import type {Texture} from 'three/webgpu'

import {WoodFloorMaterial} from '#src/lib/materials/WoodFloorMaterial.ts'

export default function ReflectiveWoodFloor({width, depth, texture}: {width: number, depth: number, texture: Texture}) {
  const material = useMemo(() => new WoodFloorMaterial(texture), [texture])
  useEffect(() => () => material.dispose(), [material])
  return <mesh name="mona-ribbit-room-wood-floor" position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[width, depth]}/>
    <primitive object={material} attach="material"/>
    <primitive object={material.reflection.target}/>
  </mesh>
}
