import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useMemo} from 'react'

import KnotShowcase from '#component/KnotShowcase'
import SlopedBox from '#component/SlopedBox'
import Box from '#src/components/Scene/primitives.tsx'
import {useEnvironmentSeed} from '#src/lib/gallery.ts'
import {tunnelSlope} from '#src/lib/gallery/lowerGallery.ts'
import exhibitionKnots, {exhibitionPedestal, exhibitionSlots} from '#src/rooms/exhibition/knots.ts'

const {blockHeight, capHeight, capWidth, revealHeight, width} = exhibitionPedestal
/** The Exhibition’s six Knots, three behind each display window, which the environment’s seed picks, each floating over a pedestal of its own. */
export default function ExhibitionKnots({material}: {material: Material}) {
  const seed = useEnvironmentSeed()
  const knots = useMemo(() => exhibitionKnots(seed), [seed])
  return <group name='exhibition-knots'>
    {exhibitionSlots.map(slot => <RigidBody key={slot.id} colliders={false} name={`${slot.id}-pedestal`} position={slot.floor} type='fixed'>
      <ExhibitionPedestal material={material} />
    </RigidBody>)}
    <KnotShowcase knots={knots} />
  </group>
}

/** A pedestal on a display’s sloping floor: a block whose foot follows the slope, a dark shadow gap and a level metal cap well below the Knot over it. */
function ExhibitionPedestal({material}: {material: Material}) {
  return <>
    <SlopedBox bottomSlope={tunnelSlope} material={material} name='exhibition-pedestal-block' position={[0, blockHeight / 2, 0]} size={[width, blockHeight, width]} slope={0} />
    <Box color='#1f2628' name='exhibition-pedestal-reveal' position={[0, blockHeight + revealHeight / 2, 0]} roughness={0.85} size={[width - 0.04, revealHeight, width - 0.04]} />
    <CuboidCollider args={[capWidth / 2, (revealHeight + capHeight) / 2, capWidth / 2]} position={[0, blockHeight + (revealHeight + capHeight) / 2, 0]} />
    <Box color='#788586' metalness={0.65} name='exhibition-pedestal-cap' position={[0, blockHeight + revealHeight + capHeight / 2, 0]} roughness={0.35} size={[capWidth, capHeight, capWidth]} />
  </>
}
