import claudeFableAudio from 'voice:claude-fable' with {format: 'opus', language: 'en', text: 'Claude Fable'}
import claudeOpusAudio from 'voice:claude-opus' with {format: 'opus', language: 'en', text: 'Claude Opus'}
import claudeSonnetAudio from 'voice:claude-sonnet' with {format: 'opus', language: 'en', text: 'Claude Sonnet'}
import deepseekFlashAudio from 'voice:deepseek-flash' with {format: 'opus', language: 'en', text: 'DeepSeek Flash'}
import geminiFlashAudio from 'voice:gemini-flash' with {format: 'opus', language: 'en', text: 'Gemini Flash'}
import glmAudio from 'voice:glm' with {format: 'opus', language: 'en', text: 'GLM'}
import gptAstraAudio from 'voice:gpt-astra' with {format: 'opus', language: 'en', text: 'GPT Astra'}
import grokAudio from 'voice:grok' with {format: 'opus', language: 'en', text: 'Grok'}

import {announcerPriorityDemoDefinitions, announcerPrioritySampleDefinitions, announcerSampleDefinitions} from './announcerCatalog.ts'

export const announcerSamples = [
  {
    ...announcerSampleDefinitions[0],
    audio: claudeFableAudio,
  },
  {
    ...announcerSampleDefinitions[1],
    audio: claudeOpusAudio,
  },
  {
    ...announcerSampleDefinitions[2],
    audio: claudeSonnetAudio,
  },
  {
    ...announcerSampleDefinitions[3],
    audio: deepseekFlashAudio,
  },
] as const

export const announcerPrioritySamples = [
  {
    ...announcerPrioritySampleDefinitions[0],
    audio: geminiFlashAudio,
  },
  {
    ...announcerPrioritySampleDefinitions[1],
    audio: glmAudio,
  },
  {
    ...announcerPrioritySampleDefinitions[2],
    audio: gptAstraAudio,
  },
  {
    ...announcerPrioritySampleDefinitions[3],
    audio: grokAudio,
  },
] as const

export const announcerPriorityDemos = announcerPriorityDemoDefinitions.map(({priority, title}, index) => ({
  priority,
  sample: announcerPrioritySamples[index],
  title,
}))

export {announcerPriorityModes, announcerSamplePriority} from './announcerCatalog.ts'
