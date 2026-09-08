import type {InstancedMesh} from 'three/webgpu'

import {useFrame} from '@react-three/fiber/webgpu'
import {CylinderCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo, useRef} from 'react'
import {Object3D, QuadraticBezierCurve3, RepeatWrapping, Vector3} from 'three/webgpu'

import CanvasText from '#component/CanvasText'
import {SoundEngine} from '#src/lib/audio/SoundEngine.ts'
import {cameraPose, useGallery} from '#src/lib/gallery.ts'
import {canvasTexture} from '#src/lib/texture.ts'

export default function Fountain() {
  const particles = useRef<InstancedMesh>(null)
  const time = useRef(0)
  const jets = useMemo(() => Array.from({length: 10}, (_, i) => {
    const angle = i * Math.PI / 5
    return new QuadraticBezierCurve3(new Vector3(Math.cos(angle) * 0.12, 1.36, Math.sin(angle) * 0.12), new Vector3(Math.cos(angle) * 0.7, 1.98, Math.sin(angle) * 0.7), new Vector3(Math.cos(angle) * 1.04, 0.46, Math.sin(angle) * 1.04))
  }), [])
  const dummy = useMemo(() => new Object3D, [])
  const normal = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const context = c.getContext('2d')!
    const data = context.createImageData(256, 256)
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4
        data.data[i] = 128 + Math.sin(x * Math.PI / 16 + Math.sin(y * Math.PI / 32)) * 35
        data.data[i + 1] = 128 + Math.cos(y * Math.PI / 16 + Math.sin(x * Math.PI / 32)) * 35
        data.data[i + 2] = 245
        data.data[i + 3] = 255
      }
    }
    context.putImageData(data, 0, 0)
    const texture = canvasTexture(c, false)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(3, 3)
    return texture
  }, [])
  useEffect(() => () => normal.dispose(), [normal])
  useFrame((_, dt) => {
    const s = useGallery.getState()
    time.current += s.motion ? Math.min(dt, 0.05) : 0
    normal.offset.set(time.current * 0.017, time.current * 0.011)
    if (particles.current) {
      for (let i = 0; i < 100; i++) {
        const phase = (time.current * 0.8 + Math.floor(i / 10) / 10) % 1
        jets[i % 10]!.getPoint(phase, dummy.position)
        const size = 0.008 + phase * 0.004
        dummy.scale.set(size, size * 1.5, size)
        dummy.updateMatrix()
        particles.current.setMatrixAt(i, dummy.matrix)
      }
      particles.current.instanceMatrix.needsUpdate = true
    }
    const sound = SoundEngine.existing()
    if (sound && s.sound) {
      const dx = -3.3 - cameraPose.position[0]
      const dz = 0 - cameraPose.position[2]
      const pan = (dx * -cameraPose.direction[2] + dz * cameraPose.direction[0]) / 7
      sound.fountain(Math.hypot(dx, dz), pan)
    }
  })
  return <group position={[-3.3, 0, 0]}>
    <RigidBody type="fixed" colliders={false}>
      <CylinderCollider args={[0.3, 1.35]} position={[0, 0.3, 0]}/>
      <mesh receiveShadow castShadow position={[0, 0.18, 0]}><cylinderGeometry args={[1.35, 1.45, 0.36, 96]}/><meshStandardMaterial color="#c9bea4" roughness={0.5}/></mesh>
      <mesh receiveShadow castShadow position={[0, 0.47, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.22, 0.11, 16, 96]}/><meshStandardMaterial color="#d6c9ad" roughness={0.32}/></mesh>
      <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.2, 96]}/><meshPhysicalMaterial color="#528f87" roughness={0.16} metalness={0.35} clearcoat={1} normalMap={normal} normalScale={[0.45, 0.45]} envMapIntensity={1.8}/></mesh>
      <mesh castShadow position={[0, 0.85, 0]}><cylinderGeometry args={[0.17, 0.24, 0.95, 48]}/><meshStandardMaterial color="#b49760" metalness={0.72} roughness={0.3}/></mesh>
      <mesh position={[0, 1.33, 0]}><sphereGeometry args={[0.2, 48, 32]}/><meshStandardMaterial color="#c1a467" metalness={0.85} roughness={0.2}/></mesh>
    </RigidBody>
    {jets.map((jet, i) => <mesh key={i}><tubeGeometry args={[jet, 32, 0.007, 5, false]}/><meshPhysicalMaterial color="#c7ece7" roughness={0.12} metalness={0.15} transparent opacity={0.42} depthWrite={false}/></mesh>)}
    <instancedMesh ref={particles} args={[undefined, undefined, 100]} frustumCulled={false}><sphereGeometry args={[1, 6, 6]}/><meshPhysicalMaterial color="#b4dfdc" roughness={0.1} metalness={0.2} transparent opacity={0.55} depthWrite={false}/></instancedMesh>
    <CanvasText position={[0, 0.2, 1.455]} text="A SMALL STREAM OF CONSCIOUSNESS" width={1.3} height={0.11} color="#5a5848"/>
  </group>
}
