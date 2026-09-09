import type {Vec3} from '#src/lib/gallery.ts'
import type {ThreeElements} from '@react-three/fiber/webgpu'
import type {Texture} from 'three/webgpu'

export function Box({size, color = '#dad2bf', map, material, metalness = 0, roughness = 0.7, envMapIntensity = 1, ...props}: Omit<ThreeElements['mesh'], 'children'> & {color?: string
  envMapIntensity?: number
  map?: Texture
  metalness?: number
  roughness?: number
  size: Vec3}) {
  return <mesh castShadow receiveShadow material={material} {...props}><boxGeometry args={size}/>{!material && <meshStandardNodeMaterial color={color} map={map} roughness={roughness} metalness={metalness} envMapIntensity={envMapIntensity}/>}</mesh>
}

