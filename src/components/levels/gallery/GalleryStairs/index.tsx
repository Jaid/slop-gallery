import type {Vec3} from '#src/lib/gallery.ts'
import type {BufferAttribute} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {Box3, BoxGeometry, Euler, Matrix4, Vector3} from 'three/webgpu'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import Box from '#src/components/Scene/primitives.tsx'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {stairBlocks, stairFlights, stairRailGeometry, stairRoofs, stairTurn} from '#src/lib/gallery/staircase.ts'

/** One lamp over each flight, hanging over its 15th step, with its height above the tread and how it fades per flight. */
const stairLampStep = 14
const stairLamps: Record<string, {
  decay: number
  distance: number
  intensity: number
  y: number
}> = {
  upper: {
    decay: 1,
    distance: 10,
    intensity: 6,
    y: 1.68,
  },
  lower: {
    decay: 0.5,
    distance: 10,
    intensity: 24,
    y: 1.95,
  },
}
/**
 * Earth over the turn, the lower flight and the gap between the flights, which reach out from under the upper rooms into open
 * ground. Without it, the sun slips through the seams between their roofs and walls, and the shadow map leaves the stairway’s air
 * lit for sun shafts.
 */
const stairEarth = (() => {
  const roofs = [stairTurn.roofGeometry(), ...stairRoofs.map(({rotation, size, position}) => {
    const placement = new Matrix4
    placement.makeRotationFromEuler(new Euler(...rotation)).setPosition(...position)
    const roof = new BoxGeometry(...size)
    return roof.applyMatrix4(placement)
  })]
  const [turn, upper, lower] = roofs.map(roof => {
    const box = new Box3
    return box.setFromBufferAttribute(roof.getAttribute('position') as BufferAttribute)
  })
  for (const roof of roofs) {
    roof.dispose()
  }
  // Flat slabs at ground level cover the buried turn and lower flight, the latter reaching over to the upper flight’s side wall. They
  // reach 2 m past the walls, since a low sun slants in under a slab’s edge; toward the upper flight, they stop where its roof rises
  // out of the ground.
  const margin = new Vector3(2, 0, 2)
  const between = lower.clone().expandByVector(margin)
  between.min.set(upper.min.x, between.min.y, upper.max.z)
  const bend = turn.clone().expandByVector(margin)
  bend.min.x = turn.min.x - 0.6
  const slabs = [bend, between].map(box => ({
    position: [(box.min.x + box.max.x) / 2, 0.1, (box.min.z + box.max.z) / 2] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [box.max.x - box.min.x, 0.2, box.max.z - box.min.z] as Vec3,
  }))
  // The upper flight’s roof rises above ground level, so a wider copy of it lies on top instead.
  const {position, rotation, size} = stairRoofs[0]
  const slope = rotation[2]
  return [...slabs, {
    position: [position[0] - Math.sin(slope) * 0.19, position[1] + Math.cos(slope) * 0.19, position[2]] as Vec3,
    rotation,
    size: [size[0], 0.2, size[2] + 1.2] as Vec3,
  }]
})()

export default function GalleryStairs() {
  const turnResource = useDisposable(useMemo(() => {
    const parts = [
      {
        name: 'landing',
        geometry: stairTurn.floorGeometry(),
        color: '#26383e',
        roughness: 0.9,
      },
      {
        name: 'ceiling',
        geometry: stairTurn.roofGeometry(),
        color: '#101e24',
        roughness: 0.9,
      },
      ...(['inner', 'outer'] as const).map(side => ({
        name: `handrail-${side}`,
        geometry: stairRailGeometry(side),
        color: '#ac8c58',
        roughness: 0.45,
      })),
    ].map(part => ({
      ...part,
      collision: colliderGeometry(part.geometry),
    }))
    return {
      parts,
      dispose() {
        for (const part of parts) {
          part.geometry.dispose()
        }
      },
    }
  }, []))
  const {parts: turn} = turnResource
  return <group name='moonfall-stairway'>
    <RigidBody colliders={false} type='fixed'>
      {stairBlocks.map(({position, size}, i) => <group key={i}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={position} />
        <Box color='#26383e' envMapIntensity={0} name={`stair-block-${i}`} position={position} roughness={0.9} size={size} />
      </group>)}
    </RigidBody>
    <RigidBody colliders={false} type='fixed'>
      {turn.map(part => <group key={part.name}>
        <MeshSurfaceCollider args={part.collision} />
        <mesh castShadow geometry={part.geometry} name={`stairway-round-${part.name}`} receiveShadow>
          <meshStandardNodeMaterial color={part.color} envMapIntensity={part.name.startsWith('handrail') ? 1 : 0} metalness={part.name.startsWith('handrail') ? 0.65 : 0} roughness={part.roughness} />
        </mesh>
      </group>)}
    </RigidBody>
    {stairBlocks.filter(block => block.tread).map(({position, size, top, direction}, i) => <mesh key={i} position={[position[0] - direction * (size[0] / 2 - 0.035), top + 0.004, position[2]]}>
      <boxGeometry args={[0.025, 0.008, size[2] - 0.45]} />
      <meshBasicNodeMaterial color={i % 3 === 0 ? '#d5ad73' : '#62958e'} toneMapped={false} />
    </mesh>)}
    <RigidBody colliders='cuboid' type='fixed'>
      {stairRoofs.map((beam, i) => <Box key={i} name='stairway-ceiling' {...beam} color='#101e24' envMapIntensity={0} />)}
    </RigidBody>
    {stairEarth.map(({position, rotation, size}, i) => <Box key={i} color='#101e24' envMapIntensity={0} name='stairway-earth' position={position} rotation={rotation} size={size} />)}
    {stairFlights.map(flight => {
      const step = flight.blocks[stairLampStep]
      const {decay, distance, intensity, y} = stairLamps[flight.id]
      return <pointLight key={flight.id} color='#8ad6cd' decay={decay} distance={distance} intensity={intensity} position={[step.position[0], step.top + y, step.position[2]]} />
    })}
  </group>
}
