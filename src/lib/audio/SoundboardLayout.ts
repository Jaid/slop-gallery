export type SoundboardSection = 'archived' | 'enabled'

type SectionLayout = {
  columns: number
  count: number
  rows: number
  width: number
}

export const soundboardButton = {
  width: 1.52,
  height: 0.4,
  columnPitch: 1.68,
  rowPitch: 0.56,
} as const

const sidePadding = 0.7
const headingClearance = 1.3
const bottomClearance = 0.65

/** Derives a compact two-wall room from the current effect inventory. */
export default class SoundboardLayout {
  readonly bounds: {height: number
    maxX: number
    minX: number
    northZ: number
    southZ: number}
  readonly sections: Record<SoundboardSection, SectionLayout>
  readonly size: [number, number, number]

  constructor(counts: Record<SoundboardSection, number>) {
    this.sections = {
      enabled: this.section(counts.enabled),
      archived: this.section(counts.archived),
    }
    const contentWidth = Math.max(this.sections.enabled.width, this.sections.archived.width)
    const rows = Math.max(this.sections.enabled.rows, this.sections.archived.rows)
    const height = Math.max(4.4, headingClearance + bottomClearance + soundboardButton.height + Math.max(0, rows - 1) * soundboardButton.rowPitch)
    const width = contentWidth + sidePadding * 2
    const depth = Math.max(7.2, width * 0.76)
    this.size = [width, height, depth]
    this.bounds = {
      minX: -width / 2,
      maxX: width / 2,
      northZ: -depth / 2,
      southZ: depth / 2,
      height,
    }
  }

  buttonPosition(section: SoundboardSection, index: number): [number, number] {
    const layout = this.sections[section]
    if (!Number.isSafeInteger(index) || index < 0 || index >= layout.count) {
      throw new RangeError(`Invalid ${section} sound index.`)
    }
    const row = Math.floor(index / layout.columns)
    const rowStart = row * layout.columns
    const rowCount = Math.min(layout.columns, layout.count - rowStart)
    const column = index - rowStart
    return [
      (column - (rowCount - 1) / 2) * soundboardButton.columnPitch,
      this.bounds.height - headingClearance - soundboardButton.height / 2 - row * soundboardButton.rowPitch,
    ]
  }

  headingY() {
    return this.bounds.height - 0.62
  }

  private section(count: number): SectionLayout {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError('Soundboard section counts must be nonnegative integers.')
    }
    const columns = count ? Math.ceil(Math.sqrt(count * 1.2)) : 1
    const rows = count ? Math.ceil(count / columns) : 0
    const width = count ? (columns - 1) * soundboardButton.columnPitch + soundboardButton.width : soundboardButton.width
    return {
      columns,
      count,
      rows,
      width,
    }
  }
}
