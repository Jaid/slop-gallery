import claudeFableAudio from 'voice-sample:claude-fable' with {format: 'opus', language: 'en', text: 'Claude Fable', voice: 'iris'}
import claudeOpusAudio from 'voice-sample:claude-opus' with {format: 'opus', language: 'en', text: 'Claude Opus', voice: 'iris'}
import claudeSonnetAudio from 'voice-sample:claude-sonnet' with {format: 'opus', language: 'en', text: 'Claude Sonnet', voice: 'iris'}
import deepseekFlashAudio from 'voice-sample:deepseek-flash' with {format: 'opus', language: 'en', text: 'DeepSeek Flash', voice: 'iris'}
import geminiFlashAudio from 'voice-sample:gemini-flash' with {format: 'opus', language: 'en', text: 'Gemini Flash', voice: 'iris'}
import glmAudio from 'voice-sample:glm' with {format: 'opus', language: 'en', text: 'GLM', voice: 'iris'}
import gptAstraAudio from 'voice-sample:gpt-astra' with {format: 'opus', language: 'en', text: 'GPT Astra', voice: 'iris'}
import grokAudio from 'voice-sample:grok' with {format: 'opus', language: 'en', text: 'Grok', voice: 'iris'}

export const announcerSamples = [
  {
    id: 'claude-fable',
    label: 'Claude Fable',
    audio: claudeFableAudio,
  },
  {
    id: 'claude-opus',
    label: 'Claude Opus',
    audio: claudeOpusAudio,
  },
  {
    id: 'claude-sonnet',
    label: 'Claude Sonnet',
    audio: claudeSonnetAudio,
  },
  {
    id: 'deepseek-flash',
    label: 'DeepSeek Flash',
    audio: deepseekFlashAudio,
  },
] as const

export const announcerSamplePriority = 'normal' as const
export const announcerPriorityModes = ['volatile', 'high', 'inject', 'async'] as const

export const announcerPrioritySamples = [
  {
    id: 'gemini-flash',
    label: 'Gemini Flash',
    audio: geminiFlashAudio,
  },
  {
    id: 'glm',
    label: 'GLM',
    audio: glmAudio,
  },
  {
    id: 'gpt-astra',
    label: 'GPT Astra',
    audio: gptAstraAudio,
  },
  {
    id: 'grok',
    label: 'Grok',
    audio: grokAudio,
  },
] as const
export const announcerPriorityDemos = announcerPriorityModes.map((priority, index) => {
  const sample = announcerPrioritySamples[index]
  return {
    priority,
    sample,
    title: `${priority.toUpperCase()} · ${sample.label}`,
  }
})
