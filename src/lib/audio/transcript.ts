/** what the narrator reads for a work: its title as a sentence of its own, then its description */
export default function transcriptFor(story: {
  description: string
  title: string
}) {
  const description = story.description.trim()
  return `${story.title.replace(/[!.?]$/, '')}. ${description}${/[!.?]$/.test(description) ? '' : '.'}`
}
