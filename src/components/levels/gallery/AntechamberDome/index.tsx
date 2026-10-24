import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {DoubleSide, ExtrudeGeometry, Path, Shape} from 'three/webgpu'

import antechamberDome, {antechamberDomeGeometry, antechamberLatticeGeometry, antechamberLatticeY} from '#src/lib/gallery/antechamberDome.ts'

/** The Antechamber’s ceiling, around its center: a flat slab like the other rooms’, opened up into a windowed dome with a brass lattice at its crown. */
export default function AntechamberDome({height, size}: {
  height: number
  size: readonly [number, number]
}) {
  const {radius, springY} = antechamberDome
  const geometry = useDisposable(useMemo(() => {
    const outline = new Shape
    outline.moveTo(-size[0] / 2, -size[1] / 2)
    outline.lineTo(size[0] / 2, -size[1] / 2)
    outline.lineTo(size[0] / 2, size[1] / 2)
    outline.lineTo(-size[0] / 2, size[1] / 2)
    outline.closePath()
    const opening = new Path
    opening.absarc(0, 0, radius, 0, Math.PI * 2, true)
    outline.holes.push(opening)
    const slab = new ExtrudeGeometry(outline, {
      bevelEnabled: false,
      curveSegments: 160,
      depth: 0.18,
    })
    const dome = antechamberDomeGeometry()
    const lattice = antechamberLatticeGeometry()
    return {
      dome,
      lattice,
      slab,
      dispose() {
        slab.dispose()
        dome.dispose()
        lattice.dispose()
      },
    }
  }, [radius, size]))
  return <group name='antechamber-dome'>
    <mesh castShadow geometry={geometry.slab} name='antechamber-ceiling' position={[0, height - 0.11, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}><meshStandardNodeMaterial color='#e1dccc' roughness={0.7} /></mesh>
    {/* Seen from inside, the shell shows its back faces, which have to cast the sun’s shadow too. */}
    <mesh castShadow geometry={geometry.dome} name='antechamber-dome-shell' position={[0, springY, 0]} receiveShadow><meshStandardNodeMaterial color='#e8dfc8' roughness={0.8} side={DoubleSide} /></mesh>
    <mesh castShadow name='antechamber-dome-ring' position={[0, springY, 0]} receiveShadow rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, 0.07, 12, 160]} /><meshStandardNodeMaterial color='#b8925a' metalness={0.8} roughness={0.35} /></mesh>
    <mesh castShadow geometry={geometry.lattice} name='antechamber-oculus-lattice' position={[0, springY + antechamberLatticeY, 0]} receiveShadow><meshStandardNodeMaterial color='#b8925a' metalness={0.8} roughness={0.35} side={DoubleSide} /></mesh>
  </group>
}
