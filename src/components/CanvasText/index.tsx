import type {ThreeElements} from '@react-three/fiber/webgpu'

import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import {useMemo} from 'react'

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
  const texture = useCanvasTexture(useMemo(() => ({
    width: textureWidth,
    height: Math.max(64, Math.round(textureWidth * height / width)),
    name: `Canvas text: ${text}`,
    mipmaps: false,
    prepare: () => loadCanvasFonts([
      {
        font: `${fontWeight} 16px "${fontFamily}"`,
        text,
      },
    ]),
    draw(context: CanvasRenderingContext2D) {
      const canvas = context.canvas
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
    },
  }), [color, fontFamily, fontSize, fontWeight, height, maxWidth, text, width]))
  return <mesh {...meshProps} visible={Boolean(texture) && meshProps.visible !== false}>
    <planeGeometry args={[width, height]} />
    <meshBasicNodeMaterial key={texture?.uuid ?? 'pending'} {...materialProps} map={texture} transparent depthWrite={false} toneMapped={false} />
  </mesh>
}
export default CanvasText
