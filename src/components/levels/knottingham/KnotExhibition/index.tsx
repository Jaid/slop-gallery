import {CuboidCollider, useBeforePhysicsStep} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import constructors from 'virtual:knot-exhibition-materials'

import KnotLabels from '#component/levels/knottingham/KnotLabels'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {knotExhibition, knotFloatHeight} from '#src/lib/knots/exhibition.ts'
import {KnotResources} from '#src/lib/knots/KnotResources.ts'
import {KnotRotation} from '#src/lib/physics/KnotRotation.ts'

export default function KnotExhibition() {
  const rotation = useMemo(() => new KnotRotation, [])
  useBeforePhysicsStep(world => {
    for (const exhibit of knotExhibition) {
      const body = propObjects.get(`prop-knot-${exhibit.id}`)?.body
      if (body) {
        rotation.step(body, world.timestep)
      }
    }
  })
  const resources = useMemo(() => new KnotResources(knotExhibition, constructors), [])
  useEffect(() => () => resources.dispose(), [resources])
  return <group name="lobby-knot-exhibition">
    <KnotLabels/>
    {knotExhibition.map((finish, index) => {
      const {geometry, material, colliderArgs, colliderPosition} = resources.items[index]
      return <GrabbableProp key={finish.id} id={`prop-knot-${finish.id}`} title={`${finish.label} · ${finish.title} · ${finish.modelTitle}`} colliders={false} type="fixed" rotation={[0, finish.rotation, 0]} position={[finish.position[0], knotFloatHeight, finish.position[2]]}>
        <CuboidCollider args={colliderArgs} position={colliderPosition}/>
        <mesh name={`knot-${finish.id}`} castShadow receiveShadow>
          <primitive object={geometry} attach="geometry"/>
          <primitive object={material} attach="material"/>
        </mesh>
      </GrabbableProp>
    })}
  </group>
}
