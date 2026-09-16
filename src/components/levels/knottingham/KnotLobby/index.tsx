import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useEffect, useMemo, useState} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {color, mix, texture} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import KnotCandidateSign from '#component/levels/knottingham/KnotCandidateSign'
import KnotLights from '#component/levels/knottingham/KnotLights'
import KnotPreviewSign from '#component/levels/knottingham/KnotPreviewSigns'
import CheckerMarbleFloor from '#src/components/Scene/CheckerMarbleFloor.tsx'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {isTextInput, notify} from '#src/lib/gallery.ts'
import {knotGalleryBounds, knotGalleryCenter, knotGallerySize, knotGalleryWalls} from '#src/lib/gallery/knotGallery.ts'
import {knotBays} from '#src/lib/knots/exhibition.ts'
import ArchitecturalPlasterMaterial from '#src/lib/materials/ArchitecturalPlasterMaterial.ts'

const ceilingVariants = [
  {
    color: '#191715',
    label: 'Charcoal plaster',
    roughness: 0.92,
    surface: 'plaster',
  },
  {
    color: '#381b1d',
    label: 'Oxblood plaster',
    roughness: 0.9,
    surface: 'plaster',
  },
  {
    color: '#56342d',
    label: 'Smoked walnut',
    roughness: 0.74,
    surface: 'wood',
  },
  {
    color: '#682d27',
    label: 'Red mahogany',
    roughness: 0.67,
    surface: 'wood',
  },
  {
    color: '#4c3a2d',
    label: 'Tobacco oak',
    roughness: 0.79,
    surface: 'wood',
  },
] as const

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
  const ceilingMaterials = useDisposable(useMemo(() => {
    const variants = ceilingVariants.map(variant => {
      const material = new MeshStandardNodeMaterial({
        envMapIntensity: 0.7,
        metalness: 0,
        roughness: variant.roughness,
      })
      const detail = texture(variant.surface === 'wood' ? wood : plaster).rgb
      const finish = mix(detail, color(variant.color), variant.surface === 'wood' ? 0.58 : 0.82)
      material.colorNode = finish
      material.emissiveNode = finish.mul(variant.surface === 'wood' ? 0.24 : 0.18)
      return material
    })
    return {
      variants,
      dispose() {
        for (const material of variants) {
          material.dispose()
        }
      },
    }
  }, [plaster, wood]))
  const [ceilingVariant, setCeilingVariant] = useState(0)
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'KeyK' || event.repeat || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isTextInput(event.target)) {
        return
      }
      const next = (ceilingVariant + 1) % ceilingVariants.length
      setCeilingVariant(next)
      notify(`Ceiling ${next + 1}/${ceilingVariants.length} · ${ceilingVariants[next].label}`)
    }
    globalThis.addEventListener('keydown', down)
    return () => globalThis.removeEventListener('keydown', down)
  }, [ceilingVariant])
  useDisposable(plaster)
  useDisposable(wood)
  useDisposable(shell.floor)
  useDisposable(shell.ceiling)
  useDisposable(wallMaterial)
  useDisposable(trimMaterial)
  return <>
    <color args={['#ded8ca']} attach='background' />
    <group name='knottingham-lobby'>
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#e1edff', '#80705d', 1.3]} />
      <directionalLight color='#fff0d7' intensity={2.3} position={[-3, 9, -16]} />
      {knotGalleryWalls.map(wall => <WallSurface key={wall.id} material={trimMaterial} plaster={plaster} surfaceMaterial={wallMaterial} surfaceRoom='vesper' wall={wall} />)}
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[knotGallerySize[0] / 2, 0.12, knotGallerySize[2] / 2]} position={[knotGalleryCenter[0], -0.12, knotGalleryCenter[2]]} />
        <CuboidCollider args={[knotGallerySize[0] / 2, 0.09, knotGallerySize[2] / 2]} position={[knotGalleryCenter[0], knotGalleryBounds.height, knotGalleryCenter[2]]} />
      </RigidBody>
      <mesh castShadow geometry={shell.floor} name='knottingham-floor-slab' position={[knotGalleryCenter[0], -0.12, knotGalleryCenter[2]]} receiveShadow>
        <meshStandardNodeMaterial color='#23201d' roughness={0.8} />
      </mesh>
      <group position={knotGalleryCenter}><CheckerMarbleFloor depth={knotGallerySize[2]} detailed width={knotGallerySize[0]} /></group>
      <mesh castShadow geometry={shell.ceiling} material={ceilingMaterials.variants[ceilingVariant]} name='knottingham-ceiling' position={[knotGalleryCenter[0], knotGalleryBounds.height, knotGalleryCenter[2]]} receiveShadow />
      <KnotLights />
      {knotBays.map(bay => <group key={bay.candidate.id} position={bay.center}>
        <KnotPreviewSign bay={bay} />
        <KnotCandidateSign bay={bay} />
      </group>)}
    </group>
  </>
}
