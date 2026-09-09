import {useEffect, useMemo} from 'react'

import {SoilTextures} from '#src/lib/materials/SoilTextures.ts'

export default function SoilMaterial() {
  const textures = useMemo(() => new SoilTextures, [])
  useEffect(() => () => textures.dispose(), [textures])
  return <meshStandardNodeMaterial map={textures.map} bumpMap={textures.bumpMap} bumpScale={0.022} roughness={1}/>
}
