import {useFrame} from '@react-three/fiber/webgpu'
import {useEffect, useRef} from 'react'

import Player from '#component/Player'
import WebmcpBridge from '#component/WebmcpBridge'
import {Scene as LevelScene} from '#level/components.ts'
import {useGallery} from '#src/lib/gallery.ts'
import {pendingImages} from '#src/lib/useArtworkTexture.ts'

import Interaction from './Interaction.tsx'

export default function Scene() {
  return <>
    <LevelScene/>
    <Player/>
    <Interaction/>
    <WebmcpBridge/>
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
