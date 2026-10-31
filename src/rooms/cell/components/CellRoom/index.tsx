import ArenaShell from '#component/ArenaShell'
import sandbox from '#src/worlds/sandbox/index.ts'

const cell = sandbox.room('cell')
const {floorTile} = cell.room
const [width, depth] = cell.size
const [x, z] = cell.center
const walls = sandbox.walls.filter(wall => wall.room === cell.id)
// Whole tiles from the north-west corner, which the walls then meet at a tile’s edge all the way round.
const floorOrigin = [x - width / 2, z - depth / 2] as const

/** The Sandbox’s one room: the Arena’s shell around the Cell’s floor plan, lit like the Arena’s product-shot studio from no visible source, and nothing else. */
export default function CellRoom() {
  return <group name='cell'>
    <ambientLight intensity={0.45} />
    <hemisphereLight color='#e1edff' groundColor='#80705d' intensity={1.3} />
    <directionalLight color='#fff0d7' intensity={2.3} position={[-3, 9, -6]} />
    <ArenaShell center={cell.center} floorOrigin={floorOrigin} height={cell.height} size={cell.size} tile={floorTile} walls={walls} />
  </group>
}
