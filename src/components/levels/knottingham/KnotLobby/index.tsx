import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import KnotCandidateSign from '#component/levels/knottingham/KnotCandidateSign'
import KnotLights from '#component/levels/knottingham/KnotLights'
import KnotPreviewSign from '#component/levels/knottingham/KnotPreviewSigns'
import CheckerMarbleFloor from '#src/components/Scene/CheckerMarbleFloor.tsx'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {knotGalleryBounds, knotGalleryCenter, knotGallerySize, knotGalleryWalls} from '#src/lib/gallery/knotGallery.ts'
import {knotBays} from '#src/lib/knots/exhibition.ts'
import ArchitecturalPlasterMaterial from '#src/lib/materials/ArchitecturalPlasterMaterial.ts'

/** The Knot level’s shell and lighting, without museum rooms or their physics. */
export default function KnotLobby() {
  const quality = useGraphicsQuality()
  const plaster = useMemo(() => surfaceTexture('plaster'), [])
  const wood = useMemo(() => surfaceTexture('wood'), [])
  const shell = useMemo(() => ({
    floor: new RoundedBoxGeometry(knotGallerySize[0], 0.24, knotGallerySize[2], 2, 0.035),
    ceiling: new RoundedBoxGeometry(knotGallerySize[0], 0.18, knotGallerySize[2], 2, 0.045),
  }), [])
  const wallMaterial = useMemo(() => new ArchitecturalPlasterMaterial({
    baseColor: '#8a3138',
    map: plaster,
    quality,
    roughness: 0.9,
  }), [plaster, quality])
  const trimMaterial = useMemo(() => new MeshStandardNodeMaterial({
    color: '#6d4a35',
    map: wood,
    roughness: 0.68,
  }), [wood])
  const ceilingMaterial = useMemo(() => new ArchitecturalPlasterMaterial({
    baseColor: '#7c9586',
    map: plaster,
    quality,
    roughness: 0.86,
  }), [plaster, quality])
  useDisposable(plaster)
  useDisposable(wood)
  useDisposable(shell.floor)
  useDisposable(shell.ceiling)
  useDisposable(wallMaterial)
  useDisposable(trimMaterial)
  useDisposable(ceilingMaterial)
  return <>
    <color attach="background" args={['#ded8ca']}/>
    <group name="knottingham-lobby">
      <ambientLight intensity={0.45}/>
      <hemisphereLight args={['#e1edff', '#80705d', 1.3]}/>
      <directionalLight position={[-3, 9, -16]} intensity={2.3} color="#fff0d7"/>
      {knotGalleryWalls.map(wall => <WallSurface key={wall.id} wall={wall} surfaceRoom="vesper" plaster={plaster} material={trimMaterial} surfaceMaterial={wallMaterial}/>)}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[knotGallerySize[0] / 2, 0.12, knotGallerySize[2] / 2]} position={[knotGalleryCenter[0], -0.12, knotGalleryCenter[2]]}/>
        <CuboidCollider args={[knotGallerySize[0] / 2, 0.09, knotGallerySize[2] / 2]} position={[knotGalleryCenter[0], knotGalleryBounds.height, knotGalleryCenter[2]]}/>
      </RigidBody>
      <mesh name="knottingham-floor-slab" geometry={shell.floor} position={[knotGalleryCenter[0], -0.12, knotGalleryCenter[2]]} castShadow receiveShadow>
        <meshStandardNodeMaterial color="#23201d" roughness={0.8}/>
      </mesh>
      <group position={knotGalleryCenter}><CheckerMarbleFloor width={knotGallerySize[0]} depth={knotGallerySize[2]} detailed/></group>
      <mesh name="knottingham-ceiling" geometry={shell.ceiling} material={ceilingMaterial} position={[knotGalleryCenter[0], knotGalleryBounds.height, knotGalleryCenter[2]]} castShadow receiveShadow/>
      <KnotLights/>
      {knotBays.map(bay => <group key={bay.candidate.id} position={bay.center}>
        <KnotPreviewSign bay={bay}/>
        <KnotCandidateSign bay={bay}/>
      </group>)}
    </group>
  </>
}
