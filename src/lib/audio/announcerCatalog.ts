export const announcerSampleDefinitions = [
  {
    id: 'claude-fable',
    label: 'Claude Fable',
  },
  {
    id: 'claude-opus',
    label: 'Claude Opus',
  },
  {
    id: 'claude-sonnet',
    label: 'Claude Sonnet',
  },
  {
    id: 'deepseek-flash',
    label: 'DeepSeek Flash',
  },
] as const

export const announcerSamplePriority = 'normal' as const
export const announcerPriorityModes = ['volatile', 'high', 'inject', 'async'] as const

export const announcerPrioritySampleDefinitions = [
  {
    id: 'gemini-flash',
    label: 'Gemini Flash',
  },
  {
    id: 'glm',
    label: 'GLM',
  },
  {
    id: 'gpt-astra',
    label: 'GPT Astra',
  },
  {
    id: 'grok',
    label: 'Grok',
  },
] as const

export const announcerPriorityDemoDefinitions = announcerPriorityModes.map((priority, index) => {
  const sample = announcerPrioritySampleDefinitions[index]
  return {
    priority,
    sample,
    title: `${priority.toUpperCase()} · ${sample.label}`,
  }
})
