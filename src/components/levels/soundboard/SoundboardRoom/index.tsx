import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import SoundboardWall from '#component/levels/soundboard/SoundboardWall'
import CheckerMarbleFloor from '#src/components/Scene/CheckerMarbleFloor.tsx'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import Box from '#src/components/Scene/primitives.tsx'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {soundboardBounds, soundboardSize, soundboardWalls} from '#src/lib/audio/soundboard.ts'
import {archivedSoundEffects, enabledSoundEffects} from '#src/lib/audio/soundEffects.ts'

export default function SoundboardRoom() {
  const plaster = useMemo(() => surfaceTexture('plaster'), [])
  useEffect(() => () => plaster.dispose(), [plaster])
  const enabledWall = soundboardWalls.find(wall => wall.id === 'soundboard-enabled')!
  const archivedWall = soundboardWalls.find(wall => wall.id === 'soundboard-archived')!
  return <>
    <color attach="background" args={['#1f2528']}/>
    <group name="soundboard-room">
      <ambientLight intensity={0.48}/>
      <hemisphereLight args={['#d8ecf1', '#514942', 1.15]}/>
      <directionalLight position={[-3, 8, 2]} intensity={2.1} color="#fff0d7"/>
      <pointLight position={[0, soundboardBounds.height - 0.7, 0]} intensity={34} distance={Math.max(soundboardSize[0], soundboardSize[2]) * 1.6} decay={2} color="#e5f2ff"/>
      {soundboardWalls.map(wall => <WallSurface key={wall.id} wall={wall} plaster={plaster}/>)}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[soundboardSize[0] / 2, 0.12, soundboardSize[2] / 2]} position={[0, -0.12, 0]}/>
        <CuboidCollider args={[soundboardSize[0] / 2, 0.09, soundboardSize[2] / 2]} position={[0, soundboardBounds.height, 0]}/>
      </RigidBody>
      <Box position={[0, -0.12, 0]} size={[soundboardSize[0], 0.24, soundboardSize[2]]} color="#23201d" roughness={0.82}/>
      <CheckerMarbleFloor width={soundboardSize[0]} depth={soundboardSize[2]}/>
      <Box position={[0, soundboardBounds.height, 0]} size={[soundboardSize[0], 0.18, soundboardSize[2]]} color="#48545a" roughness={0.85}/>
      <SoundboardWall section="enabled" effects={enabledSoundEffects} position={enabledWall.center} rotationY={enabledWall.rotation}/>
      <SoundboardWall section="archived" effects={archivedSoundEffects} position={archivedWall.center} rotationY={archivedWall.rotation}/>
    </group>
  </>
}
