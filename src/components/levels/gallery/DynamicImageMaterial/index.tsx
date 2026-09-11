import type {ThreeElements} from '@react-three/fiber/webgpu'

import useArtworkTexture from '#src/lib/useArtworkTexture.ts'

export default function DynamicImageMaterial({source, ...props}: Omit<ThreeElements['meshBasicNodeMaterial'], 'map'> & {source?: Blob | string | null}) {
  const {texture, failed} = useArtworkTexture(source)
  return <meshBasicNodeMaterial key={texture?.uuid ?? 'loading'} {...props} map={texture} color={texture ? '#ffffff' : failed ? '#a17969' : '#ded6c5'}/>
}
