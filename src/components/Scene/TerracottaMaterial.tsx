import {useEffect, useMemo} from 'react'

import {TerracottaTextures} from '#src/lib/materials/TerracottaTextures.ts'

export default function TerracottaMaterial() {
  const textures = useMemo(() => new TerracottaTextures, [])
  useEffect(() => () => textures.dispose(), [textures])
  return <meshStandardNodeMaterial map={textures.map} bumpMap={textures.bumpMap} bumpScale={0.008} roughnessMap={textures.roughnessMap} roughness={1}/>
}
