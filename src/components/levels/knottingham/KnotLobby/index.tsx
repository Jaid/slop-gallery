import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import KnotModelSign from '#component/levels/knottingham/KnotModelSign'
import KnotPreviewSign from '#component/levels/knottingham/KnotPreviewSigns'
import CheckerMarbleFloor from '#src/components/Scene/CheckerMarbleFloor.tsx'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import Box from '#src/components/Scene/primitives.tsx'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {knotGalleryBounds, knotGalleryCenter, knotGallerySize, knotGalleryWalls} from '#src/lib/gallery/knotGallery.ts'
import {knotBays, knotLayout} from '#src/lib/knots/exhibition.ts'

/** The Knot level’s shell and lighting, without museum rooms or their physics. */
export default function KnotLobby() {
  const textures = useMemo(() => ({
    plaster: surfaceTexture('plaster'),
  }), [])
  useEffect(() => () => {
    textures.plaster.dispose()
  }, [textures])
  return <>
    <color attach="background" args={['#ded8ca']}/>
    <group name="knottingham-lobby">
      <ambientLight intensity={0.45}/>
      <hemisphereLight args={['#e1edff', '#80705d', 1.3]}/>
      <directionalLight position={[-3, 9, -16]} intensity={2.3} color="#fff0d7"/>
      {knotGalleryWalls.map(wall => <WallSurface key={wall.id} wall={wall} surfaceRoom="vesper" plaster={textures.plaster}/>)}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[knotGallerySize[0] / 2, 0.12, knotGallerySize[2] / 2]} position={[knotGalleryCenter[0], -0.12, knotGalleryCenter[2]]}/>
        <CuboidCollider args={[knotGallerySize[0] / 2, 0.09, knotGallerySize[2] / 2]} position={[knotGalleryCenter[0], knotGalleryBounds.height, knotGalleryCenter[2]]}/>
      </RigidBody>
      <Box position={[knotGalleryCenter[0], -0.12, knotGalleryCenter[2]]} size={[knotGallerySize[0], 0.24, knotGallerySize[2]]} color="#23201d" roughness={0.8}/>
      <group position={knotGalleryCenter}><CheckerMarbleFloor width={knotGallerySize[0]} depth={knotGallerySize[2]} reflections/></group>
      <Box position={[knotGalleryCenter[0], knotGalleryBounds.height, knotGalleryCenter[2]]} size={[knotGallerySize[0], 0.18, knotGallerySize[2]]} color="#7c9586"/>
      {knotBays.map(bay => <group key={bay.model} position={bay.center}>
        <mesh position={[knotLayout.rowCenterX(bay.finishes.length), knotGalleryBounds.height - 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[(bay.finishes.length - 1) * knotLayout.itemSpacing + 2.4, 2.2]}/>
          <meshBasicNodeMaterial color="#fff3d8"/>
        </mesh>
        <KnotPreviewSign bay={bay}/>
        <KnotModelSign bay={bay}/>
      </group>)}

    </group>
  </>
}
