import type {Material, Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {CircleGeometry, ExtrudeGeometry, MeshStandardNodeMaterial, Path, Shape} from 'three/webgpu'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'

import RoomFloor from '#component/RoomFloor'
import Box from '#src/components/Scene/primitives.tsx'
import StaticBatch from '#src/components/Scene/StaticBatch.tsx'
import {cinnabarRooflight, cinnabarTerrazzo} from '#src/lib/gallery/cinnabar.ts'
import {salonCeiling} from '#src/lib/gallery/salon.ts'
import gold from '#src/lib/materials/gold.ts'
import TerrazzoFloorMaterial, {blackTerrazzo, venetianTerrazzo} from '#src/lib/materials/TerrazzoFloorMaterial.ts'
import VaultGlassMaterial from '#src/lib/materials/VaultGlassMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import slopGallery from '#src/worlds/gallery/index.ts'

const room = slopGallery.room('cinnabar')
const circleSegments = 96
/** The Cinnabar: a Pompeian red sculpture hall with a black socle, polished terrazzo underfoot and a plaster ceiling pierced by a round rooflight. */
export default function CinnabarRoom({glass, stone, wood}: {
  glass: Material
  stone: Texture
  wood: Texture
}) {
  const plaster = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#e6decb',
    roughness: 0.9,
  }), []))
  const {floorReflections} = useGraphicsModeValue(getGraphicsProfile)
  const terrazzo = useDisposable(useMemo(() => new TerrazzoFloorMaterial({
    center: room.center,
    size: room.size,
    field: venetianTerrazzo,
    border: blackTerrazzo,
    inset: cinnabarTerrazzo.border,
    reflections: floorReflections,
    // Polished hard like the Banquet’s marble, so the red walls and the rooflight mirror clearly in it.
    strength: 0.4,
    grazingStrength: 0.2,
    loss: 0,
    roughness: 0.1,
  }), [floorReflections]))
  const floor = useMemo(() => ({
    slab: terrazzo,
    reflection: terrazzo.reflectionTarget ?? undefined,
  }), [terrazzo])
  return <group name='cinnabar'>
    <group position={[room.center[0], 0, room.center[1]]}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, 5.9, 0]} />
      </RigidBody>
      <RoomFloor glass={glass} materials={floor} room={room} stone={stone} wood={wood} />
      <Ceiling plaster={plaster} />
      <Rooflight gilt={gold} plaster={plaster} />
    </group>
  </group>
}

/** A flat ring lying in the x/z plane with its underside at y = 0, from `inner` to `outer` radius, `depth` thick. */
function ring(inner: number, outer: number, depth: number) {
  const shape = new Shape
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
  const hole = new Path
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: circleSegments,
  })
  return geometry.rotateX(-Math.PI / 2)
}
/** The slab, cut round the rooflight’s opening. */
function Ceiling({plaster}: {plaster: Material}) {
  const geometry = useDisposable(useMemo(() => {
    const [width, depth] = room.size
    const shape = new Shape
    shape.moveTo(-width / 2, -depth / 2)
    shape.lineTo(width / 2, -depth / 2)
    shape.lineTo(width / 2, depth / 2)
    shape.lineTo(-width / 2, depth / 2)
    shape.closePath()
    const hole = new Path
    hole.absarc(0, 0, cinnabarRooflight.radius, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const slab = new ExtrudeGeometry(shape, {
      depth: salonCeiling.thickness,
      bevelEnabled: false,
      curveSegments: circleSegments,
    })
    return slab.rotateX(-Math.PI / 2).translate(0, salonCeiling.y - salonCeiling.thickness / 2, 0)
  }, []))
  return <mesh castShadow geometry={geometry} material={plaster} name='cinnabar-ceiling' receiveShadow />
}
/** The ring of plaster round the opening, hanging below the slab with a gilt bead along its lower inner edge, the glazing bars in a square grid and the disc of cast glass over them. */
function Rooflight({gilt, plaster}: {
  gilt: Material
  plaster: Material
}) {
  const {barDepth, barWidth, bead, depth, frame, glassY, pane, radius} = cinnabarRooflight
  const isHeavy = useGraphicsMode()
  // Painted cast iron, as old rooflight glazing bars are.
  const ironwork = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#4c463c',
    metalness: 0.2,
    roughness: 0.7,
  }), []))
  // The Lobby vault’s cast glass, divided into the same panes as the bars below it.
  const glass = useDisposable(useMemo(() => new VaultGlassMaterial({
    heavy: isHeavy,
    paneSize: [pane, pane],
  }), [isHeavy, pane]))
  const frameGeometry = useDisposable(useMemo(() => ring(radius, radius + frame, depth), [depth, frame, radius]))
  const beadGeometry = useDisposable(useMemo(() => ring(radius - bead, radius + bead, bead), [bead, radius]))
  // Metric UVs from the disc’s south-west corner, so the glass’s panes line up with the bars.
  const glassGeometry = useDisposable(useMemo(() => {
    const disc = new CircleGeometry(radius, circleSegments)
    const uv = disc.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * radius * 2, uv.getY(i) * radius * 2)
    }
    return disc
  }, [radius]))
  const barY = glassY - 0.005 - barDepth / 2
  // The bars on the joints between the panes, laid across the disc from edge to edge, each as long as its chord.
  const bars = Array.from({length: Math.round(radius * 2 / pane) - 1}, (_, i) => -radius + (i + 1) * pane).map(offset => ({
    offset,
    length: 2 * Math.sqrt(radius ** 2 - offset ** 2),
  }))
  return <StaticBatch name='cinnabar-rooflight'>
    <mesh castShadow geometry={frameGeometry} material={plaster} name='cinnabar-rooflight-frame' position={[0, salonCeiling.underside - depth, 0]} receiveShadow />
    <mesh castShadow geometry={beadGeometry} material={gilt} name='cinnabar-rooflight-bead' position={[0, salonCeiling.underside - depth - bead, 0]} receiveShadow />
    {bars.map(({offset, length}) => <Box key={`x${offset}`} material={ironwork} position={[offset, barY, 0]} size={[barWidth, barDepth, length]} />)}
    {bars.map(({offset, length}) => <Box key={`z${offset}`} material={ironwork} position={[0, barY, offset]} size={[length, barDepth, barWidth]} />)}
    <mesh geometry={glassGeometry} material={glass} name='cinnabar-rooflight-glass' position={[0, glassY, 0]} rotation={[Math.PI / 2, 0, 0]} />
  </StaticBatch>
}
