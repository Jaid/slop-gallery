import type {Group} from 'three/webgpu'

import {useFrame} from '@react-three/fiber'
import {useMemo, useRef} from 'react'
import {useGraphicsModeValue} from 'use-graphics-mode'

import Orbitable from '#component/Orbitable'
import {useAmbienceEmitter} from '#src/lib/audio/ambience/ambienceEmitters.ts'
import MoonfallOrbitAmbience from '#src/lib/audio/ambience/MoonfallOrbit.ts'
import {AnimationClock} from '#src/lib/frozenTime.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import slopGallery from '#src/worlds/gallery/index.ts'

const room = slopGallery.room('moonfall')
// Below the ceiling’s beams, so orbiting never rises out of the room.
const sculptureOrbit = {
  radius: 1.85,
  ceilingY: room.floorY + 5.3,
  // The dark room melts away around the glowing rings.
  blur: 2,
}

export default function MoonfallOrbit() {
  const orbit = useRef<Group>(null)
  const clock = useMemo(() => new AnimationClock(0.05), [])
  const {curveDetail} = useGraphicsModeValue(getGraphicsProfile)
  useAmbienceEmitter(MoonfallOrbitAmbience, slopGallery.ambienceRooms('moonfall', 'moonfall-orbital_sculpture'))
  // The core’s detail 2 splits each edge in three, so the factor applies to that count.
  const coreDetail = 3 * curveDetail - 1
  useFrame((_, delta) => {
    const t = clock.advance(delta)
    if (orbit.current) {
      orbit.current.rotation.y = t * 0.12
    }
  })
  return <Orbitable id='moonfall-orbital-sculpture' name='moonfall-orbital-sculpture' orbit={sculptureOrbit} position={[0, 2.5, 0]} title='Orbital sculpture'>
    <mesh castShadow><icosahedronGeometry args={[0.7, coreDetail]} /><meshStandardNodeMaterial color='#11252c' envMapIntensity={0.35} metalness={0.8} roughness={0.3} /></mesh>
    <group ref={orbit}>
      {[0, 1, 2].map(i => <group key={i} rotation={[0.65 + i * 0.7, i * Math.PI / 3, i * 0.35]}>
        <mesh><torusGeometry args={[1.25 + i * 0.26, 0.018, 8 * curveDetail, 128 * curveDetail]} /><meshStandardNodeMaterial color={i === 1 ? '#d5ad73' : '#8ad6cd'} emissive={i === 1 ? '#d5ad73' : '#62b6b1'} emissiveIntensity={2.2} roughness={0.4} /></mesh>
        <mesh position={[1.25 + i * 0.26, 0, 0]}><sphereGeometry args={[0.065, 16 * curveDetail, 12 * curveDetail]} /><meshBasicNodeMaterial color='#e4e7d5' toneMapped={false} /></mesh>
      </group>)}
    </group>
  </Orbitable>
}
