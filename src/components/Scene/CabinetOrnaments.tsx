import type {InstancedMesh} from 'three/webgpu'

import {useEffect, useLayoutEffect, useMemo, useRef} from 'react'
import {Matrix4} from 'three/webgpu'

import GoldMaterial from '#component/GoldMaterial'
import {cabinetOrnaments} from '#src/lib/gallery/cabinetOrnaments.ts'
import {WallOrnamentGeometry} from '#src/lib/gallery/WallOrnamentGeometry.ts'

const placements = cabinetOrnaments.map(({position, rotation}) => (new Matrix4).makeRotationY(rotation).setPosition(...position))

export default function CabinetOrnaments() {
  const geometry = useMemo(() => new WallOrnamentGeometry, [])
  const foliage = useRef<InstancedMesh>(null)
  const brass = useRef<InstancedMesh>(null)
  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    for (const mesh of [foliage.current, brass.current]) {
      if (!mesh) {
        continue
      }
      for (const [i, matrix] of placements.entries()) {
        mesh.setMatrixAt(i, matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingBox()
      mesh.computeBoundingSphere()
    }
  }, [geometry])
  // Seven ornaments in two draw calls; relief stays behind hung frames.
  return <group name="cabinet-wall-ornaments">
    <instancedMesh ref={foliage} name="cabinet-carved-foliage" args={[geometry.foliage, undefined, placements.length]} receiveShadow>
      <meshStandardMaterial color="#9baa8b" roughness={0.68}/>
    </instancedMesh>
    <instancedMesh ref={brass} name="cabinet-gilded-scrollwork" args={[geometry.brass, undefined, placements.length]} receiveShadow>
      <GoldMaterial/>
    </instancedMesh>
  </group>
}
