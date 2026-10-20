import {CuboidCollider, CylinderCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {DoubleSide, MeshBasicNodeMaterial} from 'three/webgpu'

import Box from '#src/components/Scene/primitives.tsx'
import dineTable, {dineTableApron, dineTableStretchers} from '#src/lib/gallery/dineTable.ts'
import DineTableGeometry, {candleGeometry, candlestickGeometry, flameGeometry} from '#src/lib/gallery/DineTableGeometry.ts'
import {FeastInlayMaterial, FeastRunnerMaterial, FeastWoodMaterial} from '#src/lib/materials/FeastTableMaterials.ts'
import gold from '#src/lib/materials/gold.ts'

const {apronDrop, candlestickOffsets, candleHeight, candlestickHeight, flameHeight, footBar, footHalfWidth, footHeight, length, position, postRadius, stretcherRadius, stretcherY, top, topThickness, trestleOffset, trestleThickness, width} = dineTable

/** Dine’s feast table: a long oiled-walnut trestle with a gilt edge, a damask runner and a row of candles. */
export default function DineTable() {
  const geometry = useDisposable(useMemo(() => new DineTableGeometry, []))
  const candlesticks = useDisposable(useMemo(candlestickGeometry, []))
  const candles = useDisposable(useMemo(candleGeometry, []))
  const flames = useDisposable(useMemo(flameGeometry, []))
  const wood = useDisposable(useMemo(() => new FeastWoodMaterial, []))
  const inlay = useDisposable(useMemo(() => new FeastInlayMaterial, []))
  const runner = useDisposable(useMemo(() => new FeastRunnerMaterial, []))
  const flame = useDisposable(useMemo(() => new MeshBasicNodeMaterial({
    color: '#ffb15a',
    toneMapped: false,
    transparent: true,
    opacity: 0.92,
    side: DoubleSide,
    depthWrite: false,
  }), []))
  const [x, , z] = position
  return <group name='dine-table' position={[x, 0, z]}>
    <RigidBody colliders={false} name='dine-table-body' type='fixed'>
      <CuboidCollider args={[width / 2, topThickness / 2, length / 2]} friction={0.6} position={[0, top - topThickness / 2, 0]} />
      <CuboidCollider args={[dineTableApron.x[1], apronDrop / 2, dineTableApron.z[1]]} position={[0, top - topThickness - apronDrop / 2, 0]} />
      {([-1, 1] as const).map(end => <group key={end}>
        <CuboidCollider args={[footHalfWidth + footBar, footHeight / 2, trestleThickness / 2]} position={[0, footHeight / 2, end * trestleOffset]} />
        {([-1, 1] as const).map(side => <CylinderCollider key={side} args={[(top - topThickness - footHeight) / 2, postRadius * 1.45]} position={[side * (footHalfWidth - 0.09), (top - topThickness + footHeight) / 2, end * trestleOffset]} />)}
      </group>)}
      {dineTableStretchers.map(offset => <CylinderCollider key={offset} args={[stretcherRadius * 1.35, dineTable.trestleSpan / 2]} position={[offset, stretcherY, 0]} rotation={[Math.PI / 2, 0, 0]} />)}
    </RigidBody>
    <mesh castShadow geometry={geometry.wood} material={wood} name='dine-table-walnut' receiveShadow />
    <mesh geometry={geometry.wood} material={inlay} name='dine-table-inlay' />
    <Runner material={runner} />
    {candlestickOffsets.map(offset => <group key={offset} position={[0, 0, offset]}>
      <mesh castShadow geometry={candlesticks} material={gold} name='dine-table-candlestick' receiveShadow />
      <mesh castShadow geometry={candles} name='dine-table-candle' receiveShadow>
        <meshStandardNodeMaterial color='#f4efe4' roughness={0.62} />
      </mesh>
      <mesh geometry={flames} material={flame} name='dine-table-flame' position={[0, 0.004, 0]} />
      <pointLight color='#ffb06a' decay={2} distance={3.2} intensity={2.4} position={[0, top + candlestickHeight + candleHeight + flameHeight * 0.6, 0]} />
    </group>)}
  </group>
}

/** The runner lies flat on the slab and falls in soft folds over both ends. */
function Runner({material}: {material: FeastRunnerMaterial}) {
  const {length: span, runnerDrop: drop, runnerOverhang: overhang, runnerWidth: cloth, top: surface} = dineTable
  return <group name='dine-table-runner'>
    <Box material={material} position={[0, surface + 0.004, 0]} size={[cloth, 0.008, span + overhang * 2]} />
    {([-1, 1] as const).map(end => <group key={end} position={[0, surface - drop / 2 + 0.004, end * (span / 2 + overhang - 0.02)]}>
      {[-1, 0, 1].map(fold => <Box key={fold} material={material} position={[fold * cloth * 0.22, 0, end * (0.006 + fold * fold * 0.012)]} size={[cloth * 0.34, drop, 0.01]} />)}
    </group>)}
  </group>
}
