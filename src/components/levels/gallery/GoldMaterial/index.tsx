import {useEffect} from 'react'

import GoldTextures from '#src/lib/materials/GoldTextures.ts'
import StudioEnvironment from '#src/lib/materials/StudioEnvironment.ts'

export default function GoldMaterial() {
  const environment = new StudioEnvironment
  useEffect(() => () => environment.dispose(), [environment])
  const textures = new GoldTextures
  useEffect(() => () => textures.dispose(), [textures])
  return <meshStandardNodeMaterial map={textures.map} normalMap={textures.normal} normalScale={[0.5, 0.5]} metalness={0.9} roughness={0.12} envMap={environment} envMapIntensity={0.35}/>
}
