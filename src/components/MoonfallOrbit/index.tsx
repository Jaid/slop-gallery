import type {Group, Mesh} from 'three/webgpu'

import {useFrame} from '@react-three/fiber'
import useDisposable from 'disposable-lifetime/react'
import {useMemo, useRef} from 'react'
import {color, exp, float, uniform, uv} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'
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
/** Each ring: its tilt, how fast it precesses round the vertical (radians per second, the middle one against the others), how far it nods, and how fast its bead runs round it, the inner ones faster like planets. */
const rings = [0, 1, 2].map(i => ({
  radius: 1.25 + i * 0.26,
  tilt: [0.65 + i * 0.7, i * Math.PI / 3, i * 0.35] as const,
  precession: [0.12, -0.085, 0.06][i],
  nod: 0.06 + i * 0.02,
  revolution: [0.95, 0.62, 0.41][i],
  hue: i === 1 ? '#d5ad73' : '#62b6b1',
  tint: i === 1 ? '#d5ad73' : '#8ad6cd',
}))
/** The Moonfall’s orbital sculpture: a dark core under three glowing rings, each precessing and nodding on its own while its bead runs round it, trailing light. */
export default function MoonfallOrbit() {
  const turns = useRef<Array<Group | null>>([])
  const beads = useRef<Array<Mesh | null>>([])
  const clock = useMemo(() => new AnimationClock(0.05), [])
  const {curveDetail} = useGraphicsModeValue(getGraphicsProfile)
  useAmbienceEmitter(MoonfallOrbitAmbience, slopGallery.ambienceRooms('moonfall', 'moonfall-orbital_sculpture'))
  const materials = useDisposable(useMemo(() => {
    const list = rings.map(ring => ringMaterial(ring.tint, ring.hue, () => clock.time * ring.revolution / (Math.PI * 2) % 1))
    return {
      list,
      dispose: () => {
        for (const material of list) {
          material.dispose()
        }
      },
    }
  }, [clock]))
  // The core’s detail 2 splits each edge in three, so the factor applies to that count.
  const coreDetail = 3 * curveDetail - 1
  useFrame((_, delta) => {
    const t = clock.advance(delta)
    for (const [i, ring] of rings.entries()) {
      const turn = turns.current[i]
      if (turn) {
        turn.rotation.y = t * ring.precession
        turn.rotation.x = Math.sin(t * 0.23 + i * 2.1) * ring.nod
      }
      const angle = t * ring.revolution
      beads.current[i]?.position.set(Math.cos(angle) * ring.radius, Math.sin(angle) * ring.radius, 0)
    }
  })
  return <Orbitable id='moonfall-orbital-sculpture' name='moonfall-orbital-sculpture' orbit={sculptureOrbit} position={[0, 2.5, 0]} title='Orbital sculpture'>
    <mesh castShadow><icosahedronGeometry args={[0.7, coreDetail]} /><meshStandardNodeMaterial color='#11252c' envMapIntensity={0.35} metalness={0.8} roughness={0.3} /></mesh>
    {rings.map((ring, i) => <group
      key={i} ref={group => {
        turns.current[i] = group
      }}
    >
      <group rotation={ring.tilt}>
        <mesh material={materials.list[i]}><torusGeometry args={[ring.radius, 0.018, 8 * curveDetail, 128 * curveDetail]} /></mesh>
        <mesh
          position={[ring.radius, 0, 0]} ref={mesh => {
            beads.current[i] = mesh
          }}
        ><sphereGeometry args={[0.065, 16 * curveDetail, 12 * curveDetail]} /><meshBasicNodeMaterial color='#e4e7d5' toneMapped={false} /></mesh>
      </group>
    </group>)}
  </Orbitable>
}

/** A ring that glows brighter in a comet’s tail behind its bead, which `phaseAt` places (0–1 round the ring) every frame. */
function ringMaterial(tint: string, hue: string, phaseAt: () => number) {
  const phase = uniform(0).onRenderUpdate(phaseAt)
  // TorusGeometry’s u runs round the ring from +x, the way the bead travels.
  const behind = phase.sub(uv().x).fract()
  const tail = exp(behind.mul(-14)).mul(2.6)
  const material = new MeshStandardNodeMaterial({
    color: tint,
    roughness: 0.4,
  })
  material.emissiveNode = color(hue).mul(float(1.6).add(tail))
  return material
}
