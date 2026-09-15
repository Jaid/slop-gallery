import CanvasText from '#component/CanvasText'
import portraitLabel, {portraitLabelLayout} from '#src/lib/gallery/portraitLabel.ts'

type PortraitLabelProps = {
  creator?: string
  height: number
  pending?: boolean
  preview?: {
    color: string
    opacity: number
  }
  title?: string
  width: number
}

export default function PortraitLabel({width, height, title, creator = '', pending, preview}: PortraitLabelProps) {
  const layout = portraitLabelLayout(width, height)
  const textMaterial = preview ? {
    color: preview.color,
    opacity: preview.opacity * 0.95,
    fog: false,
  } : undefined
  return <group position={[0, layout.y, preview ? 0.015 : 0]} userData={{portraitLabel: !preview}}>
    <mesh castShadow={!preview}>
      <boxGeometry args={[layout.width, portraitLabel.height, portraitLabel.depth]} />
      {preview ? <meshBasicNodeMaterial color={preview.color} depthWrite={false} fog={false} opacity={preview.opacity * 0.22} toneMapped={false} transparent /> : <meshStandardNodeMaterial color='#eee8d7' roughness={0.6} />}
    </mesh>
    <CanvasText color={preview ? '#ffffff' : '#3d4035'} fontFamily='Georgia' fontSize={0.63} height={0.135} materialProps={textMaterial} position={[0, 0.047, 0.026]} text={title || 'Finding the right words…'} width={layout.titleWidth} />
    <CanvasText color={preview ? '#ffffff' : '#696653'} fontSize={0.64} height={0.085} materialProps={textMaterial} position={[0, -0.065, 0.027]} text={creator + (pending ? ' · writing…' : '')} width={layout.creatorWidth} />
  </group>
}
