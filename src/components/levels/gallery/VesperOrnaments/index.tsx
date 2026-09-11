import type {InstancedMesh} from 'three/webgpu'

import {useEffect, useLayoutEffect, useMemo, useRef} from 'react'
import {Matrix4} from 'three/webgpu'

import GoldMaterial from '#component/levels/gallery/GoldMaterial'
import vesperOrnaments from '#src/lib/gallery/vesperOrnaments.ts'
import WallOrnamentGeometry from '#src/lib/gallery/WallOrnamentGeometry.ts'

const placements = vesperOrnaments.map(({position, rotation}) => (new Matrix4).makeRotationY(rotation).setPosition(...position))

export default function VesperOrnaments() {
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
  return <group name="vesper-wall-ornaments">
    <instancedMesh ref={foliage} name="vesper-carved-foliage" args={[geometry.foliage, undefined, placements.length]} receiveShadow>
      <meshStandardNodeMaterial color="#9baa8b" roughness={0.68}/>
    </instancedMesh>
    <instancedMesh ref={brass} name="vesper-gilded-scrollwork" args={[geometry.brass, undefined, placements.length]} receiveShadow>
      <GoldMaterial/>
    </instancedMesh>
  </group>
}
