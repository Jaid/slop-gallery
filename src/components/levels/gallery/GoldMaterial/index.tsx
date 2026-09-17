import StudioEnvironment from 'knot-materials/StudioEnvironment.ts'
import {useEffect} from 'react'

import GoldTextures from '#src/lib/materials/GoldTextures.ts'

export default function GoldMaterial() {
  const environment = new StudioEnvironment
  useEffect(() => () => environment.dispose(), [environment])
  const textures = new GoldTextures
  useEffect(() => () => textures.dispose(), [textures])
  return <meshStandardNodeMaterial envMap={environment} envMapIntensity={0.35} map={textures.map} metalness={0.9} normalMap={textures.normal} normalScale={[0.5, 0.5]} roughness={0.12} />
}
