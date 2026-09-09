import type {Group} from 'three/webgpu'

import {useFrame} from '@react-three/fiber/webgpu'
import {useRef} from 'react'

export default function UndertoneOrbit() {
  const orbit = useRef<Group>(null)
  useFrame((_, delta) => {
    if (orbit.current) {
      orbit.current.rotation.y += Math.min(delta, 0.05) * 0.12
    }
  })
  return <group name="undertone-orbital-sculpture" position={[0, 2.5, 0]}>
    <mesh castShadow><icosahedronGeometry args={[0.7, 2]}/><meshStandardNodeMaterial color="#11252c" metalness={0.8} roughness={0.3} envMapIntensity={0.35}/></mesh>
    <group ref={orbit}>
      {[0, 1, 2].map(i => <group key={i} rotation={[0.65 + i * 0.7, i * Math.PI / 3, i * 0.35]}>
        <mesh><torusGeometry args={[1.25 + i * 0.26, 0.018, 8, 128]}/><meshStandardNodeMaterial color={i === 1 ? '#d5ad73' : '#8ad6cd'} emissive={i === 1 ? '#d5ad73' : '#62b6b1'} emissiveIntensity={2.2} roughness={0.4}/></mesh>
        <mesh position={[1.25 + i * 0.26, 0, 0]}><sphereGeometry args={[0.065, 16, 12]}/><meshBasicNodeMaterial color="#e4e7d5" toneMapped={false}/></mesh>
      </group>)}
    </group>
  </group>
}
