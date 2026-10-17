import type {Wall} from '#src/lib/gallery.ts'
import type {Material, Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'

import BenchSeat from '#component/levels/gallery/BenchSeat'
import RoomFloor from '#component/levels/gallery/RoomFloor'
import Box from '#src/components/Scene/primitives.tsx'
import {rooms, walls} from '#src/lib/gallery.ts'
import {wallFace, wallOpeningTrim} from '#src/lib/gallery/architecture.ts'
import {salonBench, salonBenchLegs, salonCeiling, salonLaylight, salonLightOffsets, salonLightY, salonWainscot, wainscotFields, wallDressingSpans} from '#src/lib/gallery/salon.ts'
import LaylightGlassMaterial from '#src/lib/materials/LaylightGlassMaterial.ts'

const room = rooms.find(candidate => candidate.id === 'salon')!
const salonWalls = walls.filter(wall => wall.room === 'salon')

/** The Salon: Prussian blue walls hung frame to frame, oak herringbone underfoot and a coffered laylight overhead. */
export default function SalonRoom({glass, stone, wood}: {
  glass: Material
  stone: Texture
  wood: Texture
}) {
  const gilt = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#b38f4f',
    metalness: 0.8,
    roughness: 0.3,
  }), []))
  const dado = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#16222f',
    roughness: 0.78,
  }), []))
  const plaster = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#e6decb',
    roughness: 0.9,
  }), []))
  // Painted cast iron, as old laylight glazing bars are; gilt would catch the lamps right below it as a glaring streak.
  const ironwork = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#4c463c',
    metalness: 0.2,
    roughness: 0.7,
  }), []))
  // Both laylights lie a whole number of panes apart, so one pane grid serves them both.
  const laylight = useDisposable(useMemo(() => new LaylightGlassMaterial(salonLaylight.opening / salonLaylight.panes, [room.center[0] - salonLaylight.opening / 2, room.center[1] + salonLaylight.centers[0] - salonLaylight.opening / 2]), []))
  return <group name='salon'>
    <group position={[room.center[0], 0, room.center[1]]}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, 5.9, 0]} />
      </RigidBody>
      <RoomFloor glass={glass} room={room} stone={stone} wood={wood} />
      <Box material={plaster} position={[0, salonCeiling.y, 0]} size={[room.size[0], salonCeiling.thickness, room.size[1]]} />
      {salonLaylight.centers.map(z => <Laylight key={z} gilt={gilt} glass={laylight} ironwork={ironwork} plaster={plaster} z={z} />)}
      {salonLightOffsets.map(z => <pointLight key={z} castShadow={z < 0} color='#f6f1e6' decay={2} distance={14} intensity={32} position={[0, salonLightY, z]} shadow-mapSize={[1024, 1024]} shadow-normalBias={0.03} />)}
    </group>
    {salonWalls.map(wall => <WallDressing key={wall.id} dado={dado} gilt={gilt} wall={wall} />)}
    <Ottoman />
  </group>
}

