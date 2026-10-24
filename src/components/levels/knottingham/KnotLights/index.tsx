import {knotBays, knotLayout} from 'knot-materials/exhibition.ts'
import {knotLightSurfaceIntensity} from 'knot-materials/KnotLightPanels.ts'
import {knotLightSlots} from 'knot-materials/KnotLights.ts'
import {useMemo} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import LedPanels from '#component/LedPanels'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'

import RowEmitters from './RowEmitters.ts'

// Half the shared panes’ luminance: at full strength the gallery’s bloom washes the whole hall out.
const surfaceIntensity = knotLightSurfaceIntensity / 2

export default function KnotLights() {
  const heavy = useGraphicsMode()
  const slots = useMemo(() => knotLightSlots(knotLayout, knotBays.length, knotGalleryBounds.height), [])
  const emitters = useMemo(() => new RowEmitters(slots), [slots])
  return <>
    {heavy && emitters.rows.map(({light}) => <primitive key={light.name} object={light} />)}
    <LedPanels name='knot-slot' slots={slots} surfaceIntensity={surfaceIntensity} onBrightness={brightness => emitters.update(brightness)} />
  </>
}
