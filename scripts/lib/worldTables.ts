import type {WorldAnalysis, WorldRegion} from '#src/lib/webmcp/analyzeWorld.ts'

type Row = {
  title: string
  values: Array<number>
}

/** counts of 10 000 and more split their thousands by narrow no-break spaces */
export const formatCount = (count: number) => (count < 10_000 ? String(count) : count.toLocaleString('en-US').replaceAll(',', '\u{202F}'))
const sum = (values: ReadonlyArray<number>) => values.reduce((total, value) => total + value, 0)
/** a table of the rows, most of the first value first, with Elsewhere and Global after them, closed by their totals */
const table = (headers: ReadonlyArray<string>, rows: ReadonlyArray<Row>, trailing: ReadonlyArray<Row> = []) => {
  const all = [...rows.toSorted((a, b) => b.values[0] - a.values[0] || b.values[1] - a.values[1]), ...trailing]
  const total: Row = {
    title: '**Total**',
    values: headers.slice(1).map((_, index) => sum(all.map(row => row.values[index]))),
  }
  return [
    `| ${headers.join(' | ')} |`,
    `| --- |${' --: |'.repeat(headers.length - 1)}`,
    ...[...all, total].map(row => `| ${row.title} | ${row.values.map(formatCount).join(' | ')} |`),
  ]
}

/**
 * Markdown tables of a world’s analysis: the static meshes and the items, which can be picked up and carried into another room, by triangles, and the lights.
 * Rooms without items are left out of the items table, the passages, stairways and outdoors as Elsewhere wherever they hold anything.
 */
export default function worldTables(analysis: WorldAnalysis, title: string, graphics: string, seed: number) {
  const regions: Array<[string, WorldRegion]> = Object.values(analysis.rooms).map(room => [room.title, room])
  const elsewhere: Array<[string, WorldRegion]> = [['Elsewhere', analysis.elsewhere]]
  const rows = (list: ReadonlyArray<[string, WorldRegion]>, keep: (region: WorldRegion) => boolean, values: (region: WorldRegion) => Array<number>) => list.filter(([, region]) => keep(region)).map(([name, region]) => ({
    title: name,
    values: values(region),
  }))
  const staticValues = (region: WorldRegion) => [sum(region.meshes.map(mesh => mesh.triangles)), region.meshes.length]
  const itemValues = (region: WorldRegion) => [sum(region.items.map(item => item.triangles)), region.items.length]
  const lightValues = (region: Pick<WorldRegion, 'lights'>) => [region.lights.length, region.lights.filter(light => light.shadow).length]
  const items = rows([...regions, ...elsewhere], region => region.items.length > 0, itemValues)
  const global = analysis.globalLights.length ? [{
    title: 'Global',
    values: lightValues({lights: analysis.globalLights}),
  }] : []
  return [
    `## ${title} (${graphics} graphics, seed ${seed})`,
    '',
    '### Static meshes',
    '',
    ...table(['Room', 'Triangles', 'Meshes'], rows(regions, () => true, staticValues), rows(elsewhere, region => region.meshes.length > 0, staticValues)),
    '',
    '### Items',
    '',
    'Props, portraits and everything else the player can pick up, counted in the room they lie in now, as they can be carried into any other.',
    '',
    ...items.length ? table(['Room', 'Triangles', 'Items'], items) : ['None.'],
    '',
    '### Lights',
    '',
    ...table(['Room', 'Lamps', 'Shadows'], rows(regions, () => true, lightValues), [...rows(elsewhere, region => region.lights.length > 0, lightValues), ...global]),
    '',
    'Shadows counts the lamps with a shadow map of their own and those borrowing one of the shadow pool’s while in view. Global holds the sun, the sky and ambient light, Elsewhere the passages, stairways and the outdoors.',
    '',
  ].join('\n')
}
