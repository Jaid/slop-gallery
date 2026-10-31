import type {FloorPolygon} from '#src/lib/gallery/floorPolygons.ts'
import type Passage from '#src/lib/gallery/passages/Passage.ts'
import type {PassageCutout} from '#src/lib/gallery/passages/Passage.ts'
import type PassageTransition from '#src/lib/gallery/passages/PassageTransition.ts'
import type {Material} from 'three/webgpu'

import {ConvexHullCollider, RigidBody, TrimeshCollider} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import FloorSlab from '#component/FloorSlab'
import PendantLamps from '#component/PendantLamps'
import TimberFrame from '#component/TimberFrame'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {bastionPassageLanterns} from '#src/lib/gallery/bastion.ts'
import {slabCorners} from '#src/lib/gallery/floorPolygons.ts'
import TimberGeometry from '#src/lib/gallery/passages/TimberGeometry.ts'
import VaultGeometry from '#src/lib/gallery/passages/VaultGeometry.ts'
import {corridorLightSpacing, passagePendantMounts} from '#src/lib/gallery/pendants/mounts.ts'
import {passageLantern, passageLanternGlow} from '#src/lib/gallery/pendants/passageLantern.ts'

/** how thick the slabs under a passage’s floor and over its ceiling are */
const slabDepth = 0.24
/**
 * Which of a passage’s evenly spaced lanterns, in mount order from the passage’s start, it keeps, by the passage’s name; the rest are left out, and a passage left out keeps all of them. The corridor keeps four: in the doorway passage from the Lodge’s bay, at the north end and in the middle of its long hall, and in the open elbow at the hall’s south end, at the foot of the flight. Its landing keeps the one in its elbow at the flight’s head, not the one in its short reveal, which would hang from a rib right by the vestibule’s arch. The Fortress’ eastern straight passages keep none, as its lanterns hang in its curve; its western climb keeps a few, see `bastionPassageLanterns`. Their lamps belong to the rooms, see their `lamps.ts`.
 */
const passageLanterns: Partial<Record<string, ReadonlyArray<boolean>>> = {
  corridor: [true, false, false, true, false, true, false, false, true],
  'corridor-landing': [false, true],
  'fortress-mouth': [],
  'fortress-approach': [],
  'fortress-climb_mouth': bastionPassageLanterns.mouth,
  'fortress-climb_run': bastionPassageLanterns.run,
  'fortress-climb_approach': bastionPassageLanterns.approach,
}
export default function CoveredPassage({passage, sole = false, material, paving: pavingOverride, timber, ribCutouts, transition}: {
  material: Material
  passage: Passage
  /** the floor laid in the passage’s material when other floors cover the rest; collision still uses the full passage floors */
  paving?: ReadonlyArray<FloorPolygon>
  ribCutouts?: ReadonlyArray<PassageCutout>
  /** whether the passage’s lanterns are all that lights it, which spaces them out */
  sole?: boolean
  timber?: Material
  /** a stone passage’s timber end, rendered separately; the paving and vault ribs stop where it begins */
  transition?: PassageTransition
}) {
  const geometry = useDisposable(useMemo(() => (timber ? TimberGeometry.passage(passage, ribCutouts) : new VaultGeometry(passage, transition?.length)), [passage, ribCutouts, timber, transition]))
  const lanterns = passageLanterns[passage.name]
  // Under timber, lanterns hang from the ribs rather than the planks between them.
  const mounts = useMemo(() => passagePendantMounts(passage, [geometry.shell, geometry.ribs], sole ? corridorLightSpacing : undefined, timber && geometry.ribs).filter((_, index) => lanterns?.[index] ?? !lanterns), [geometry, lanterns, sole, passage, timber])
  const paving = pavingOverride ?? transition?.stoneFloors ?? passage.floors
  // A timber lining’s crown is the ceiling along its spans; a slab there would share its plane. Only the open elbows show the slab.
  const ceilings = timber ? passage.junctions : passage.floors
  const collision = timber ? [] : [geometry.shell, geometry.ribs].map(colliderGeometry)
  const crown = passage.floorY + passage.height
  return <group name={passage.name}>
    <RigidBody colliders={false} type='fixed'>
      {passage.floors.map((floor, i) => <group key={i}>
        <ConvexHullCollider args={[slabCorners(floor, passage.floorY - slabDepth, passage.floorY)]} />
        <ConvexHullCollider args={[slabCorners(floor, crown, crown + slabDepth)]} />
      </group>)}
      {ceilings.map((ceiling, i) => <FloorSlab key={i} bottom={crown} depth={slabDepth} material={material} polygon={ceiling} />)}
      {paving.map((floor, i) => <FloorSlab key={i} bottom={passage.floorY - slabDepth} depth={slabDepth} material={material} polygon={floor} />)}
      <Branch not={timber}>{collision.map((args, i) => <TrimeshCollider key={i} args={args} />)}</Branch>
      <Branch if={timber}><TimberFrame geometry={geometry} lining={material} material={timber!} /></Branch>
      <Branch not={timber}>
        <mesh castShadow geometry={geometry.shell} material={material} name='castle-barrel-vault' receiveShadow />
        <mesh castShadow geometry={geometry.ribs} material={material} name='castle-vault-ribs' receiveShadow />
      </Branch>
    </RigidBody>
    <PendantLamps body={passageLantern} glow={passageLanternGlow} mounts={mounts} name={`${passage.name}-pendants`} />
  </group>
}
