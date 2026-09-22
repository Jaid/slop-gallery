import fs from 'fs-extra'

import {knotAnnouncements} from '../src/announcements.ts'
import {knotCandidates} from '../src/main.ts'

const literal = (value: string) => JSON.stringify(value)
const sourceId = (id: string) => {
  return `knot-${id.replaceAll(/[^\w\-.]+/g, '__')}`
}
const spokenText = (text: string) => text.trim().replace(/[!.?]+$/u, '')

export function announcementAssetsSource() {
  const items = knotAnnouncements(knotCandidates).toSorted((a, b) => a.id.localeCompare(b.id))
  const imports = items.map((item, index) => {
    return `import announcement${index} from ${literal(`voice:${sourceId(item.id)}/iris`)} with {emotion: 'loud', format: 'opus', language: 'en', text: ${literal(spokenText(item.text))}}`
  })
  const rows = items.map((item, index) => `  [${literal(item.id)}, announcement${index}],`)
  return [
    '/* eslint-disable perfectionist/sort-imports, stylistic/quotes */',
    ...imports,
    '',
    'const recordings = new Map<string, string>([',
    ...rows,
    '])',
    'const knotAnnouncementUrl = (id: string) => recordings.get(id)',
    '',
    'export default knotAnnouncementUrl',
    '',
  ].join('\n')
}

if (import.meta.main) {
  await fs.writeFile(new URL('../src/announcementAssets.ts', import.meta.url), announcementAssetsSource())
}
