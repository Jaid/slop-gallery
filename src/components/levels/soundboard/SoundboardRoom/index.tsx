import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'

import SoundboardWall from '#component/levels/soundboard/SoundboardWall'
import CheckerMarbleFloor from '#src/components/Scene/CheckerMarbleFloor.tsx'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import Box from '#src/components/Scene/primitives.tsx'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {soundboardBounds, soundboardSize, soundboardWalls} from '#src/lib/audio/soundboard.ts'
import {archivedSoundEffects, enabledSoundEffects} from '#src/lib/audio/soundEffects.ts'

export default function SoundboardRoom() {
  const plaster = surfaceTexture('plaster')
  useDisposable(plaster)
  const enabledWall = soundboardWalls.find(wall => wall.id === 'soundboard-enabled')!
  const archivedWall = soundboardWalls.find(wall => wall.id === 'soundboard-archived')!
  return <>
    <color args={['#1f2528']} attach='background' />
    <group name='soundboard-room'>
      <ambientLight intensity={0.48} />
      <hemisphereLight args={['#d8ecf1', '#514942', 1.15]} />
      <directionalLight color='#fff0d7' intensity={2.1} position={[-3, 8, 2]} />
      <pointLight color='#e5f2ff' decay={2} distance={Math.max(soundboardSize[0], soundboardSize[2]) * 1.6} intensity={34} position={[0, soundboardBounds.height - 0.7, 0]} />
      {soundboardWalls.map(wall => <WallSurface key={wall.id} plaster={plaster} wall={wall} />)}
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[soundboardSize[0] / 2, 0.12, soundboardSize[2] / 2]} position={[0, -0.12, 0]} />
        <CuboidCollider args={[soundboardSize[0] / 2, 0.09, soundboardSize[2] / 2]} position={[0, soundboardBounds.height, 0]} />
      </RigidBody>
      <Box color='#23201d' position={[0, -0.12, 0]} roughness={0.82} size={[soundboardSize[0], 0.24, soundboardSize[2]]} />
      <CheckerMarbleFloor depth={soundboardSize[2]} width={soundboardSize[0]} />
      <Box color='#48545a' position={[0, soundboardBounds.height, 0]} roughness={0.85} size={[soundboardSize[0], 0.18, soundboardSize[2]]} />
      <SoundboardWall effects={enabledSoundEffects} position={enabledWall.center} rotationY={enabledWall.rotation} section='enabled' />
      <SoundboardWall effects={archivedSoundEffects} position={archivedWall.center} rotationY={archivedWall.rotation} section='archived' />
    </group>
  </>
}
