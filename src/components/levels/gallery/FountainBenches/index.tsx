import type {Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {fountainBench, fountainBenches} from '#src/lib/gallery/fountain/benches.ts'
import SlattedBenchGeometry from '#src/lib/gallery/fountain/SlattedBenchGeometry.ts'

export default function FountainBenches({wood}: {wood: Texture}) {
  const geometry = new SlattedBenchGeometry
  const timber = new MeshStandardNodeMaterial({
    map: wood,
    color: '#ffffff',
    roughness: 0.63,
    envMapIntensity: 0.35,
  })
  const metal = new MeshStandardNodeMaterial({
    color: '#c0c0b2',
    metalness: 0.8,
    roughness: 0.38,
  })
  useEffect(() => () => {
    geometry.dispose()
    timber.dispose()
    metal.dispose()
  }, [geometry, timber, metal])
  const {width, height, depth} = fountainBench
  return <group name='lobby-fountain-benches'>
    {fountainBenches.map((pose, i) => <RigidBody key={i} colliders={false} type='fixed' {...pose}>
      <CuboidCollider args={[width / 2, 0.0425, depth / 2]} position={[0, height - 0.0425, 0]} />
      {[-1.04, 1.04].flatMap(x => [-1, 1].map(side => <CuboidCollider key={`${x}:${side}`} args={[0.0425, (height - 0.1) / 2, 0.025]} position={[x, (height - 0.1) / 2, side * (depth / 2 - 0.075)]} />))}
      <mesh castShadow geometry={geometry.wood} material={timber} name='lobby-bench-teak-slats' receiveShadow />
      <mesh castShadow geometry={geometry.metal} material={metal} name='lobby-bench-brushed-frame' receiveShadow />
    </RigidBody>)}
  </group>
}
