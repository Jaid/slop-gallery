import {knotBays, knotLayout} from 'knot-materials/exhibition.ts'
import {knotLightSlots} from 'knot-materials/KnotLights.ts'
import {useMemo} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import LedPanels from '#component/LedPanels'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'

import RowEmitters from './RowEmitters.ts'

export default function KnotLights() {
  const heavy = useGraphicsMode()
  const slots = useMemo(() => knotLightSlots(knotLayout, knotBays.length, knotGalleryBounds.height), [])
  const emitters = useMemo(() => new RowEmitters(slots), [slots])
  return <>
    {heavy && emitters.rows.map(({light}) => <primitive key={light.name} object={light} />)}
    <LedPanels name='knot-slot' slots={slots} onBrightness={brightness => emitters.update(brightness)} />
  </>
}
