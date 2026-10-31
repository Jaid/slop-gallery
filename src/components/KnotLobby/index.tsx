import Branch from 'branch-component'
import {knotBays, knotPreviewX} from 'knot-materials/exhibition.ts'

import ArenaShell from '#component/ArenaShell'
import KnotCandidateSign from '#component/KnotCandidateSign'
import KnotLights from '#component/KnotLights'
import KnotPreviewSigns from '#component/KnotPreviewSigns'
import {knotFloorOrigin, knotFloorTile, knotGalleryBounds, knotGalleryCenter, knotGallerySize} from '#src/lib/gallery/knotGallery.ts'
import {readPmrem} from '#src/lib/rendering/pmrem.ts'
import knottingham from '#src/worlds/knottingham/index.ts'

const center = [knotGalleryCenter[0], knotGalleryCenter[2]] as const
const size = [knotGallerySize[0], knotGallerySize[2]] as const
// A product-shot studio that floods the hall from no visible source. Under ?pmrem=slop_gallery it dims to a faint fill in the gallery’s hemisphere colors, closer to the gallery’s mood, and leaves the hall to its LED panels.
const fillLights = readPmrem() === 'slop_gallery' ? {
  ambient: 0,
  sky: '#ecf3ff',
  ground: '#a29270',
  hemisphere: 0.3,
  key: 0,
} : {
  ambient: 0.45,
  sky: '#e1edff',
  ground: '#80705d',
  hemisphere: 1.3,
  key: 2.3,
}

/** The Arena’s shell and lighting, without the gallery’s rooms or their physics. */
export default function KnotLobby() {
  return <>
    <color args={['#ded8ca']} attach='background' />
    <group name='knottingham-lobby'>
      <ambientLight intensity={fillLights.ambient} />
      <hemisphereLight color={fillLights.sky} groundColor={fillLights.ground} intensity={fillLights.hemisphere} />
      <directionalLight color='#fff0d7' intensity={fillLights.key} position={[-3, 9, -16]} />
      <ArenaShell center={center} floorOrigin={knotFloorOrigin} height={knotGalleryBounds.height} size={size} tile={knotFloorTile} walls={knottingham.walls} />
      <KnotLights />
      {/* A lone Knot gets a plain room: its candidate sign alone names it, without a billboard. */}
      <Branch if={knotPreviewX !== null}><KnotPreviewSigns x={knotPreviewX!} /></Branch>
      {knotBays.map(bay => <group key={bay.candidate.id} position={bay.center}><KnotCandidateSign bay={bay} /></group>)}
    </group>
  </>
}