function Laylight({gilt, glass, ironwork, plaster, z}: {
  gilt: Material
  glass: Material
  ironwork: Material
  plaster: Material
  /** offset of its center from the room center along z */
  z: number
}) {
  const {barDepth, barWidth, depth, frame, opening, panes} = salonLaylight
  const half = opening / 2
  const beamY = salonCeiling.underside - depth / 2
  const bars = Array.from({length: panes - 1}, (_, i) => -half + (i + 1) * opening / panes)
  return <group name='salon-laylight' position={[0, 0, z]}>
    {/* The coffer ring hangs below the slab and frames the glass, with a gilt bead along its lower inner edge. */}
    {[-1, 1].map(side => <group key={side}>
      <Box material={plaster} position={[0, beamY, side * (half + frame / 2)]} size={[opening + frame * 2, depth, frame]} />
      <Box material={plaster} position={[side * (half + frame / 2), beamY, 0]} size={[frame, depth, opening]} />
      <Box material={gilt} position={[0, salonCeiling.underside - depth - 0.02, side * (half + 0.02)]} size={[opening + 0.08, 0.04, 0.04]} />
      <Box material={gilt} position={[side * (half + 0.02), salonCeiling.underside - depth - 0.02, 0]} size={[0.04, 0.04, opening]} />
    </group>)}
    {bars.map(offset => <group key={offset}>
      <Box castShadow={false} material={ironwork} position={[offset, salonLaylight.glassY - 0.005 - barDepth / 2, 0]} size={[barWidth, barDepth, opening]} />
      <Box castShadow={false} material={ironwork} position={[0, salonLaylight.glassY - 0.005 - barDepth / 2, offset]} size={[opening, barDepth, barWidth]} />
    </group>)}
    <mesh material={glass} name='salon-laylight-glass' position={[0, salonLaylight.glassY, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[opening, opening]} /></mesh>
  </group>
}
function WallDressing({dado, gilt, wall}: {
  dado: Material
  gilt: Material
  wall: Wall
}) {
  const {bottom, fieldDepth, margin, panelDepth, railBottom, railDepth, railHeight} = salonWainscot
  // North and south runs reach the corners; east and west ones stop at their faces, so no two meet in the same solid.
  const reachesCorners = Math.abs(Math.sin(wall.rotation)) < 0.5
  const panels = wallDressingSpans(wall, wallOpeningTrim, wallFace + (reachesCorners ? 0 : panelDepth))
  const rails = wallDressingSpans(wall, wallOpeningTrim, wallFace + (reachesCorners ? 0 : railDepth))
  return <group name={`${wall.id}-wainscot`} position={wall.center} rotation={[0, wall.rotation, 0]}>
    {panels.map(([start, end]) => <group key={start}>
      <Box material={dado} position={[(start + end) / 2, (bottom + railBottom) / 2, wallFace + panelDepth / 2]} size={[end - start, railBottom - bottom, panelDepth]} />
      {wainscotFields(start, end).map(([center, width]) => <Box key={center} material={dado} position={[center, (bottom + railBottom) / 2, wallFace + panelDepth + fieldDepth / 2]} size={[width, railBottom - bottom - margin * 2, fieldDepth]} />)}
    </group>)}
    {rails.map(([start, end]) => <Box key={start} material={gilt} position={[(start + end) / 2, railBottom + railHeight / 2, wallFace + railDepth / 2]} size={[end - start, railHeight, railDepth]} />)}
  </group>
}
function Ottoman() {
  const {apronHeight, cushionHeight, depth, legHeight, position, seatHeight, width} = salonBench
  const velvet = useDisposable(useMemo(() => new MeshPhysicalNodeMaterial({
    // Deep claret: the sheen lifts it at grazing angles, so the base stays darker than the velvet should read.
    color: '#4a0f19',
    roughness: 0.92,
    sheen: 1,
    sheenColor: '#9c4651',
    sheenRoughness: 0.5,
  }), []))
  const walnut = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#3a2214',
    roughness: 0.45,
  }), []))
  return <RigidBody colliders={false} name='salon-ottoman' position={position} type='fixed'>
    <CuboidCollider args={[width / 2, seatHeight / 2, depth / 2]} position={[0, seatHeight / 2, 0]} />
    {salonBenchLegs.map(([x, z]) => <mesh key={`${x}:${z}`} castShadow material={walnut} position={[x, legHeight / 2, z]} receiveShadow><cylinderGeometry args={[0.04, 0.026, legHeight, 16]} /></mesh>)}
    <Box material={walnut} position={[0, legHeight + apronHeight / 2, 0]} size={[width - 0.06, apronHeight, depth - 0.06]} />
    <BenchSeat material={velvet} position={[0, legHeight + apronHeight + cushionHeight / 2, 0]} size={[width, cushionHeight + 0.02, depth]} />
  </RigidBody>
}

