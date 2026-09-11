import type {ThreeElements} from '@react-three/fiber/webgpu'

import {useEffect, useMemo} from 'react'
import {DataTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace} from 'three/webgpu'

type CanvasTextProps = Omit<ThreeElements['mesh'], 'children'> & {
  color?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number | string
  height: number
  materialProps?: Omit<ThreeElements['meshBasicNodeMaterial'], 'map'>
  maxWidth?: number
  text: string
  width: number
}
const textureWidth = 1536
const CanvasText = ({color = '#ffffff',
  fontFamily = 'sans-serif',
  fontSize = 0.7,
  fontWeight = 400,
  height,
  maxWidth = 0.9,
  materialProps,
  text,
  width,
  ...meshProps}: CanvasTextProps) => {
  const canvas = useMemo(() => document.createElement('canvas'), [])
  const texture = useMemo(() => {
    canvas.width = textureWidth
    canvas.height = Math.max(64, Math.round(textureWidth * height / width))
    const result = new DataTexture(new Uint8Array(canvas.width * canvas.height * 4), canvas.width, canvas.height)
    result.flipY = true
    result.generateMipmaps = true
    result.colorSpace = SRGBColorSpace
    result.magFilter = LinearFilter
    result.minFilter = LinearMipmapLinearFilter
    result.anisotropy = 16
    return result
  }, [canvas, height, width])
  useEffect(() => {
    let cancelled = false
    const render = async () => {
      await document.fonts?.load(`${fontWeight} 16px "${fontFamily}"`, text)
      await document.fonts?.ready
      if (cancelled) {
        return
      }
      const context = canvas.getContext('2d')
      if (!context) {
        return
      }
      context.clearRect(0, 0, canvas.width, canvas.height)
      const requestedPx = Math.max(12, Math.floor(canvas.height * fontSize))
      context.font = `${fontWeight} ${requestedPx}px "${fontFamily}"`
      const measured = context.measureText(text).width || 1
      const targetWidth = canvas.width * maxWidth
      const fittedPx = Math.max(10, Math.floor(requestedPx * Math.min(1, targetWidth / measured)))
      context.font = `${fontWeight} ${fittedPx}px "${fontFamily}"`
      context.fillStyle = color
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(text, canvas.width / 2, canvas.height / 2)
      texture.image.data = new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer)
      texture.needsUpdate = true
    }
    void render().catch(error => console.error('Canvas text rendering failed.', error))
    return () => {
      cancelled = true
    }
  }, [canvas, color, fontFamily, fontSize, fontWeight, maxWidth, text, texture])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh {...meshProps}>
    <planeGeometry args={[width, height]}/>
    <meshBasicNodeMaterial {...materialProps} map={texture} transparent depthWrite={false} toneMapped={false}/>
  </mesh>
}
export default CanvasText
