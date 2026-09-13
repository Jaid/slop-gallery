import type {KnotBay} from '#src/lib/knots/exhibition.ts'

import {knotNumberLabel} from '#src/lib/knots/exhibition.ts'
import {knotPreviewTextureLayout, knotPreviewTextureRowHeight} from '#src/lib/knots/KnotPreviewLayout.ts'

export const knotPreviewBackground = '#17202b'
export const knotPreviewCaptionFontFamily = 'main'
export const knotPreviewCaptionFontWeight = 600
export const knotPreviewCaptionFontSize = Math.max(12, Math.floor(knotPreviewTextureRowHeight * 0.13 * 0.72))
const failedImageBackground = '#5d2929'
const iconMaximumWidth = 0.925
const iconMaximumHeight = 0.81
const iconCenterOffset = 0.063
const captionWidth = 0.96
const captionHeight = 0.13
const captionCenterOffset = 0.43
const captionMaximumWidth = 0.9

/** Compose one complete candidate billboard from its individual runtime assets. */
export default function drawPreview(context: CanvasRenderingContext2D, bay: KnotBay, images: ReadonlyMap<string, ImageBitmap>) {
  const layout = knotPreviewTextureLayout(bay.finishes.length)
  context.fillStyle = knotPreviewBackground
  context.fillRect(0, 0, layout.width, layout.height)
  for (const [index, finish] of bay.finishes.entries()) {
    const column = index % layout.columns
    const row = Math.floor(index / layout.columns)
    const centerX = layout.tileWidth * (column + 0.5)
    const centerY = layout.rowHeight * (row + 0.5)
    const iconCenterY = centerY - layout.rowHeight * iconCenterOffset
    const maxIcon = Math.min(layout.tileWidth * iconMaximumWidth, layout.rowHeight * iconMaximumHeight)
    const image = images.get(finish.icon)
    if (image) {
      const aspect = image.width / image.height
      const width = aspect >= 1 ? maxIcon : maxIcon * aspect
      const height = aspect >= 1 ? maxIcon / aspect : maxIcon
      context.drawImage(image, centerX - width / 2, iconCenterY - height / 2, width, height)
    } else {
      context.fillStyle = failedImageBackground
      context.fillRect(centerX - maxIcon / 2, iconCenterY - maxIcon / 2, maxIcon, maxIcon)
    }
    const text = `${knotNumberLabel(finish.number)} · ${finish.title}`
    const boxWidth = layout.tileWidth * captionWidth
    const requestedPx = Math.max(12, Math.floor(layout.rowHeight * captionHeight * 0.72))
    context.font = `${knotPreviewCaptionFontWeight} ${requestedPx}px "${knotPreviewCaptionFontFamily}"`
    const measured = context.measureText(text).width || 1
    const targetWidth = boxWidth * captionMaximumWidth
    const fittedPx = Math.max(10, Math.floor(requestedPx * Math.min(1, targetWidth / measured)))
    context.font = `${knotPreviewCaptionFontWeight} ${fittedPx}px "${knotPreviewCaptionFontFamily}"`
    context.fillStyle = finish.accent
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, centerX, centerY + layout.rowHeight * captionCenterOffset)
  }
}
