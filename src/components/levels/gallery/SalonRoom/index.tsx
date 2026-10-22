import type {Wall} from '#src/lib/gallery.ts'
import type {Material, Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo, useState} from 'react'
import {MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Object3D, PlaneGeometry} from 'three/webgpu'
import useGraphicsMode from 'use-graphics-mode'

import BenchSeat from '#component/levels/gallery/BenchSeat'
import RoomFloor from '#component/levels/gallery/RoomFloor'
import Box from '#src/components/Scene/primitives.tsx'
import {rooms, walls} from '#src/lib/gallery.ts'
import {wallFace, wallOpeningTrim} from '#src/lib/gallery/architecture.ts'
import {lightingPresets, useLighting} from '#src/lib/gallery/lighting.ts'
import {salonBench, salonBenchLegs, salonCeiling, salonSkyLight, salonSkylight, salonWainscot, wainscotFields, wallDressingSpans} from '#src/lib/gallery/salon.ts'
import gold from '#src/lib/materials/gold.ts'
import VaultGlassMaterial from '#src/lib/materials/VaultGlassMaterial.ts'

const room = rooms.find(candidate => candidate.id === 'salon')!
const salonWalls = walls.filter(wall => wall.room === 'salon')

/** The Salon: Prussian blue walls hung frame to frame, oak herringbone underfoot and a coffered skylight overhead. */
export default function SalonRoom({glass, stone, wood}: {
  glass: Material
  stone: Texture
  wood: Texture
}) {
  const dado = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#16222f',
    roughness: 0.78,
  }), []))
  const plaster = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#e6decb',
    roughness: 0.9,
  }), []))
  // Painted cast iron, as old skylight glazing bars are; gilt would catch the lamps right below it as a glaring streak.
  const ironwork = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#4c463c',
    metalness: 0.2,
    roughness: 0.7,
  }), []))
  const isHeavy = useGraphicsMode()
  // The Lobby vault’s cast glass, divided into the same panes as the bars below it.
  const skylight = useDisposable(useMemo(() => new VaultGlassMaterial({
    heavy: isHeavy,
    paneSize: [salonSkylight.pane, salonSkylight.pane],
  }), [isHeavy]))
  const [openingX, openingZ] = salonSkylight.opening
  return <group name='salon'>
    <group position={[room.center[0], 0, room.center[1]]}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, 5.9, 0]} />
      </RigidBody>
      <RoomFloor glass={glass} room={room} stone={stone} wood={wood} />
      {/* The slab, cut around the skylight’s opening. */}
      {[-1, 1].map(side => <group key={side}>
        <Box material={plaster} position={[0, salonCeiling.y, side * (room.size[1] + openingZ) / 4]} size={[room.size[0], salonCeiling.thickness, (room.size[1] - openingZ) / 2]} />
        <Box material={plaster} position={[side * (room.size[0] + openingX) / 4, salonCeiling.y, 0]} size={[(room.size[0] - openingX) / 2, salonCeiling.thickness, openingZ]} />
      </group>)}
      <Skylight gilt={gold} glass={skylight} ironwork={ironwork} plaster={plaster} />
      <SkyLight />
    </group>
    {salonWalls.map(wall => <WallDressing key={wall.id} dado={dado} gilt={gold} wall={wall} />)}
    <Ottoman />
  </group>
}

/** The sky’s light through the skylight, following the current lighting preset. */
function SkyLight() {
  const {color, intensity} = lightingPresets[useLighting(s => s.preset)].skylight
  // The target stays on the floor right below the light, so the cone points straight down.
  const [target] = useState(() => new Object3D)
  return <>
    <primitive object={target} />
    <spotLight angle={salonSkyLight.angle} color={color} decay={0} intensity={intensity} penumbra={salonSkyLight.penumbra} position={[0, salonSkyLight.y, 0]} target={target} userData={{daylight: true}} />
  </>
}
function Skylight({gilt, glass, ironwork, plaster}: {
  gilt: Material
  glass: Material
  ironwork: Material
  plaster: Material
}) {
  const {barDepth, barWidth, depth, frame, opening, pane} = salonSkylight
  const [halfX, halfZ] = opening.map(size => size / 2)
  const beamY = salonCeiling.underside - depth / 2
  const barY = salonSkylight.glassY - 0.005 - barDepth / 2
  const bars = (size: number) => Array.from({length: Math.round(size / pane) - 1}, (_, i) => -size / 2 + (i + 1) * pane)
  // Metric UVs, so the glass’s panes line up with the bars.
  const geometry = useDisposable(useMemo(() => {
    const plane = new PlaneGeometry(opening[0], opening[1])
    const uv = plane.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * opening[0], uv.getY(i) * opening[1])
    }
    return plane
  }, [opening]))
  return <group name='salon-skylight'>
    {/* The coffer ring hangs below the slab and frames the glass, with a gilt bead along its lower inner edge. */}
    {[-1, 1].map(side => <group key={side}>
      <Box material={plaster} position={[0, beamY, side * (halfZ + frame / 2)]} size={[opening[0] + frame * 2, depth, frame]} />
      <Box material={plaster} position={[side * (halfX + frame / 2), beamY, 0]} size={[frame, depth, opening[1]]} />
      <Box material={gilt} position={[0, salonCeiling.underside - depth - 0.02, side * (halfZ + 0.02)]} size={[opening[0] + 0.08, 0.04, 0.04]} />
      <Box material={gilt} position={[side * (halfX + 0.02), salonCeiling.underside - depth - 0.02, 0]} size={[0.04, 0.04, opening[1]]} />
    </group>)}
    {bars(opening[0]).map(x => <Box key={x} material={ironwork} position={[x, barY, 0]} size={[barWidth, barDepth, opening[1]]} />)}
    {bars(opening[1]).map(z => <Box key={z} material={ironwork} position={[0, barY, z]} size={[opening[0], barDepth, barWidth]} />)}
    <mesh geometry={geometry} material={glass} name='salon-skylight-glass' position={[0, salonSkylight.glassY, 0]} rotation={[Math.PI / 2, 0, 0]} />
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

