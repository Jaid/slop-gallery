import {useFrame} from '@react-three/fiber/webgpu'
import {useEffect, useRef} from 'react'

import DevelopmentBridge from '#component/DevelopmentBridge'
import Player from '#component/Player'
import {useGallery} from '#src/lib/gallery.ts'

import {pendingImages} from '../DynamicImageMaterial/useArtworkTexture.ts'
import Architecture from './Architecture.tsx'
import Interaction from './Interaction.tsx'
import Portrait from './Portrait.tsx'
import Props from './Props.tsx'

export default function Scene() {
  const portraits = useGallery(s => s.portraits)
  const resetEpoch = useGallery(s => s.resetEpoch)
  return <>
    <Architecture/>
    <Props key={resetEpoch}/>
    {portraits.map(p => <Portrait key={p.id} portrait={p}/>)}
    <Player position={[0, 0.85, 5.8]} speed={3} yaw={0}/>
    <Interaction/>
    <DevelopmentBridge/>
    <Ready/>
  </>
}
function Ready() {
  const frames = useRef(0)
  useEffect(() => () => useGallery.setState({ready: false}), [])
  useFrame(() => {
    if (useGallery.getState().ready) {
      return
    }
    if (pendingImages() > 0) {
      frames.current = 0
      return
    }
    if (++frames.current > 8) {
      useGallery.setState({ready: true})
    }
  })
  return null
}
