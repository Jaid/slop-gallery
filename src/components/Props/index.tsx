import Orb from '#component/Orb'
import Pedestal, {usePedestal} from '#component/Pedestal'
import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import Box from '#src/components/Scene/primitives.tsx'
import {oculusLandingPlinths} from '#src/lib/gallery/lowerGallery.ts'
import {halloweenOrb, orbRadius} from '#src/lib/gallery/orbs.ts'
import sienna from '#src/lib/gallery/sienna.ts'
import gold from '#src/lib/materials/gold.ts'

const [westPlinth, eastPlinth] = oculusLandingPlinths
const plinthTop = (plinth: typeof westPlinth) => plinth.position[1] + plinth.height / 2

export default function Props() {
  const pedestal = usePedestal()
  return <>
    <group userData={{room: 'vesper'}}><Pedestal {...pedestal} position={[-14, 0, 1]} /></group>
    <GrabbableProp id='prop-apple' orbit={{radius: 0.33}} position={[-14, 1.57, 1]} title='The original forbidden download' type='dynamic'>
      <mesh castShadow material={gold} scale={[1, 0.93, 1]}><sphereGeometry args={[0.27, 32, 24]} /></mesh>
      <Box color='#645840' position={[0, 0.3, 0]} size={[0.035, 0.18, 0.04]} />
    </GrabbableProp>
    {/* On the can-shaped plinths behind the Oculus switchback landings */}
    <GrabbableProp id='prop-cube' orbit={{radius: Math.sqrt(3) * 0.15}} position={[westPlinth.position[0], plinthTop(westPlinth) + 0.15, westPlinth.position[2]]} rotation={[0, 0.4, 0]} title='A cube that has seen things' type='dynamic'>
      <mesh castShadow material={gold} receiveShadow><boxGeometry args={[0.3, 0.3, 0.3]} /></mesh>
    </GrabbableProp>
    <GrabbableProp id='prop-ring' orbit={{radius: 0.24}} position={[eastPlinth.position[0], plinthTop(eastPlinth) + 0.06, eastPlinth.position[2]]} rotation={[Math.PI / 2, 0, 0]} title='One ring, to keep things simple' type='dynamic'>
      <mesh castShadow material={gold} receiveShadow><torusGeometry args={[0.18, 0.06, 12, 32]} /></mesh>
    </GrabbableProp>
    {/* On the Sienna’s rug, between its spawn and the chandelier, sunk into the pile: only the floor under it collides */}
    <Orb orb={halloweenOrb} position={[sienna.center[0] - 1, orbRadius, sienna.center[1] + 1]} />
  </>
}
