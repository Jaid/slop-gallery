import {useThree} from '@react-three/fiber/webgpu'
import {CuboidCollider, useBeforePhysicsStep} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {knotExhibition, knotFloatHeight} from 'knot-materials/exhibition.ts'
import ProgressiveKnotMaterials from 'knot-materials/ProgressiveKnotMaterials.ts'
import useGraphicsQuality from 'use-graphics-quality'
import constructors from 'virtual:knot-exhibition-materials'

import InteractiveObject from '#component/InteractiveObject'
import KnotLabels from '#component/levels/knottingham/KnotLabels'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {narrateModel} from '#src/lib/gallery/actions.ts'
import KnotRotation from '#src/lib/physics/KnotRotation.ts'

export default function KnotExhibition() {
  const camera = useThree(state => state.camera)
  const renderer = useThree(state => state.renderer)
  const isQuality = useGraphicsQuality()
  const rotation = new KnotRotation
  useBeforePhysicsStep(world => {
    for (const exhibit of knotExhibition) {
      const body = propObjects.get(`prop-knot-${exhibit.id}`)?.body
      if (body) {
        rotation.step(body, world.timestep)
      }
    }
  })
  const materials = new ProgressiveKnotMaterials(renderer, camera, knotExhibition, constructors, isQuality)
  useDisposable(materials)
  const {resources} = materials
  return <group name='lobby-knot-exhibition'>
    <KnotLabels />
    {knotExhibition.map((finish, index) => {
      const {geometry, colliderArgs, colliderPosition} = resources.items[index]
      return <GrabbableProp key={finish.id} id={`prop-knot-${finish.id}`} colliders={false} position={[finish.position[0], knotFloatHeight, finish.position[2]]} rotation={[0, finish.rotation, 0]} title={`${finish.label} · ${finish.title} · ${finish.modelTitle}`} type='fixed'>
        <CuboidCollider args={colliderArgs} position={colliderPosition} />
        <InteractiveObject id={`prop-knot-${finish.id}`} onActivate={() => narrateModel(`prop-knot-${finish.id}`)}>
          <mesh castShadow material={materials.placeholderMaterials[index]} name={`knot-${finish.id}`} raycast={resources.raycast} receiveShadow ref={materials.refs[index]} onBeforeRender={materials.observers[index]}>
            <primitive attach='geometry' object={geometry} />
          </mesh>
        </InteractiveObject>
      </GrabbableProp>
    })}
  </group>
}
