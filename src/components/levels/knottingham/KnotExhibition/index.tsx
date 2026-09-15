import {useThree} from '@react-three/fiber/webgpu'
import {CuboidCollider, useBeforePhysicsStep} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import constructors from 'virtual:knot-exhibition-materials'

import InteractiveObject from '#component/InteractiveObject'
import KnotLabels from '#component/levels/knottingham/KnotLabels'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {narrateModel} from '#src/lib/gallery/actions.ts'
import {knotExhibition, knotFloatHeight} from '#src/lib/knots/exhibition.ts'
import ProgressiveKnotMaterials from '#src/lib/knots/ProgressiveKnotMaterials.ts'
import KnotRotation from '#src/lib/physics/KnotRotation.ts'

export default function KnotExhibition() {
  const camera = useThree(state => state.camera)
  const renderer = useThree(state => state.renderer)
  const rotation = new KnotRotation
  useBeforePhysicsStep(world => {
    for (const exhibit of knotExhibition) {
      const body = propObjects.get(`prop-knot-${exhibit.id}`)?.body
      if (body) {
        rotation.step(body, world.timestep)
      }
    }
  })
  const materials = new ProgressiveKnotMaterials(renderer, camera, knotExhibition, constructors)
  useDisposable(materials)
  const {resources} = materials
  return <group name='lobby-knot-exhibition'>
    <KnotLabels />
    {knotExhibition.map((finish, index) => {
      const {geometry, colliderArgs, colliderPosition} = resources.items[index]
      return <GrabbableProp key={finish.id} id={`prop-knot-${finish.id}`} title={`${finish.label} · ${finish.title} · ${finish.modelTitle}`} colliders={false} type='fixed' rotation={[0, finish.rotation, 0]} position={[finish.position[0], knotFloatHeight, finish.position[2]]}>
        <CuboidCollider args={colliderArgs} position={colliderPosition} />
        <InteractiveObject id={`prop-knot-${finish.id}`} onActivate={() => narrateModel(`prop-knot-${finish.id}`)}>
          <mesh ref={materials.refs[index]} onBeforeRender={materials.observers[index]} material={materials.placeholder} name={`knot-${finish.id}`} raycast={resources.raycast} castShadow receiveShadow>
            <primitive object={geometry} attach='geometry' />
          </mesh>
        </InteractiveObject>
      </GrabbableProp>
    })}
  </group>
}
