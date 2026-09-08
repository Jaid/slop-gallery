import CanvasText from '#component/CanvasText'
import {portraitLabel, portraitLabelLayout} from '#src/lib/gallery/portraitLabel.ts'

type PortraitLabelProps = {
  width: number
  height: number
  title?: string
  creator?: string
  pending?: boolean
  preview?: {color: string
    opacity: number}
}

export default function PortraitLabel({width, height, title, creator = '', pending, preview}: PortraitLabelProps) {
  const layout = portraitLabelLayout(width, height)
  const textMaterial = preview ? {color: preview.color, opacity: preview.opacity * 0.95, fog: false} : undefined
  return <group userData={{portraitLabel: !preview}} position={[0, layout.y, preview ? 0.015 : 0]}>
    <mesh castShadow={!preview}>
      <boxGeometry args={[layout.width, portraitLabel.height, portraitLabel.depth]}/>
      {preview
        ? <meshBasicMaterial color={preview.color} transparent opacity={preview.opacity * 0.22} depthWrite={false} toneMapped={false} fog={false}/>
        : <meshStandardMaterial color="#eee8d7" roughness={0.6}/>}
    </mesh>
    <CanvasText text={title || 'Finding the right words…'} width={layout.titleWidth} height={0.135} position={[0, 0.047, 0.026]} fontSize={0.63} fontFamily="Georgia" color={preview ? '#ffffff' : '#3d4035'} materialProps={textMaterial}/>
    <CanvasText text={creator + (pending ? ' · writing…' : '')} width={layout.creatorWidth} height={0.085} position={[0, -0.065, 0.027]} fontSize={0.64} color={preview ? '#ffffff' : '#696653'} materialProps={textMaterial}/>
  </group>
}
