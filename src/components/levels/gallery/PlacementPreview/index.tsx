import {useFrame} from '@react-three/fiber/webgpu'
import {useEffect, useMemo} from 'react'

import PortraitLabel from '#component/levels/gallery/PortraitLabel'
import {previewColors, previewOpacity, PreviewVisual} from '#src/components/levels/gallery/PlacementPreview/PreviewVisual.ts'
import {useGallery} from '#src/lib/gallery.ts'
import {portraitLabel, portraitLabelLayout} from '#src/lib/gallery/portraitLabel.ts'
import {useArtworkTexture} from '#src/lib/useArtworkTexture.ts'

export default function PlacementPreview({width, height, source, title, creator, pending}: {creator?: string
  height: number
  pending?: boolean
  source?: Blob | string
  title?: string
  width: number}) {
  const {texture} = useArtworkTexture(source)
  const valid = useGallery(s => s.placement?.valid === true)
  const inReach = useGallery(s => s.placement?.inReach === true)
  const label = portraitLabelLayout(width, height)
  const visual = useMemo(() => new PreviewVisual(width, height, texture), [width, height, texture])
  useEffect(() => () => visual.dispose(), [visual])
  useFrame((_, delta) => {
    const {placement} = useGallery.getState()
    visual.update(placement?.valid === true, delta, placement?.inReach === true)
  })
  return <>
    <mesh position={[0, 0, 0.115]}>
      <planeGeometry args={[width, height]}/>
      <primitive object={visual.imageMaterial} attach="material"/>
    </mesh>
    <mesh position={[0, 0, 0.12]}>
      <primitive object={visual.border} attach="geometry"/>
      <primitive object={visual.borderMaterial} attach="material"/>
    </mesh>
    <PortraitLabel width={width} height={height} title={title} creator={creator} pending={pending} preview={{
      color: valid ? previewColors.valid : previewColors.invalid,
      opacity: previewOpacity(inReach),
    }}/>
    <mesh position={[0, label.y, portraitLabel.depth / 2 + 0.018]}>
      <primitive object={visual.labelBorder} attach="geometry"/>
      <primitive object={visual.labelBorderMaterial} attach="material"/>
    </mesh>
  </>
}
