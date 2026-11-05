import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {forgeGutter} from '#src/lib/gallery/forgeGutter.ts'
import GutterGeometry from '#src/lib/gallery/GutterGeometry.ts'

/** The brass gutter round the Forge and its vestibule on its iron brackets, which orbs dropping through the ceiling roll down into the vestibule, and the duct lined with `plaster` that carries it through the gap behind the north wall. */
export default function ForgeGutter({plaster}: {plaster: Material}) {
  const geometry = useDisposable(useMemo(() => new GutterGeometry(forgeGutter), []))
  const collision = useMemo(() => colliderGeometry(geometry.collision), [geometry])
  const brass = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#a88a56',
    metalness: 0.8,
    roughness: 0.38,
  }), []))
  // The rooflights’ painted cast iron.
  const iron = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#4c463c',
    metalness: 0.2,
    roughness: 0.7,
  }), []))
  return <RigidBody colliders={false} name='forge-gutter' type='fixed'>
    <MeshSurfaceCollider args={collision} />
    <mesh castShadow geometry={geometry.channel} material={brass} name='forge-gutter-channel' receiveShadow />
    <mesh castShadow geometry={geometry.brackets} material={iron} name='forge-gutter-brackets' receiveShadow />
    <mesh geometry={geometry.duct} material={plaster} name='forge-gutter-duct' receiveShadow />
  </RigidBody>
}
