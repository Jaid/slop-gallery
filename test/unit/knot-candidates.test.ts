import type {KnotCandidateData, KnotData, KnotId} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import {entries, knotCandidates, knots, knotsById} from 'knot-materials'
import {knotAnnouncementPaths} from 'knot-materials/announcements.ts'
import {enumerateKnotBays, formatKnotLabels, selectKnotBays} from 'knot-materials/exhibition.ts'
import KnotCandidate, {indexKnots} from 'knot-materials/KnotCandidate.ts'

const candidateData: KnotCandidateData = {
  id: 'claude_fable',
  title: 'Claude Fable',
  icon: 'icon.jxl',
}
const item = (id: string): KnotData => ({
  id,
  title: id.replaceAll('_', ' '),
  candidateId: 'claude_fable',
  placeholder: {
    color: '#ffffff',
    shading: 'smooth',
  },
  flavorText: 'A quiet relic of an impossible place.',
  icon: 'icon.jxl',
  author: {model: {title: 'Claude Fable 5.1'}},
})
const ids = (candidate: KnotCandidate) => candidate.select().map(entry => entry.id)
const byId = (id: string) => knotsById.get(id)!
describe('arbitrary Knot batches', () => {
  test('places rarer entries at the far end while prioritizing them for shot limits', () => {
    const items = [item('washi_lantern'), item('lichtenberg_reliquary'), item('damascus_ember'), item('chladni_resonance'), item('glacial_aurora')]
    const candidate = new KnotCandidate(candidateData, items)
    const byRarityThenId = (a: typeof candidate.items[number], b: typeof candidate.items[number]) => a.rarity - b.rarity || a.id.localeCompare(b.id)
    const expected = candidate.items.toSorted(byRarityThenId)
    expect(ids(candidate)).toEqual(expected.map(entry => entry.id))
    expect(ids(new KnotCandidate(candidateData, items.toReversed()))).toEqual(expected.map(entry => entry.id))
    const limited = candidate.select(3)
    const expectedLimited = candidate.items.toSorted((a, b) => b.rarity - a.rarity || a.id.localeCompare(b.id)).slice(0, 3).toSorted(byRarityThenId)
    expect(limited.map(entry => entry.id)).toEqual(expectedLimited.map(entry => entry.id))
    expect(limited.map(entry => entry.rarity)).toEqual(expectedLimited.map(entry => entry.rarity))
    expect(() => candidate.select(0)).toThrow('shot limit')
  })
  test('handles empty and partial rows without padding or reintroducing archives', () => {
    expect(ids(new KnotCandidate(candidateData, []))).toEqual([])
    const candidate = new KnotCandidate(candidateData, [
      item('damascus_ember'),
      {
        ...item('lichtenberg_reliquary'),
        archived: true,
      },
      item('chladni_resonance'),
    ])
    expect(ids(candidate)).toEqual(['damascus_ember', 'chladni_resonance'])
    expect(candidate.items).toHaveLength(3)
  })
  test('rejects invalid identifiers, duplicate IDs and displacement bounds', () => {
    expect(() => new KnotCandidate({
      ...candidateData,
      id: '../fable',
    }, [])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [
      {
        ...item('damascus_ember'),
        id: '../other',
      },
    ])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [item('damascus_ember'), item('damascus_ember')])).toThrow('ID')
    for (const displacement of [-1, Number.NaN, Infinity]) {
      expect(() => new KnotCandidate(candidateData, [
        {
          ...item('damascus_ember'),
          displacement,
        },
      ])).toThrow('displacement')
    }
    expect(() => new KnotCandidate(candidateData, [
      {
        ...item('damascus_ember'),
        author: {model: {title: ' '}},
      },
    ])).toThrow('author')
  })
  test('indexes globally unique IDs and rejects duplicate candidates or cross-candidate collisions', () => {
    const a = new KnotCandidate(candidateData, [item('damascus_ember')])
    const astra = {
      ...candidateData,
      id: 'gpt_astra',
    }
    const b = new KnotCandidate(astra, [{
      ...item('lenticular_mirage'),
      candidateId: 'gpt_astra',
    }])
    expect([...indexKnots([a, b]).keys()]).toEqual(['damascus_ember', 'lenticular_mirage'])
    const duplicate = new KnotCandidate(astra, [{
      ...item('damascus_ember'),
      candidateId: 'gpt_astra',
    }])
    expect(() => indexKnots([a, duplicate])).toThrow('Duplicate Knot ID')
    expect(() => indexKnots([a, a])).toThrow('candidate')
  })
  test('flat metadata has no persisted plate numbers or billboard overviews', async () => {
    expect(Object.keys(entries)).toHaveLength(knots.length)
    for (const candidate of knotCandidates) {
      expect('overview' in candidate.data).toBe(false)
      for (const entry of candidate.items) {
        const data = entries[entry.id as KnotId]
        expect(entry.id).toBe(data.id)
        expect(candidate.data.id).toBe(data.candidateId)
        expect(entry.archived).not.toBe(true)
        expect('number' in data).toBe(false)
        expect(await Bun.file(`packages/knot-materials/src/entries/${entry.id}/Material.ts`).exists()).toBe(true)
        const dataSource = await Bun.file(`packages/knot-materials/src/entries/${entry.id}/data.ts`).text()
        expect(dataSource).not.toMatch(/\bnumber\s*:/u)
      }
    }
    const materialFiles = await Array.fromAsync(new Bun.Glob('packages/knot-materials/src/entries/*/Material.ts').scan('.'))
    expect(new Set(materialFiles.map(path => path.replaceAll('\\', '/')))).toEqual(new Set(knots.map(entry => `packages/knot-materials/src/entries/${entry.id}/Material.ts`)))
    expect(knotsById.size).toBe(knots.length)
  })
  test('uses canonical candidate and model IDs', () => {
    expect(new Set(knotCandidates.map(candidate => candidate.data.id))).toEqual(new Set([
      'claude_fable',
      'claude_opus',
      'claude_sonnet',
      'deepseek',
      'gemini_flash',
      'glm',
      'glm_flash',
      'gpt_astra',
      'gpt_luna',
      'gpt_sol',
      'gpt_terra',
      'grok',
      'hy',
      'kimi',
      'mimo',
      'minimax',
      'muse_spark',
      'qwen_max',
    ]))
    const modelIds = new Set(knots.map(entry => knotAnnouncementPaths(entry).model.split('/slug/')[1]))
    expect(modelIds).toEqual(new Set([
      'gpt-6-astra',
      'claude-sonnet-5',
      'claude-opus-5',
      'claude-opus-4-6-thinking',
      'deepseek',
      'deepseek-4.1-flash',
      'gemini-3.8-flash',
      'glm-5.3',
      'glm-5.3-flash',
      'grok-4.6',
      'grok-4.7',
      'kimi-k3',
      'mimo-v2.5-pro',
      'mimo-v2.6-pro',
      'minimax-m3',
      'qwen-3.8-max',
      'gpt-5.6-luna',
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'claude-fable-5.1',
      'muse-spark-1.3',
      'muse-spark',
      'hy4-preview',
    ]))
  })
  test('uses candidate titles independently from author model titles', () => {
    expect(Object.fromEntries(knotCandidates.map(candidate => [candidate.data.id, candidate.data.title]))).toMatchObject({
      gpt_astra: 'GPT Astra',
      gpt_luna: 'GPT Luna',
      claude_fable: 'Claude Fable',
      gemini_flash: 'Gemini Flash',
      glm: 'GLM',
      glm_flash: 'GLM Flash',
      grok: 'Grok',
      hy: 'Hy',
      kimi: 'Kimi',
      mimo: 'MiMo',
      minimax: 'MiniMax M3',
      muse_spark: 'Muse Spark',
      qwen_max: 'Qwen Max',
      gpt_sol: 'GPT Sol',
      gpt_terra: 'GPT Terra',
      claude_sonnet: 'Claude Sonnet',
      claude_opus: 'Claude Opus',
    })
    expect(knotCandidates.find(candidate => candidate.data.id === 'claude_fable')!.items.every(entry => entry.modelTitle === 'Claude Fable 5.1')).toBe(true)
  })
  test('collapses effort labels and spelling variants into one model identity', () => {
    const kimi = knotCandidates.find(candidate => candidate.data.id === 'kimi')!
    expect(new Set(kimi.items.map(entry => entry.modelTitle))).toEqual(new Set(['Kimi K3']))
    expect(kimi.items.filter(entry => entry.harness === 'kimi.ai')).toHaveLength(8)
    expect(kimi.items.filter(entry => entry.harness === 'kimi.ai').every(entry => entry.author.model.effortLevel === 'max')).toBe(true)
    const qwen = knotCandidates.find(candidate => candidate.data.id === 'qwen_max')!
    expect(new Set(qwen.items.map(entry => entry.modelTitle))).toEqual(new Set(['Qwen 3.8 Max']))
  })
  test('keeps every Gemini item on current model provenance', () => {
    const gemini = knotCandidates.find(candidate => candidate.data.id === 'gemini_flash')!
    expect(gemini.items).toHaveLength(48)
    expect(gemini.items.every(entry => entry.author.model.title === 'Gemini 3.8 Flash'
      && entry.author.model.slug === 'google/gemini-3.8-flash'
      && entry.author.model.effortLevel === 'high')).toBe(true)
    expect(gemini.items.filter(entry => entry.harness === 'none')).toHaveLength(24)
    expect(gemini.items.filter(entry => entry.harness === 'Mage')).toHaveLength(24)
  })
  test('keeps API model credits and displacement metadata by stable identity', () => {
    const expected = [
      ['DeepSeek 4.1 Flash', 'deepseek/deepseek-4.1-flash', {max: 8}],
      ['Muse Spark 1.3', 'meta/muse-spark-1.3', {xhigh: 8}],
      ['GLM 5.3 Flash', 'z-ai/glm-5.3-flash', {max: 8}],
      ['Hy4 Preview', 'tencent/hy4-preview', {
        high: 8,
        medium: 16,
      }],
      ['Claude Sonnet 5', 'anthropic/claude-sonnet-5', {medium: 8}],
      ['Claude Opus 5', 'anthropic/claude-opus-5', {medium: 16}],
    ] as const
    for (const [title, slug, effortCounts] of expected) {
      const entries = knots.filter(entry => entry.author.model.slug === slug && entry.harness === 'none')
      expect(entries).toHaveLength(Object.values(effortCounts).reduce((sum, count) => sum + count, 0))
      expect(entries.every(entry => entry.author.model.title === title)).toBe(true)
      expect(Object.fromEntries(Map.groupBy(entries, entry => entry.author.model.effortLevel).entries().map(([effort, grouped]) => [effort, grouped.length]))).toEqual(effortCounts)
    }
    expect(byId('hadal_blossom').displacement).toBe(0.02)
    expect(byId('chladni_resonance').displacement).toBe(0.006)
    expect(byId('volcanic_chrysalis').displacement).toBe(0.018)
    expect(byId('ferrothorn').displacement).toBe(0.048)
    expect(byId('folded_silence').displacement).toBe(0.048)
    expect(byId('magnetite_field').displacement).toBe(0.046)
    expect(byId('chromatophore_skin').displacement).toBe(0.014)
  })
  test('records API, Codex, Mage and web-chat harness provenance without guessing legacy sources', () => {
    const api = knots.filter(entry => entry.author.model.slug && entry.harness === 'none')
    const codex = knots.filter(entry => entry.harness === 'Codex')
    const webChat = knots.filter(entry => !entry.author.model.slug && entry.harness && entry.harness !== 'Codex')
    const legacy = knots.filter(entry => !entry.author.model.slug && !entry.harness)
    expect(api).toHaveLength(136)
    expect(codex).toHaveLength(17)
    expect(webChat).toHaveLength(56)
    expect(legacy).toHaveLength(56)
    expect(api.every(entry => entry.harness === 'none')).toBe(true)
    expect(codex.every(entry => entry.candidate.id === 'gpt_astra')).toBe(true)
    expect(legacy.every(entry => entry.harness === undefined)).toBe(true)
    const astraMage = knots.filter(entry => entry.candidate.id === 'gpt_astra' && entry.harness === 'Mage')
    expect(astraMage).toHaveLength(52)
    expect(astraMage.every(entry => entry.author.model.title === 'GPT-6 Astra' && entry.author.model.slug === 'openai/gpt-6-astra')).toBe(true)
    expect(Object.fromEntries(Map.groupBy(astraMage, entry => entry.author.model.effortLevel).entries().map(([effort, grouped]) => [effort, grouped.length]))).toEqual({
      high: 22,
      max: 14,
      xhigh: 16,
    })
    const deepseekMage = knots.filter(entry => entry.candidate.id === 'deepseek' && entry.harness === 'Mage')
    expect(deepseekMage).toHaveLength(56)
    expect(deepseekMage.every(entry => entry.author.model.title === 'DeepSeek 4.1 Flash' && entry.author.model.slug === 'deepseek/deepseek-4.1-flash' && entry.author.model.effortLevel === 'xhigh')).toBe(true)
    const lunaMage = knots.filter(entry => entry.candidate.id === 'gpt_luna' && entry.harness === 'Mage')
    expect(lunaMage).toHaveLength(8)
    expect(lunaMage.every(entry => entry.author.model.title === 'GPT-5.6 Luna' && entry.author.model.slug === 'openai/gpt-5.6-luna' && entry.author.model.effortLevel === 'max')).toBe(true)
    const terraMage = knots.filter(entry => entry.candidate.id === 'gpt_terra' && entry.harness === 'Mage')
    expect(terraMage).toHaveLength(16)
    expect(terraMage.every(entry => entry.author.model.title === 'GPT-5.6 Terra' && entry.author.model.slug === 'openai/gpt-5.6-terra' && entry.author.model.effortLevel === 'max')).toBe(true)
    const minimaxMage = knots.filter(entry => entry.candidate.id === 'minimax' && entry.harness === 'Mage')
    expect(minimaxMage).toHaveLength(8)
    expect(minimaxMage.every(entry => entry.author.model.title === 'MiniMax M3' && entry.author.model.slug === 'minimax/minimax-m3' && entry.author.model.effortLevel === undefined)).toBe(true)
    const mimoMage = knots.filter(entry => entry.candidate.id === 'mimo' && entry.harness === 'Mage')
    expect(mimoMage).toHaveLength(16)
    for (const version of ['2.5', '2.6']) {
      const versionEntries = mimoMage.filter(entry => entry.author.model.slug === `xiaomi/mimo-v${version}-pro`)
      expect(versionEntries).toHaveLength(8)
      expect(versionEntries.every(entry => entry.author.model.title === `MiMo V${version} Pro` && entry.author.model.effortLevel === 'xhigh')).toBe(true)
    }
    const astraApi = api.filter(entry => entry.candidate.id === 'gpt_astra')
    const fableApi = api.filter(entry => entry.candidate.id === 'claude_fable')
    const solApi = api.filter(entry => entry.candidate.id === 'gpt_sol')
    const sonnetApi = api.filter(entry => entry.candidate.id === 'claude_sonnet')
    const opusApi = api.filter(entry => entry.candidate.id === 'claude_opus')
    const hy4Api = api.filter(entry => entry.candidate.id === 'hy')
    expect(astraApi).toHaveLength(8)
    expect(fableApi).toHaveLength(16)
    expect(solApi).toHaveLength(8)
    expect(sonnetApi).toHaveLength(8)
    expect(opusApi).toHaveLength(16)
    expect(hy4Api).toHaveLength(24)
    expect(astraApi.every(entry => entry.author.model.slug === 'openai/gpt-6-astra' && entry.author.model.effortLevel === 'max')).toBe(true)
    expect(fableApi.every(entry => entry.author.model.slug === 'anthropic/claude-fable-5.1' && entry.author.model.effortLevel === 'max')).toBe(true)
    expect(solApi.every(entry => entry.author.model.slug === 'openai/gpt-5.6-sol' && entry.author.model.effortLevel === 'max')).toBe(true)
    expect(sonnetApi.every(entry => entry.author.model.slug === 'anthropic/claude-sonnet-5' && entry.author.model.effortLevel === 'medium')).toBe(true)
    expect(opusApi.every(entry => entry.author.model.slug === 'anthropic/claude-opus-5' && entry.author.model.effortLevel === 'medium')).toBe(true)
    expect(hy4Api.filter(entry => entry.author.model.effortLevel === 'medium')).toHaveLength(16)
    expect(Object.fromEntries(['chat.z.ai', 'grok.com Build', 'grok.com', 'kimi.ai', 'meta.ai', 'chat.qwen.ai', 'chat.deepseek.com'].map(harness => [harness, webChat.filter(entry => entry.harness === harness).length]))).toEqual({
      'chat.z.ai': 8,
      'grok.com Build': 8,
      'grok.com': 8,
      'kimi.ai': 8,
      'meta.ai': 8,
      'chat.qwen.ai': 8,
      'chat.deepseek.com': 8,
    })
  })
  test('defaults to four shots per candidate when the URL omits shots', () => {
    const bays = selectKnotBays('?candidates=claude_fable,gpt_astra')
    expect(new Set(bays.map(bay => bay.candidate.data.id))).toEqual(new Set(['claude_fable', 'gpt_astra']))
    expect(bays.every(bay => bay.finishes.length === 4)).toBe(true)
  })
  test('filters candidates, caps shots and enumerates only after final selection', () => {
    const bays = selectKnotBays('?candidates=glm,muse_spark,qwen_max,gpt_astra&shots=2')
    expect(new Set(bays.map(bay => bay.candidate.data.id))).toEqual(new Set(['glm', 'muse_spark', 'qwen_max', 'gpt_astra']))
    expect(bays.flatMap(bay => bay.finishes)).toHaveLength(8)
    expect(bays.every(bay => bay.finishes.length === 2 && bay.finishes.every(entry => entry.candidate.id === bay.candidate.data.id))).toBe(true)
    const numbered = enumerateKnotBays(bays)
    expect(numbered.flatMap(bay => bay.finishes.map(entry => entry.number))).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    const astra = enumerateKnotBays(selectKnotBays('?candidates=gpt_astra&shots=3'))
    expect(astra[0].finishes).toHaveLength(3)
    expect(astra[0].finishes.map(entry => entry.number)).toEqual([1, 2, 3])
    expect(() => selectKnotBays('?shots=0')).toThrow('shots')
    expect(() => selectKnotBays('?candidate_limit=0')).toThrow('candidate_limit')
    expect(() => selectKnotBays('?candidates=missing')).toThrow('candidate')
  })
  test('knot_id is an exact comma-separated exhibition whitelist', () => {
    const requested = knotCandidates.slice(0, 9).map(entryCandidate => entryCandidate.items.find(knot => !knot.archived)!.id)
    const bays = selectKnotBays(`?knot_id=${requested.join(',')}`)
    expect(new Set(bays.flatMap(bay => bay.finishes.map(entry => entry.id)))).toEqual(new Set(requested))
    expect(bays).toHaveLength(9)
    const candidateWithFive = knotCandidates.find(entryCandidate => entryCandidate.items.filter(knot => !knot.archived).length >= 5)!
    const five = candidateWithFive.items.filter(knot => !knot.archived).slice(0, 5).map(knot => knot.id)
    const exact = selectKnotBays(`?knot_id=${five.join(',')}`)
    expect(exact).toHaveLength(1)
    expect(new Set(exact[0].finishes.map(entry => entry.id))).toEqual(new Set(five))
    expect(exact[0].finishes).toHaveLength(5)
    expect(() => selectKnotBays('?knot_id=missing_knot')).toThrow('Knot ID')
  })
  test('formats runtime number sequences compactly', () => {
    expect(formatKnotLabels([])).toBe('')
    expect(formatKnotLabels([1])).toBe('#01')
    expect(formatKnotLabels([1, 2, 3])).toBe('#01–#03')
    expect(formatKnotLabels([1, 3, 4])).toBe('#01 · #03 · #04')
  })
  test('keeps the second Fable batch and new GLM batch identifiable without plate numbers', () => {
    const fable = knotCandidates.find(candidate => candidate.data.id === 'claude_fable')!
    expect(fable.items).toHaveLength(16)
    const fableOpenRouter = fable.items.filter(entry => entry.author.model.slug === 'anthropic/claude-fable-5.1')
    expect(fableOpenRouter).toHaveLength(16)
    expect(fableOpenRouter.every(entry => entry.harness === 'none')).toBe(true)
    expect(byId('chladni_resonance').displacement).toBe(0.006)
    const glm = knotCandidates.find(candidate => candidate.data.id === 'glm')!
    const glmFlash = knotCandidates.find(candidate => candidate.data.id === 'glm_flash')!
    expect(glm.data.title).toBe('GLM')
    expect(glmFlash.data.title).toBe('GLM Flash')
    expect(glm.items).toHaveLength(24)
    expect(glmFlash.items).toHaveLength(8)
    expect(glm.items.every(entry => entry.author.model.title !== 'GLM 5.3 Flash')).toBe(true)
    expect(glmFlash.items.every(entry => entry.author.model.slug === 'z-ai/glm-5.3-flash')).toBe(true)
    const glmOpenRouter = glm.items.filter(entry => entry.author.model.slug === 'z-ai/glm-5.3')
    expect(glmOpenRouter).toHaveLength(8)
    expect(glmOpenRouter.every(entry => entry.archived !== true)).toBe(true)
  })
})
