import type {Mesh} from 'three/webgpu'

import {useFrame, useThree} from '@react-three/fiber'
import useDisposable from 'disposable-lifetime/react'
import {useLayoutEffect, useMemo, useRef} from 'react'

import DaylightSkyMaterial from '#src/lib/materials/DaylightSkyMaterial.ts'

/** A camera-centered dome also appears through actual glazing and in the floor’s reflection camera. Too large to be assigned to a culled room. */
export default function DaylightSky() {
  const material = useDisposable(useMemo(() => new DaylightSkyMaterial, []))
  const mesh = useRef<Mesh>(null)
  const scene = useThree(state => state.scene)
  useLayoutEffect(() => {
    const previous = scene.background
    // eslint-disable-next-line react-hooks/immutability -- The sky replaces the old flat background, restored on unmount.
    scene.background = null
    return () => {
      scene.background = previous
    }
  }, [scene])
  useFrame(({camera}) => mesh.current?.position.copy(camera.position))
  return <mesh frustumCulled={false} material={material} name='procedural-daylight-sky' renderOrder={-1000} ref={mesh}>
    <sphereGeometry args={[180, 64, 32]} />
  </mesh>
}
