import {useEnvironment} from '@react-three/drei/webgpu'
import {useEffect, useMemo} from 'react'

import {GoldTextures} from '#src/lib/materials/GoldTextures.ts'

export default function GoldMaterial() {
  // The loader owns the cached HDR; only the procedural maps belong to this mount.
  const environment = useEnvironment({files: '/environment/warehouse.hdr'})
  const textures = useMemo(() => new GoldTextures, [])
  useEffect(() => () => textures.dispose(), [textures])
  return <meshStandardMaterial map={textures.map} normalMap={textures.normal} normalScale={[0.5, 0.5]} metalness={0.9} roughness={0.12} envMap={environment} envMapIntensity={0.35}/>
}
