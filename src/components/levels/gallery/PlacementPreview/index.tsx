import {useFrame} from '@react-three/fiber/webgpu'
import {useEffect} from 'react'

import PortraitLabel from '#component/levels/gallery/PortraitLabel'
import PreviewVisual, {previewColors, previewOpacity} from '#src/components/levels/gallery/PlacementPreview/PreviewVisual.ts'
import {useGallery} from '#src/lib/gallery.ts'
import portraitLabel, {portraitLabelLayout} from '#src/lib/gallery/portraitLabel.ts'
import useArtworkTexture from '#src/lib/useArtworkTexture.ts'

export default function PlacementPreview({width, height, source, title, creator, pending}: {
  creator?: string
  height: number
  pending?: boolean
  source?: Blob | string
  title?: string
  width: number
}) {
  const {texture} = useArtworkTexture(source)
  const valid = useGallery(s => s.placement?.valid === true)
  const inReach = useGallery(s => s.placement?.inReach === true)
  const label = portraitLabelLayout(width, height)
  const visual = new PreviewVisual(width, height, texture)
  useEffect(() => () => visual.dispose(), [visual])
  useFrame((_, delta) => {
    const {placement} = useGallery.getState()
    visual.update(placement?.valid === true, delta, placement?.inReach === true)
  })
  return <>
    <mesh position={[0, 0, 0.115]}>
      <planeGeometry args={[width, height]} />
      <primitive attach='material' object={visual.imageMaterial} />
    </mesh>
    <mesh position={[0, 0, 0.12]}>
      <primitive attach='geometry' object={visual.border} />
      <primitive attach='material' object={visual.borderMaterial} />
    </mesh>
    <PortraitLabel
      creator={creator} height={height} pending={pending} preview={{
        color: valid ? previewColors.valid : previewColors.invalid,
        opacity: previewOpacity(inReach),
      }} title={title} width={width}
    />
    <mesh position={[0, label.y, portraitLabel.depth / 2 + 0.018]}>
      <primitive attach='geometry' object={visual.labelBorder} />
      <primitive attach='material' object={visual.labelBorderMaterial} />
    </mesh>
  </>
}
