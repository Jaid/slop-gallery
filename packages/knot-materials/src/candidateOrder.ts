export type CandidateOrder = 'name' | 'score'

export default function parseCandidateOrder(search = ''): CandidateOrder {
  const params = new URLSearchParams(search)
  const value = params.get('candidate_order') ?? 'score'
  if (value !== 'name' && value !== 'score') {
    throw new Error('Knot candidate_order URL parameter must be score or name.')
  }
  return value
}
