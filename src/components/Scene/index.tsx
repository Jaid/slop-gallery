import {useFrame, useThree} from '@react-three/fiber/webgpu'
import {useRef} from 'react'

import Player from '#component/Player'
import {useGallery} from '#src/lib/gallery.ts'

import {pendingImages} from '../DynamicImageMaterial/useArtworkTexture.ts'
import Architecture from './Architecture.tsx'
import Fountain from './Fountain.tsx'
import Interaction from './Interaction.tsx'
import Portrait from './Portrait.tsx'
import Props from './Props.tsx'

export default function Scene() {
  const portraits = useGallery(s => s.portraits)
  return <>
    <Architecture/>
    <Fountain/>
    <Props/>
    {portraits.map(p => <Portrait key={p.id} portrait={p}/>)}
    <Player position={[0, 0.85, 5.8]} speed={3} yaw={0}/>
    <Interaction/>
    <Ready/>
  </>
}
function Ready() {
  const backend = useThree(s => s.renderer.backend)
  const frames = useRef(0)
  if (!('isWebGPUBackend' in backend) || backend.isWebGPUBackend !== true) throw new Error('A WebGPU adapter is required for the gallery.')
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
