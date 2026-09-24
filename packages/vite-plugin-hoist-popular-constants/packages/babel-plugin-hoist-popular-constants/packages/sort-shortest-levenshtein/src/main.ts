type Entry<T> = {
  bytes: number
  index: number
  item: T
  text: string
}

const encoder = new TextEncoder
const levenshteinDistance = (left: string, right: string) => {
  const leftPoints: Array<string> = []
  const rightPoints: Array<string> = []
  for (const point of left) {
    leftPoints.push(point)
  }
  for (const point of right) {
    rightPoints.push(point)
  }
  if (!leftPoints.length) {
    return rightPoints.length
  }
  if (!rightPoints.length) {
    return leftPoints.length
  }
  let previous = Array.from({length: rightPoints.length + 1}, (_, index) => index)
  let current = Array.from({length: rightPoints.length + 1}, () => 0)
  for (const [leftIndex, leftPoint] of leftPoints.entries()) {
    current[0] = leftIndex + 1
    for (const [rightIndex, rightPoint] of rightPoints.entries()) {
      current[rightIndex + 1] = Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + (leftPoint === rightPoint ? 0 : 1),
      )
    }
    const swap = previous
    previous = current
    current = swap
  }
  return previous[rightPoints.length]
}
const closestIndex = <T>(entries: Array<Entry<T>>, text: string) => {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [index, entry] of entries.entries()) {
    const distance = levenshteinDistance(text, entry.text)
    if (!(distance < bestDistance)) {
      continue
    }
    bestDistance = distance
    bestIndex = index
  }
  return bestIndex
}

/**
 * Sorts by UTF-8 byte length, chaining equal-length values by nearest Levenshtein distance.
 */
export default function sortShortestLevenshtein<T>(items: Iterable<T>, getText: (item: T) => string = String): Array<T> {
  const entries = Array.from(items, (item, index): Entry<T> => {
    const text = getText(item)
    return {
      bytes: encoder.encode(text).byteLength,
      index,
      item,
      text,
    }
  })
  entries.sort((left, right) => left.bytes - right.bytes || left.index - right.index)
  const result: Array<T> = []
  let previousText: string | undefined
  for (let start = 0; start < entries.length;) {
    let end = start + 1
    while (end < entries.length && entries[end].bytes === entries[start].bytes) {
      end++
    }
    const remaining = entries.slice(start, end)
    let nextIndex = previousText === undefined ? 0 : closestIndex(remaining, previousText)
    while (remaining.length) {
      const [next] = remaining.splice(nextIndex, 1)
      result.push(next.item)
      previousText = next.text
      nextIndex = remaining.length ? closestIndex(remaining, previousText) : 0
    }
    start = end
  }
  return result
}
