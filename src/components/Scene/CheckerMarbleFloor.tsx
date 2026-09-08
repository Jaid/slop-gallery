import {useEffect, useMemo} from 'react'

import {MarbleFloorMaterial} from '#src/lib/materials/MarbleFloorMaterial.ts'

import {checkerMarbleTexture} from './materials.ts'

export default function CheckerMarbleFloor({width, depth}: {width: number, depth: number}) {
  const texture = useMemo(() => checkerMarbleTexture(width, depth), [width, depth])
  const material = useMemo(() => new MarbleFloorMaterial(texture), [texture])
  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => () => material.dispose(), [material])
  return <mesh name="knot-room-marble-floor" position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[width, depth]}/>
    <primitive object={material} attach="material"/>
    <primitive object={material.reflection.target}/>
  </mesh>
}
