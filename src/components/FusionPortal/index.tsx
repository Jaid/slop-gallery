import type Fusion from '#src/lib/gallery/fusion/Fusion.ts'

import {useFrame} from '@react-three/fiber'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import PortalShow from './PortalShow.ts'

/** A fusion’s portal, with its light, its sound and what orbits it, for as long as the fusion is open. */
export default function FusionPortal({fusion}: {fusion: Fusion}) {
  const show = useDisposable(useMemo(() => new PortalShow(fusion), [fusion]))
  useFrame(() => show.update(fusion.elapsed()))
  return <primitive object={show.root} />
}
