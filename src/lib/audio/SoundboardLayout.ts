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

/** the announcer wall’s two rows of wider sample buttons */
export const announcerButton = {
  width: 2.55,
  height: 0.48,
  columnPitch: 2.75,
  rowPitch: 0.92,
} as const
/** height of the caption above each panel of buttons */
export const soundboardHeadingHeight = 0.58

/** a rectangle of wall covered by a caption and its buttons, in wall coordinates: `u` is the center along the wall and `bottom` and `top` are heights above the floor */
export type SoundboardPanel = {
  bottom: number
  top: number
  u: number
  width: number
}

const sidePadding = 0.7
const headingClearance = 1.3
/** width of the announcer wall’s caption */
export const announcerHeadingWidth = 6.8
const bottomClearance = 0.65

/** Derives a compact two-wall room from the current effect inventory. */
export default class SoundboardLayout {
  readonly bounds: {
    height: number
    maxX: number
    minX: number
    northZ: number
    southZ: number
  }
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
    const depth = Math.max(40, width * 0.76)
    this.size = [width, height, depth]
    this.bounds = {
      minX: -width / 2,
      maxX: width / 2,
      northZ: -depth / 2,
      southZ: depth / 2,
      height,
    }
  }

  /** position of an announcer button: the first row holds the samples, the second row the priority demos, both aligned to the same columns */
  announcerButtonPosition(columns: number, index: number, row: 0 | 1): [number, number] {
    return [
      (index - (columns - 1) / 2) * announcerButton.columnPitch,
      this.bounds.height - 1.55 - row * announcerButton.rowPitch,
    ]
  }

  /** the announcer wall’s caption and both rows of its buttons, `columns` wide */
  announcerPanel(columns: number): SoundboardPanel {
    return {
      u: 0,
      width: Math.max(announcerHeadingWidth, (columns - 1) * announcerButton.columnPitch + announcerButton.width),
      bottom: this.announcerButtonPosition(columns, 0, 1)[1] - announcerButton.height / 2,
      top: this.headingY() + soundboardHeadingHeight / 2,
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

  headingWidth() {
    return Math.min(this.size[0] - 1.2, 5.4)
  }

  headingY() {
    return this.bounds.height - 0.62
  }

  /** a section’s caption and all of its buttons */
  panel(section: SoundboardSection): SoundboardPanel {
    const layout = this.sections[section]
    const top = this.headingY() + soundboardHeadingHeight / 2
    return {
      u: 0,
      width: Math.max(this.headingWidth(), layout.width),
      bottom: layout.rows ? this.bounds.height - headingClearance - soundboardButton.height - (layout.rows - 1) * soundboardButton.rowPitch : this.headingY() - soundboardHeadingHeight / 2,
      top,
    }
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
