import type {InstancedMesh} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {Euler, Matrix4, Quaternion, Vector3} from 'three/webgpu'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import FeastChairGeometry from '#src/lib/gallery/dineTable/FeastChairGeometry.ts'
import FeastServiceGeometry from '#src/lib/gallery/dineTable/FeastServiceGeometry.ts'
import FeastTableGeometry from '#src/lib/gallery/dineTable/FeastTableGeometry.ts'
import dineTable, {banquetChairs} from '#src/lib/gallery/dineTable/layout.ts'
import FeastMaterials from '#src/lib/materials/FeastMaterials.ts'
import metal from '#src/lib/materials/metal.ts'

const chairMatrices = banquetChairs.map(({position, yaw}) => {
  const orientation = new Quaternion
  const matrix = new Matrix4
  return matrix.compose(new Vector3(...position), orientation.setFromEuler(new Euler(0, yaw, 0)), new Vector3(1, 1, 1))
})
const placeChairs = (mesh: InstancedMesh | null) => {
  if (mesh) {
    for (const [index, matrix] of chairMatrices.entries()) {
      mesh.setMatrixAt(index, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
  }
}

/** Dine’s fixed feast table and laid service; all chairs share geometry and render in three instanced draws. */
export default function DineTable() {
  const table = useDisposable(useMemo(() => new FeastTableGeometry, []))
  const chair = useDisposable(useMemo(() => new FeastChairGeometry, []))
  const service = useDisposable(useMemo(() => new FeastServiceGeometry, []))
  const materials = useDisposable(useMemo(() => new FeastMaterials, []))
  // Weld only positions for physics. The real undercarriage and chair openings stay open, rather than using solid furniture boxes.
  const collision = useMemo(() => ({
    table: colliderGeometry(table.wood),
    chair: [colliderGeometry(chair.wood), colliderGeometry(chair.fabric)],
    service: [colliderGeometry(service.porcelain), colliderGeometry(service.brass)],
  }), [table, chair, service])
  return <group name='dine-banquet' position={dineTable.position}>
    <RigidBody colliders={false} name='dine-banquet-collision' type='fixed'>
      <MeshSurfaceCollider args={collision.table} friction={0.7} />
      {collision.service.map((args, index) => <MeshSurfaceCollider key={index} args={args} />)}
      {banquetChairs.map(({id, position, yaw}) => <group key={id} position={position} rotation={[0, yaw, 0]}>
        {collision.chair.map((args, index) => <MeshSurfaceCollider key={index} args={args} friction={0.7} />)}
      </group>)}
    </RigidBody>
    <mesh castShadow geometry={table.wood} material={materials.wood} name='dine-table-walnut' receiveShadow />
    <mesh castShadow geometry={table.brass} material={materials.brass} name='dine-table-stringing' receiveShadow />
    <instancedMesh args={[chair.wood, materials.wood, banquetChairs.length]} castShadow name='dine-chair-walnut' receiveShadow ref={placeChairs} />
    <instancedMesh args={[chair.fabric, materials.velvet, banquetChairs.length]} castShadow name='dine-chair-velvet' receiveShadow ref={placeChairs} />
    <instancedMesh args={[chair.brass, materials.brass, banquetChairs.length]} castShadow name='dine-chair-nailheads' receiveShadow ref={placeChairs} />
    <mesh castShadow geometry={service.linen} material={materials.linen} name='dine-table-runner' receiveShadow />
    <mesh castShadow geometry={service.porcelain} material={materials.porcelain} name='dine-table-porcelain' receiveShadow />
    <mesh castShadow geometry={service.brass} material={materials.brass} name='dine-table-gilt-service' receiveShadow />
    <mesh castShadow geometry={service.silver} material={metal} name='dine-table-cutlery' receiveShadow />
    <mesh castShadow geometry={service.napkins} material={materials.velvet} name='dine-table-napkins' receiveShadow />
    <mesh castShadow geometry={service.wax} material={materials.wax} name='dine-table-tapers' receiveShadow />
    <mesh geometry={service.flames} material={materials.flame} name='dine-table-candlelight' />
  </group>
}
