import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {useGraphicsModeValue} from 'use-graphics-mode'

import Chandelier from '#component/levels/gallery/Chandelier'
import Box from '#src/components/Scene/primitives.tsx'
import {rooms, useGallery, walls} from '#src/lib/gallery.ts'
import {siennaCeilingBeam, siennaCeilingBeamOffsets, siennaCeilingPlanks, siennaRugSize, siennaRugThickness, siennaWainscot} from '#src/lib/gallery/sienna.ts'
import PersianRugMaterial from '#src/lib/materials/PersianRugMaterial.ts'
import PlankFloorMaterial from '#src/lib/materials/PlankFloorMaterial.ts'
import PlankMaterial from '#src/lib/materials/PlankMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

const room = rooms.find(candidate => candidate.id === 'sienna')!

/** The Sienna’s floor, rug, beams, wainscot and chandelier; its papered walls and their trim come from the shared wall surfaces. */
export default function SiennaRoom({joinery}: {
  /** dark wood with its grain along each mesh’s x axis (varnished, shared with the walls’ trim) and z axis (oiled, for the joists) */
  joinery: {
    /** the darker raised fields of the wainscot */
    panel: Material
    x: Material
    z: Material
  }
}) {
  const resetEpoch = useGallery(s => s.resetEpoch)
  const {floorReflections} = useGraphicsModeValue(getGraphicsProfile)
  // The planks blur a reflection to a faint smear, not worth a mirrored pass of the scene.
  const floor = useDisposable(useMemo(() => new PlankFloorMaterial(undefined, false), []))
  const ceiling = useDisposable(useMemo(() => new PlankMaterial(siennaCeilingPlanks), []))
  const rug = useDisposable(useMemo(() => new PersianRugMaterial(siennaRugSize), []))
  const reflection = floor.reflectionTarget
  return <>
    <group position={[room.center[0], 0, room.center[1]]}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, -0.15, 0]} />
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, 5.9, 0]} />
        <Box color='#392517' envMapIntensity={floorReflections ? 1 : 0} name='sienna-floor-slab' position={[0, -0.12, 0]} size={[room.size[0], 0.24, room.size[1]]} />
        <Box material={ceiling} name='sienna-ceiling' position={[0, 5.78, 0]} size={[room.size[0], 0.18, room.size[1]]} />
      </RigidBody>
      <mesh name='sienna-wood-floor' position={[0, 0.001, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[...room.size]} />
        <primitive attach='material' object={floor} />
        <Branch if={reflection}><primitive object={reflection!} /></Branch>
      </mesh>
      {siennaCeilingBeamOffsets(room.size[0]).map(x => <Box key={x} material={joinery.z} name='sienna-ceiling-beam' position={[x, siennaCeilingBeam.centerY, 0]} size={[siennaCeilingBeam.width, siennaCeilingBeam.height, room.size[1]]} />)}
      <mesh material={rug} name='sienna-carpet' position={[0, siennaRugThickness / 2, 0]} receiveShadow>
        <boxGeometry args={[siennaRugSize[0], siennaRugThickness, siennaRugSize[1]]} />
      </mesh>
      <Chandelier key={resetEpoch} />
    </group>
    {walls.filter(wall => wall.room === 'sienna').map(wall => <group key={wall.id} position={wall.center} rotation={[0, wall.rotation, 0]}>
      {siennaWainscot(wall).map(u => <group key={u} position={[u, 0, 0]}>
        <Box material={joinery.x} name='sienna-wainscot-frame' position={[0, 0.92, 0.125]} size={[2, 0.94, 0.025]} />
        <Box material={joinery.panel} name='sienna-wainscot-panel' position={[0, 0.92, 0.145]} size={[1.55, 0.65, 0.025]} />
        <Box material={joinery.x} name='sienna-wainscot-rail' position={[0, 1.42, 0.145]} size={[2, 0.045, 0.09]} />
      </group>)}
    </group>)}
  </>
}
