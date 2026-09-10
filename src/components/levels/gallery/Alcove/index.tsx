import {useMemo} from 'react'
import {Shape} from 'three/webgpu'

export default function Alcove({width = 3.1, color = '#c8c8b6'}: {color?: string
  width?: number}) {
  const shape = useMemo(() => {
    const shape = new Shape
    const radius = width / 2
    shape.moveTo(-radius, 0)
    shape.lineTo(radius, 0)
    shape.lineTo(radius, 3.05)
    shape.absarc(0, 3.05, radius, 0, Math.PI, false)
    shape.lineTo(-radius, 0)
    return shape
  }, [width])
  return <group position={[0, 0.42, 0.112]}>
    <mesh><shapeGeometry args={[shape, 48]}/><meshStandardNodeMaterial color="#a6a68e" roughness={0.95}/></mesh>
    <mesh position={[0, 0.028, 0.004]} scale={[0.976, 0.987, 1]}><shapeGeometry args={[shape, 48]}/><meshStandardNodeMaterial color={color} roughness={0.95}/></mesh>
  </group>
}
