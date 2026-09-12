import type {KnotBay, NumberedKnot} from '#src/lib/knots/exhibition.ts'

import CanvasText from '#component/CanvasText'
import InteractiveObject from '#component/InteractiveObject'
import Support from '#component/levels/knottingham/KnotBillboardSupport'
import {narrate} from '#src/lib/gallery/actions.ts'
import {knotNumberLabel, knotPreviewX} from '#src/lib/knots/exhibition.ts'
import {knotPreviewGrid, knotPreviewTile} from '#src/lib/knots/KnotPreviewLayout.ts'
import useArtworkTexture from '#src/lib/useArtworkTexture.ts'

export function KnotPreviewTile({count, finish, index}: {count: number
  finish: NumberedKnot
  index: number}) {
  const {texture, failed} = useArtworkTexture(finish.icon)
  const tile = knotPreviewTile(count, index)
  const maxIcon = Math.min(tile.tileWidth * 0.925, tile.rowHeight * 0.81)
  const aspect = texture ? texture.image.width / texture.image.height : 1
  const iconWidth = aspect >= 1 ? maxIcon : maxIcon * aspect
  const iconHeight = aspect >= 1 ? maxIcon / aspect : maxIcon
  const captionHeight = tile.rowHeight * 0.13
  return <>
    <mesh position={[tile.x, tile.y + tile.rowHeight * 0.063, 0.003]}>
      <planeGeometry args={[iconWidth, iconHeight]}/><meshBasicNodeMaterial map={texture} color={texture ? '#ffffff' : failed ? '#5d2929' : '#26313d'} transparent depthWrite={false} toneMapped={false}/>
    </mesh>
    <CanvasText text={`${knotNumberLabel(finish.number)} · ${finish.title}`} fontFamily="main" fontSize={0.72} fontWeight={600} width={tile.tileWidth * 0.96} height={captionHeight} position={[tile.x, tile.y - tile.rowHeight * 0.43, 0.004]} color={finish.accent}/>
  </>
}

/** Runtime billboard composed from per-Knot icons and dynamic text; no combined texture is persisted. */
export default function KnotPreviewSign({bay}: {bay: KnotBay}) {
  const grid = knotPreviewGrid(bay.finishes.length)
  return <InteractiveObject id={`preview-${bay.model}`} onActivate={() => narrate(`preview-${bay.model}`)} name={`preview-${bay.model}`} position={[knotPreviewX, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
    <mesh name={`preview-background-${bay.model}`} position={[0, 0, 0.001]}>
      <planeGeometry args={[grid.width, grid.height]}/><meshBasicNodeMaterial color="#17202b"/>
    </mesh>
    {bay.finishes.map((finish, index) => <KnotPreviewTile key={finish.id} count={bay.finishes.length} finish={finish} index={index}/>)}
    <Support width={grid.width} height={grid.height}/>
  </InteractiveObject>
}
