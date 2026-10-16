import type Passage from '#src/lib/gallery/passages/Passage.ts'
import type {PassageCutout} from '#src/lib/gallery/passages/Passage.ts'
import type PassageTransition from '#src/lib/gallery/passages/PassageTransition.ts'
import type {LanternLightsNode} from '#src/lib/materials/lights/index.ts'
import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody, TrimeshCollider} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import PendantLamps from '#component/levels/gallery/PendantLamps'
import TimberFrame from '#component/levels/gallery/TimberFrame'
import Box from '#src/components/Scene/primitives.tsx'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import TimberGeometry from '#src/lib/gallery/passages/TimberGeometry.ts'
import VaultGeometry from '#src/lib/gallery/passages/VaultGeometry.ts'
import {LanternBody} from '#src/lib/gallery/pendants/index.ts'
import {soleLampBounce, soleLampReach} from '#src/lib/gallery/pendants/lighting.ts'
import {passagePendantMounts} from '#src/lib/gallery/pendants/mounts.ts'

const lantern = new LanternBody
const lanternGlow = {
  color: '#ffdb99',
  emissive: '#ffb54b',
  emissiveIntensity: 3,
}
const lanternLight = {
  color: '#ffcd8a',
  distance: 7,
  intensity: 12,
}
/** Where the lanterns are all there is, their flames burn warmer and each one throws its own pool. */
const soleLanternLight = {
  ...soleLampReach,
  bounce: soleLampBounce,
  color: '#ffb363',
}

export default function CoveredPassage({passage, lighting, material, timber, ribCutouts, transition}: {
  /** makes the passage’s lanterns its sole light sources; its materials must be adopted by the same node */
  lighting?: LanternLightsNode
  material: Material
  passage: Passage
  ribCutouts?: ReadonlyArray<PassageCutout>
  timber?: Material
  /** a stone passage’s timber end, rendered separately; the paving and vault ribs stop where it begins */
  transition?: PassageTransition
}) {
  const geometry = useDisposable(useMemo(() => (timber ? TimberGeometry.passage(passage, ribCutouts) : new VaultGeometry(passage, transition?.length)), [passage, ribCutouts, timber, transition]))
  const mounts = useMemo(() => passagePendantMounts(passage, [geometry.shell, geometry.ribs]), [geometry, passage])
  const paving = transition?.stoneFloors ?? passage.floors
  const collision = timber ? [] : [geometry.shell, geometry.ribs].map(colliderGeometry)
  return <group name={passage.id}>
    <RigidBody colliders={false} type='fixed'>
      {passage.floors.map(({center: [x, z], size: [width, depth]}, i) => <group key={i}>
        <CuboidCollider args={[width / 2, 0.12, depth / 2]} position={[x, passage.floorY - 0.12, z]} />
        <CuboidCollider args={[width / 2, 0.12, depth / 2]} position={[x, passage.floorY + passage.height + 0.12, z]} />
        <Box material={material} position={[x, passage.floorY + passage.height + 0.12, z]} size={[width, 0.24, depth]} />
      </group>)}
      {paving.map(({center: [x, z], size: [width, depth]}, i) => <Box key={i} material={material} position={[x, passage.floorY - 0.12, z]} size={[width, 0.24, depth]} />)}
      <Branch not={timber}>{collision.map((args, i) => <TrimeshCollider key={i} args={args} />)}</Branch>
      <Branch if={timber}><TimberFrame geometry={geometry} lining={material} material={timber!} /></Branch>
      <Branch not={timber}>
        <mesh castShadow geometry={geometry.shell} material={material} name='castle-barrel-vault' receiveShadow />
        <mesh castShadow geometry={geometry.ribs} material={material} name='castle-vault-ribs' receiveShadow />
      </Branch>
    </RigidBody>
    <PendantLamps body={lantern} glow={lanternGlow} light={lighting ? soleLanternLight : lanternLight} lighting={lighting} mounts={mounts} name={`${passage.id}-pendants`} />
  </group>
}
