import type {PendantLight} from '#component/levels/gallery/PendantLamps'
import type {FloorRectangle} from '#src/lib/gallery/floors.ts'
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
import {soleLampReach} from '#src/lib/gallery/pendants/lighting.ts'
import {corridorLightSpacing, passagePendantMounts} from '#src/lib/gallery/pendants/mounts.ts'
import {seenFrom} from '#src/lib/gallery/roomVisibility.ts'

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
  color: '#ffb363',
}
/**
 * Which of a passage’s evenly spaced lanterns, in mount order from the passage’s start, are left out (`null`) or light differently
 * from the rest. The corridor keeps three, at both ends and in the middle; the middle one reaches farthest. The lodge tunnel keeps only its first.
 */
const passageLanterns: Partial<Record<string, ReadonlyArray<Partial<PendantLight> | null | undefined>>> = {
  corridor: [
    {
      distance: 8,
      intensity: soleLanternLight.intensity / 2,
      y: -0.3,
    },
    null,
    null,
    null,
    {
      decay: 1,
      distance: 20,
      intensity: soleLanternLight.intensity * 0.2,
      y: -0.4,
    },
    null,
    null,
    null,
    {
      distance: 6,
      intensity: soleLanternLight.intensity * 0.8,
      y: -0.4,
    },
  ],
  'lodge-tunnel': [{y: -0.1}, null, null, null, null],
}

export default function CoveredPassage({passage, lighting, material, paving: pavingOverride, timber, ribCutouts, transition}: {
  /** makes the passage’s lanterns its sole light sources; its materials must be adopted by the same node */
  lighting?: LanternLightsNode
  material: Material
  passage: Passage
  /** the floor laid in the passage’s material when other floors cover the rest; collision still uses the full passage floors */
  paving?: ReadonlyArray<FloorRectangle>
  ribCutouts?: ReadonlyArray<PassageCutout>
  timber?: Material
  /** a stone passage’s timber end, rendered separately; the paving and vault ribs stop where it begins */
  transition?: PassageTransition
}) {
  const geometry = useDisposable(useMemo(() => (timber ? TimberGeometry.passage(passage, ribCutouts) : new VaultGeometry(passage, transition?.length)), [passage, ribCutouts, timber, transition]))
  const lanterns = passageLanterns[passage.id]
  // Under timber, lanterns hang from the ribs rather than the planks between them.
  const mounts = useMemo(() => passagePendantMounts(passage, [geometry.shell, geometry.ribs], lighting ? corridorLightSpacing : undefined, timber && geometry.ribs).filter((_, index) => lanterns?.[index] !== null), [geometry, lanterns, lighting, passage, timber])
  const lights = useMemo(() => lanterns?.filter(entry => entry !== null), [lanterns])
  const paving = pavingOverride ?? transition?.stoneFloors ?? passage.floors
  // A timber lining’s crown is the ceiling along its spans; a slab there would share its plane. Only the open elbows show the slab.
  const ceilings = timber ? passage.junctions : passage.floors
  const collision = timber ? [] : [geometry.shell, geometry.ribs].map(colliderGeometry)
  return <group name={passage.id}>
    <RigidBody colliders={false} type='fixed'>
      {passage.floors.map(({center: [x, z], size: [width, depth]}, i) => <group key={i}>
        <CuboidCollider args={[width / 2, 0.12, depth / 2]} position={[x, passage.floorY - 0.12, z]} />
        <CuboidCollider args={[width / 2, 0.12, depth / 2]} position={[x, passage.floorY + passage.height + 0.12, z]} />
      </group>)}
      {ceilings.map(({center: [x, z], size: [width, depth]}, i) => <Box key={i} material={material} position={[x, passage.floorY + passage.height + 0.12, z]} size={[width, 0.24, depth]} />)}
      {paving.map(({center: [x, z], size: [width, depth]}, i) => <Box key={i} material={material} position={[x, passage.floorY - 0.12, z]} size={[width, 0.24, depth]} />)}
      <Branch not={timber}>{collision.map((args, i) => <TrimeshCollider key={i} args={args} />)}</Branch>
      <Branch if={timber}><TimberFrame geometry={geometry} lining={material} material={timber!} /></Branch>
      <Branch not={timber}>
        <mesh castShadow geometry={geometry.shell} material={material} name='castle-barrel-vault' receiveShadow />
        <mesh castShadow geometry={geometry.ribs} material={material} name='castle-vault-ribs' receiveShadow />
      </Branch>
    </RigidBody>
    <PendantLamps body={lantern} glow={lanternGlow} light={lighting ? soleLanternLight : lanternLight} lighting={lighting} lights={lights} mounts={mounts} name={`${passage.id}-pendants`} rooms={seenFrom(passage.room)} />
  </group>
}
