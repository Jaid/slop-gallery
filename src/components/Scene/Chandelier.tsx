import {useEffect, useMemo} from 'react'
import {MeshStandardNodeMaterial, QuadraticBezierCurve3, Vector3} from 'three/webgpu'

export default function Chandelier() {
  const brass = useMemo(() => new MeshStandardNodeMaterial({color: '#bd924c', metalness: 0.88, roughness: 0.2}), [])
  const arm = useMemo(() => new QuadraticBezierCurve3(new Vector3(0.18, 0, 0), new Vector3(0.8, -0.5, 0), new Vector3(1.25, 0.15, 0)), [])
  useEffect(() => () => brass.dispose(), [brass])
  return <group position={[0, 4.05, 0]}>
    <mesh castShadow position={[0, 0.85, 0]}><cylinderGeometry args={[0.022, 0.022, 1.5, 16]}/><primitive object={brass} attach="material"/></mesh>
    <mesh castShadow position={[0, 1.57, 0]}><cylinderGeometry args={[0.3, 0.22, 0.12, 48]}/><primitive object={brass} attach="material"/></mesh>
    <mesh castShadow scale={[1, 1.5, 1]}><sphereGeometry args={[0.19, 32, 24]}/><primitive object={brass} attach="material"/></mesh>
    <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}><torusGeometry args={[0.66, 0.032, 12, 96]}/><primitive object={brass} attach="material"/></mesh>
    {Array.from({length: 8}, (_, i) => <group key={i} rotation={[0, i * Math.PI / 4, 0]}>
      <mesh castShadow><tubeGeometry args={[arm, 32, 0.027, 10, false]}/><primitive object={brass} attach="material"/></mesh>
      <mesh castShadow position={[1.25, 0.17, 0]}><cylinderGeometry args={[0.14, 0.07, 0.08, 32]}/><primitive object={brass} attach="material"/></mesh>
      <mesh castShadow position={[1.25, 0.32, 0]}><cylinderGeometry args={[0.045, 0.055, 0.24, 24]}/><meshStandardNodeMaterial color="#e7c991" roughness={0.65}/></mesh>
      <mesh position={[1.25, 0.51, 0]} scale={[0.8, 1.5, 0.8]}><sphereGeometry args={[0.07, 24, 16]}/><meshStandardNodeMaterial color="#fff0b6" emissive="#ffd36c" emissiveIntensity={4} toneMapped={false}/></mesh>
    </group>)}
    <mesh position={[0, -0.38, 0]} scale={[1, 1.4, 1]}><sphereGeometry args={[0.09, 24, 16]}/><primitive object={brass} attach="material"/></mesh>
    {/* Keep the shared light below the metalwork so the fixture cannot shadow its own source. */}
    <pointLight position={[0, -0.6, 0]} color="#ffd36c" intensity={110} distance={13} decay={2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={0.1} shadow-camera-far={13} shadow-normalBias={0.035}/>
  </group>
}
