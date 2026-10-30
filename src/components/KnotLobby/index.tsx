import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {knotBays, knotPreviewX} from 'knot-materials/exhibition.ts'
import {useMemo} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {color, mix, texture} from 'three/tsl'
import {MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'
import {useGraphicsModeValue} from 'use-graphics-mode'

import KnotCandidateSign from '#component/KnotCandidateSign'
import KnotFloor from '#component/KnotFloor'
import KnotLights from '#component/KnotLights'
import KnotPreviewSigns from '#component/KnotPreviewSigns'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {knotGalleryBounds, knotGalleryCenter, knotGallerySize} from '#src/lib/gallery/knotGallery.ts'
import VelvetWallMaterial from '#src/lib/materials/VelvetWallMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import {readPmrem} from '#src/lib/rendering/pmrem.ts'
import knottingham from '#src/worlds/knottingham/index.ts'

// A product-shot studio that floods the hall from no visible source. Under ?pmrem=slop_gallery it dims to a faint fill in the gallery’s hemisphere colors, closer to the gallery’s mood, and leaves the hall to its LED panels.
const fillLights = readPmrem() === 'slop_gallery' ? {
  ambient: 0,
  sky: '#ecf3ff',
  ground: '#a29270',
  hemisphere: 0.3,
  key: 0,
} : {
  ambient: 0.45,
  sky: '#e1edff',
  ground: '#80705d',
  hemisphere: 1.3,
  key: 2.3,
}

/** The Arena’s shell and lighting, without the gallery’s rooms or their physics. */
export default function KnotLobby() {
  const {surfaceAnisotropy} = useGraphicsModeValue(getGraphicsProfile)
  const plaster = useMemo(() => surfaceTexture('plaster', surfaceAnisotropy), [surfaceAnisotropy])
  const shell = useMemo(() => ({
    floor: new RoundedBoxGeometry(knotGallerySize[0], 0.24, knotGallerySize[2], 2, 0.035),
    ceiling: new RoundedBoxGeometry(knotGallerySize[0], 0.18, knotGallerySize[2], 2, 0.045),
  }), [])
  const wallMaterial = useMemo(() => new VelvetWallMaterial, [])
  // Baseboards and cornice in black semi-gloss paint under a clear lacquer, which draws a crisp line of light along every edge.
  const trimMaterial = useMemo(() => new MeshPhysicalNodeMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    color: '#141315',
    envMapIntensity: 0.6,
    metalness: 0,
    roughness: 0.42,
  }), [])
  const ceilingMaterial = useDisposable(useMemo(() => {
    const material = new MeshStandardNodeMaterial({
      envMapIntensity: 0.7,
      metalness: 0,
      roughness: 0.9,
    })
    const finish = mix(texture(plaster).rgb, color('#381b1d'), 0.82)
    material.colorNode = finish
    material.emissiveNode = finish.mul(0.18)
    return material
  }, [plaster]))
  useDisposable(plaster)
  useDisposable(shell.floor)
  useDisposable(shell.ceiling)
  useDisposable(wallMaterial)
  useDisposable(trimMaterial)
  return <>
    <color args={['#ded8ca']} attach='background' />
    <group name='knottingham-lobby'>
      <ambientLight intensity={fillLights.ambient} />
      <hemisphereLight color={fillLights.sky} groundColor={fillLights.ground} intensity={fillLights.hemisphere} />
      <directionalLight color='#fff0d7' intensity={fillLights.key} position={[-3, 9, -16]} />
      {knottingham.walls.map(wall => <WallSurface key={wall.id} material={trimMaterial} plaster={plaster} surfaceMaterial={wallMaterial} surfaceRoom='vesper' wall={wall} />)}
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[knotGallerySize[0] / 2, 0.12, knotGallerySize[2] / 2]} position={[knotGalleryCenter[0], -0.12, knotGalleryCenter[2]]} />
        <CuboidCollider args={[knotGallerySize[0] / 2, 0.09, knotGallerySize[2] / 2]} position={[knotGalleryCenter[0], knotGalleryBounds.height, knotGalleryCenter[2]]} />
      </RigidBody>
      <mesh castShadow geometry={shell.floor} name='knottingham-floor-slab' position={[knotGalleryCenter[0], -0.12, knotGalleryCenter[2]]} receiveShadow>
        <meshStandardNodeMaterial color='#23201d' roughness={0.8} />
      </mesh>
      <KnotFloor />
      <mesh castShadow geometry={shell.ceiling} material={ceilingMaterial} name='knottingham-ceiling' position={[knotGalleryCenter[0], knotGalleryBounds.height, knotGalleryCenter[2]]} receiveShadow />
      <KnotLights />
      {/* A lone Knot gets a plain room: its candidate sign alone names it, without a billboard. */}
      <Branch if={knotPreviewX !== null}><KnotPreviewSigns x={knotPreviewX!} /></Branch>
      {knotBays.map(bay => <group key={bay.candidate.id} position={bay.center}><KnotCandidateSign bay={bay} /></group>)}
    </group>
  </>
}
