import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import FusionPortal from '#component/FusionPortal'
import {useGallery} from '#src/lib/gallery.ts'
import {useFusions} from '#src/lib/gallery/fusion/fusions.ts'
import PortalVisuals from '#src/lib/gallery/fusion/PortalVisuals.ts'

/** The portal of every merge in progress, in whichever world is loaded. */
export default function Fusions() {
  const fusions = useFusions(state => state.fusions)
  return <>
    <Warmup />
    {fusions.map(fusion => <FusionPortal key={fusion.id} fusion={fusion} />)}
  </>
}

/** An invisible portal behind the loading screen, so the first real one finds its pipelines compiled instead of popping in late. */
function Warmup() {
  const ready = useGallery(state => state.ready)
  const visuals = useDisposable(useMemo(() => new PortalVisuals, []))
  return <primitive object={visuals.root} visible={!ready} />
}
