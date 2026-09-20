import useDisposable from 'disposable-lifetime/react'
import StudioEnvironment from 'knot-materials/StudioEnvironment.ts'
import {useMemo} from 'react'

import GoldTextures from '#src/lib/materials/GoldTextures.ts'

export default function GoldMaterial() {
  const environment = useDisposable(useMemo(() => new StudioEnvironment, []))
  const textures = useDisposable(useMemo(() => new GoldTextures, []))
  return <meshStandardNodeMaterial envMap={environment} envMapIntensity={0.35} map={textures.map} metalness={0.9} normalMap={textures.normal} normalScale={[0.5, 0.5]} roughness={0.12} />
}
