import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {lobbyChandeliers, lobbyChandelierHeight} from '#src/lib/gallery/lobbyCeiling.ts'
import LobbyCeilingGeometry from '#src/lib/gallery/LobbyCeilingGeometry.ts'
import VaultChandelierGeometry from '#src/lib/gallery/VaultChandelierGeometry.ts'
import VaultGlassMaterial from '#src/lib/materials/VaultGlassMaterial.ts'

/**
 * The Lobby’s barrel vault: plaster shell and ribs, bronze glazing bars, clear glass onto a procedural sky and three brass
 * chandeliers. Rendered inside the room’s group, at its center.
 */
export default function LobbyCeiling() {
  const geometry = useDisposable(useMemo(() => new LobbyCeilingGeometry, []))
  const chandeliers = useDisposable(useMemo(() => new VaultChandelierGeometry, []))
  const plaster = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#f4efe2',
    roughness: 0.86,
  }), []))
  const brass = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#c6964e',
    metalness: 0.82,
    roughness: 0.28,
  }), []))
  const bronze = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#6e5a40',
    metalness: 0.55,
    roughness: 0.42,
  }), []))
  const glass = useDisposable(useMemo(() => new VaultGlassMaterial, []))
  const candles = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#f3e2c0',
    roughness: 0.7,
  }), []))
  const flames = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#fff1c4',
    emissive: '#ffd27a',
    emissiveIntensity: 3.2,
    toneMapped: false,
  }), []))
  const hubY = lobbyChandelierHeight()
  return <group name='lobby-ceiling'>
    <mesh castShadow={false} geometry={geometry.plaster} material={plaster} name='lobby-vault-plaster' receiveShadow={false} />
    <mesh castShadow={false} geometry={geometry.bars} material={bronze} name='lobby-vault-bars' />
    <mesh geometry={geometry.glass} material={glass} name='lobby-vault-glass' />
    {lobbyChandeliers.zs.map((z, index) => <group key={z} name={`lobby-chandelier-${index}`} position={[0, hubY, z]}>
      <mesh castShadow geometry={chandeliers.brass} material={brass} name='lobby-chandelier-brass' />
      <mesh castShadow geometry={chandeliers.candles} material={candles} name='lobby-chandelier-candles' />
      <mesh geometry={chandeliers.flames} material={flames} name='lobby-chandelier-flames' />
      <pointLight
        castShadow={index === lobbyChandeliers.shadowIndex} color={lobbyChandeliers.color} decay={2} distance={lobbyChandeliers.distance} intensity={lobbyChandeliers.candleIntensity * 16} position={[0, -0.4, 0]} shadow-mapSize={[1024, 1024]} shadow-normalBias={0.04} shadow-camera-near={0.4}
      />
    </group>)}
  </group>
}
