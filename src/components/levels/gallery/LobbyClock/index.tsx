import type {Material, Mesh} from 'three/webgpu'

import {useFrame} from '@react-three/fiber'
import {CylinderCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo, useRef} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import lobbyClock, {clockHandAngles, lobbyClockCenterY} from '#src/lib/gallery/lobbyClock.ts'
import LobbyClockGeometry, {clockLayers} from '#src/lib/gallery/LobbyClockGeometry.ts'
import {roundFrameReach} from '#src/lib/gallery/LobbyVaultGeometry.ts'
import ClockDialMaterial from '#src/lib/materials/ClockDialMaterial.ts'

/**
 * The great clock in the Lobby’s south lunette with its gloire, keeping the visitor’s local time. Rendered inside the vault’s
 * group, on the face of the lunette at `z`; it shares the vault’s stone and gilding.
 */
export default function LobbyClock({gilt, stone, z}: {
  gilt: Material
  stone: Material
  /** the lunette’s face, which the clock looks away from toward the room’s center */
  z: number
}) {
  const geometry = useDisposable(useMemo(() => new LobbyClockGeometry, []))
  const dial = useDisposable(useMemo(() => new ClockDialMaterial({
    chapter: lobbyClock.chapter,
    radius: lobbyClock.radius,
  }), []))
  // Fire-blued steel, darker than the lapis around the numerals, so the hands read against ivory and enamel alike.
  const steel = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#141b30',
    metalness: 0.6,
    roughness: 0.26,
  }), []))
  const hour = useRef<Mesh>(null)
  const minute = useRef<Mesh>(null)
  useFrame(() => {
    const angles = clockHandAngles(new Date)
    // Seen from the room, the frame’s +z faces the viewer, so clockwise turns are negative about it.
    hour.current?.rotation.set(0, 0, -angles.hour)
    minute.current?.rotation.set(0, 0, -angles.minute)
  })
  const depth = clockLayers.boss + 0.06
  return <group name='lobby-clock' position={[0, lobbyClockCenterY, z]} rotation={[0, Math.PI, 0]}>
    <RigidBody colliders={false} type='fixed'>
      <CylinderCollider args={[depth / 2, roundFrameReach(lobbyClock.radius)]} position={[0, 0, depth / 2]} rotation={[Math.PI / 2, 0, 0]} />
    </RigidBody>
    <mesh castShadow geometry={geometry.stone} material={stone} name='lobby-clock-frame' receiveShadow />
    <mesh castShadow geometry={geometry.gold} material={gilt} name='lobby-clock-gilding' receiveShadow />
    <mesh geometry={geometry.dial} material={dial} name='lobby-clock-dial' receiveShadow />
    <mesh castShadow geometry={geometry.hourHand} material={steel} name='lobby-clock-hour-hand' ref={hour} />
    <mesh castShadow geometry={geometry.minuteHand} material={steel} name='lobby-clock-minute-hand' ref={minute} />
  </group>
}
