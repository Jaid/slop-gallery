import {useEffect, useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {ChandelierGeometry} from '#src/lib/gallery/ChandelierGeometry.ts'

export default function Chandelier() {
  const brass = useMemo(() => new MeshStandardNodeMaterial({
    color: '#bd924c',
    metalness: 0.88,
    roughness: 0.2,
  }), [])
  const geometry = useMemo(() => new ChandelierGeometry, [])
  useEffect(() => () => {
    brass.dispose()
    geometry.dispose()
  }, [brass, geometry])
  return <group position={[0, 4.05, 0]}>
    <mesh name="chandelier-brass" geometry={geometry.brass} castShadow><primitive object={brass} attach="material"/></mesh>
    <mesh name="chandelier-candles" geometry={geometry.candles} castShadow><meshStandardNodeMaterial color="#e7c991" roughness={0.65}/></mesh>
    <mesh name="chandelier-flames" geometry={geometry.flames}><meshStandardNodeMaterial color="#fff0b6" emissive="#ffd36c" emissiveIntensity={4} toneMapped={false}/></mesh>
    <mesh name="chandelier-pendant" geometry={geometry.pendant}><primitive object={brass} attach="material"/></mesh>
    {/* Keep the shared light below the metalwork so the fixture cannot shadow its own source. */}
    <pointLight position={[0, -0.6, 0]} color="#ffd36c" intensity={110} distance={13} decay={2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={0.1} shadow-camera-far={13} shadow-normalBias={0.035}/>
  </group>
}
