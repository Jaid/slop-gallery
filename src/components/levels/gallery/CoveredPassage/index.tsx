import type Passage from '#src/lib/gallery/passages/Passage.ts'
import type {PassageCutout} from '#src/lib/gallery/passages/Passage.ts'
import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody, TrimeshCollider} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {BoxGeometry} from 'three/webgpu'

import TimberFrame from '#component/levels/gallery/TimberFrame'
import Box from '#src/components/Scene/primitives.tsx'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import TimberGeometry from '#src/lib/gallery/passages/TimberGeometry.ts'
import VaultGeometry from '#src/lib/gallery/passages/VaultGeometry.ts'
import {mergeParts} from '#src/lib/geometry.ts'

export default function CoveredPassage({passage, material, timber, ribCutouts}: {material: Material
  passage: Passage
  ribCutouts?: ReadonlyArray<PassageCutout>
  timber?: Material}) {
  const lantern = useMemo(() => mergeParts([
    ...[-1, 1].map(side => new BoxGeometry(0.22, 0.03, 0.22).translate(0, side * 0.17, 0)),
    ...[-1, 1].flatMap(x => [-1, 1].map(z => new BoxGeometry(0.018, 0.32, 0.018).translate(x * 0.09, 0, z * 0.09))),
  ]), [])
  useEffect(() => () => lantern.dispose(), [lantern])
  const geometry = useMemo(() => {
    return timber ? TimberGeometry.passage(passage, ribCutouts) : new VaultGeometry(passage)
  }, [passage, timber, ribCutouts])
  const collision = useMemo(() => {
    return timber ? [] : [geometry.shell, geometry.ribs].map(colliderGeometry)
  }, [geometry, timber])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group name={passage.id}>
    <RigidBody type="fixed" colliders={false}>
      {passage.floors.map(({center: [x, z], size: [width, depth]}, i) => <group key={i}>
        <CuboidCollider position={[x, passage.floorY - 0.12, z]} args={[width / 2, 0.12, depth / 2]}/>
        <Box position={[x, passage.floorY - 0.12, z]} size={[width, 0.24, depth]} material={material}/>
        <CuboidCollider position={[x, passage.floorY + passage.height + 0.12, z]} args={[width / 2, 0.12, depth / 2]}/>
        <Box position={[x, passage.floorY + passage.height + 0.12, z]} size={[width, 0.24, depth]} material={material}/>
      </group>)}
      {!timber && collision.map((args, i) => <TrimeshCollider key={i} args={args}/>)}
      {timber ? <TimberFrame geometry={geometry} material={timber} lining={material}/> : <>
        <mesh name="castle-barrel-vault" geometry={geometry.shell} material={material} receiveShadow castShadow/>
        <mesh name="castle-vault-ribs" geometry={geometry.ribs} material={material} receiveShadow castShadow/>
      </>}
    </RigidBody>
    {passage.spans.flatMap(({start, end}, span) => {
      const length = Math.hypot(end[0] - start[0], end[1] - start[1])
      return Array.from({length: Math.max(1, Math.ceil(length / 5))}, (_, i) => {
        const t = (i + 0.5) / Math.max(1, Math.ceil(length / 5))
        const x = start[0] + (end[0] - start[0]) * t
        const z = start[1] + (end[1] - start[1]) * t
        return <group key={`${span}:${i}`} position={[x, passage.floorY + 2.8, z]}>
          <mesh geometry={lantern}><meshStandardNodeMaterial color="#34291d" metalness={0.75} roughness={0.4}/></mesh>
          <mesh><boxGeometry args={[0.13, 0.24, 0.13]}/><meshStandardNodeMaterial color="#ffdb99" emissive="#ffb54b" emissiveIntensity={3}/></mesh>
          <pointLight color="#ffcd8a" intensity={12} distance={7} decay={2}/>
        </group>
      })
    })}
  </group>
}
