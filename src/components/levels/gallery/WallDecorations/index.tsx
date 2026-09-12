import type {Wall} from '#src/lib/gallery.ts'
import type {Material} from 'three/webgpu'

import Branch from 'branch-component'

import Alcove from '#component/levels/gallery/Alcove'
import MainEntrance from '#component/levels/gallery/MainEntrance'
import Box from '#src/components/Scene/primitives.tsx'

export default function WallDecorations({wall, trim, material}: {material?: Material
  trim: string
  wall: Wall}) {
  return <>
    <Branch if={wall.id === 'lobby-north'}>
      <MainEntrance/>
      {[-3.6, 3.6].map(x => <group position={[x, 0, 0]} key={x}><Alcove width={2.6}/><Box position={[0, 4.67, 0.55]} size={[0.76, 0.06, 0.16]} color="#ab8850" metalness={0.7}/><mesh position={[0, 4.637, 0.55]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.62, 0.12]}/><meshBasicNodeMaterial color="#fff0cf"/></mesh></group>)}
      {[-5.3, -2.2, 2.2, 5.3].map(x => <group key={x}><Box position={[x, 2.7, 0.16]} size={[0.18, 4.9, 0.2]} color={trim} material={material}/><Box position={[x, 4.94, 0.24]} size={[0.34, 0.15, 0.28]} color={trim} material={material}/></group>)}
    </Branch>
    <Branch some={[wall.id === 'lobby-east', wall.id === 'lobby-west']}><group position={[wall.id === 'lobby-east' ? -2.8 : 2.8, 0, 0]}><Alcove width={3.5}/></group></Branch>
  </>
}
