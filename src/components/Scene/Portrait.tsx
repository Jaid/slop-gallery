import type {Portrait as PortraitData, Quat, Vec3} from '#src/lib/gallery.ts'
import type {RapierRigidBody} from '@react-three/rapier'
import type {Group, InstancedMesh, MeshBasicMaterial} from 'three/webgpu'

import {useFrame} from '@react-three/fiber/webgpu'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo, useRef} from 'react'
import {Object3D, Quaternion, Vector3} from 'three/webgpu'

import PortraitLabel from '#component/PortraitLabel'
import DynamicImageMaterial from '#component/DynamicImageMaterial'
import {chime, requestMerge, roomAt, useGallery} from '#src/lib/gallery.ts'

export const portraitObjects = new Map<string, {body: RapierRigidBody
  group: Group}>
const normal = new Vector3
const look = new Vector3
const worldPosition = new Vector3

export default function Portrait({portrait: p}: {portrait: PortraitData}) {
  const body = useRef<RapierRigidBody>(null)
  const group = useRef<Group>(null)
  const magic = useRef<InstancedMesh>(null)
  const alternate = useRef<MeshBasicMaterial>(null)
  const held = useGallery(s => s.held === p.id)
  const frame = useGallery(s => s.frame)
  const secretOpen = useGallery(s => s.secretOpen)
  const dummy = useMemo(() => new Object3D, [])
  const clock = useRef(0)
  const lastImpact = useRef(0)
  const w = p.width
  const h = p.height
  const frameColor = frame === 'gold' ? '#a5804b' : frame === 'oak' ? '#6a4630' : '#292c29'
  const visible = roomAt(p.position) !== 'secret' || secretOpen
  useEffect(() => {
    if (body.current && group.current) {
      portraitObjects.set(p.id, {
        body: body.current,
        group: group.current,
      })
    }
    return () => {
      portraitObjects.delete(p.id)
    }
  }, [p.id])
  useEffect(() => {
    body.current?.setEnabled(!held && !p.reserved)
  }, [held, p.reserved])
  useEffect(() => {
    if (!body.current) {
      return
    }
    body.current.setTranslation({
      x: p.position[0],
      y: p.position[1],
      z: p.position[2],
    }, false)
    const q = p.orientation ? new Quaternion(...p.orientation) : (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), p.rotation)
    body.current.setRotation(q, false)
  }, [p.position, p.rotation, p.orientation])
  useEffect(() => {
    if (!p.hung && p.velocity && body.current) {
      body.current.setLinvel({
        x: p.velocity[0],
        y: p.velocity[1],
        z: p.velocity[2],
      }, true)
      body.current.setAngvel({
        x: 2.2,
        y: 0.7,
        z: 2.8,
      }, true)
    }
  }, [p.hung, p.velocity])
  useFrame(({camera}, dt) => {
    if (useGallery.getState().motion) {
      clock.current += Math.min(dt, 0.06)
    }
    if (p.merging && magic.current) {
      for (let i = 0; i < 64; i++) {
        const a = i * Math.PI / 32 + clock.current * 1.9
        const pulse = 1 + Math.sin(a * 3 + clock.current) * 0.045
        dummy.position.set(Math.cos(a) * (w / 2 + 0.35) * pulse, Math.sin(a) * (h / 2 + 0.35) * pulse, 0.25 + Math.sin(a * 2 + clock.current) * 0.3)
        dummy.rotation.set(a, a * 2, a)
        dummy.scale.setScalar(0.028 + i % 3 * 0.011)
        dummy.updateMatrix()
        magic.current.setMatrixAt(i, dummy.matrix)
      }
      magic.current.instanceMatrix.needsUpdate = true
    }
    if (alternate.current && group.current) {
      group.current.getWorldPosition(worldPosition)
      normal.set(0, 0, 1).applyQuaternion(group.current.getWorldQuaternion(new Quaternion))
      look.copy(camera.position).sub(worldPosition).normalize()
      const edge = Math.max(0, Math.min(1, (1 - normal.dot(look) - 0.045) / 0.24))
      const opacity = edge * edge * (3 - 2 * edge)
      alternate.current.opacity += (opacity - alternate.current.opacity) * (1 - Math.exp(-dt * 10))
    }
    if (body.current && !p.hung && body.current.translation().y < -4) {
      body.current.setTranslation({
        x: 0,
        y: 1,
        z: 4,
      }, true)
      body.current.setLinvel({
        x: 0,
        y: 0,
        z: 0,
      }, true)
    }
  })
  return <RigidBody ref={body} type={p.hung ? 'fixed' : 'dynamic'} position={p.position} rotation={[0, p.rotation, 0]} colliders={false} ccd restitution={0.32} friction={0.75} linearDamping={0.22} angularDamping={0.7} userData={{portraitId: p.id}}
    onSleep={() => {
      if (!body.current || p.hung || held || p.reserved) {
        return
      }
      const pos = body.current.translation()
      const q = body.current.rotation()
      useGallery.getState().update(p.id, {
        position: [pos.x, pos.y, pos.z] as Vec3,
        orientation: [q.x, q.y, q.z, q.w] as Quat,
        velocity: undefined,
      })
    }}
    onCollisionEnter={event => {
      if (p.hung || p.reserved || held) {
        return
      }
      const now = performance.now()
      if (now - lastImpact.current > 200) {
        chime(160)
        lastImpact.current = now
      }
      const other: unknown = event.other.rigidBodyObject?.userData.portraitId
      const target = useGallery.getState().portraits.find(a => a.id === other)
      if (target?.hung) {
        requestMerge(target.id, p.id)
      }
    }}>
    <CuboidCollider args={[(w + 0.18) / 2, (h + 0.18) / 2, 0.085]} mass={2}/>
    <group ref={group} userData={{portraitId: p.id}} visible={visible && !p.reserved}>
      <mesh castShadow receiveShadow><boxGeometry args={[w + 0.18, h + 0.18, 0.16]}/><meshStandardMaterial color={frameColor} roughness={0.32} metalness={frame === 'gold' ? 0.75 : 0.15} transparent opacity={held ? 0.3 : 1}/></mesh>
      <mesh position={[0, 0, 0.087]}><planeGeometry args={[w + 0.045, h + 0.045]}/><meshStandardMaterial color="#29261d"/></mesh>
      <mesh position={[0, 0, 0.096]}><planeGeometry args={[w, h]}/><DynamicImageMaterial source={p.source} toneMapped={false} transparent opacity={held ? 0.3 : 1}/></mesh>
      {p.alternateSource && <mesh position={[0, 0, 0.099]}><planeGeometry args={[w, h]}/><DynamicImageMaterial ref={alternate} source={p.alternateSource} toneMapped={false} transparent opacity={0} depthWrite={false}/></mesh>}
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * (w / 2 + 0.055), 0, 0.1]}><boxGeometry args={[0.022, h + 0.14, 0.026]}/><meshStandardMaterial color={frame === 'gold' ? '#ddbc7c' : frameColor} metalness={0.6} roughness={0.3}/></mesh>
        <mesh position={[0, side * (h / 2 + 0.055), 0.1]}><boxGeometry args={[w + 0.14, 0.022, 0.026]}/><meshStandardMaterial color={frame === 'gold' ? '#ddbc7c' : frameColor} metalness={0.6} roughness={0.3}/></mesh>
      </group>)}
      {p.hung && <PortraitLabel width={w} height={h} title={p.title} creator={p.creator} pending={p.pending}/>}
      <instancedMesh ref={magic} args={[undefined, undefined, 64]} visible={!!p.merging} frustumCulled={false}><octahedronGeometry args={[1]}/><meshBasicMaterial color="#efcf84" toneMapped={false}/></instancedMesh>
    </group>
  </RigidBody>
}
