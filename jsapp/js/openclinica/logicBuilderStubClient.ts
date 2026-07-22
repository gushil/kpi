/**
 * OC fork — P1.3 AI Generator (Logic Builder) STUB client.
 *
 * A stand-in for the eventual real AI generation backend. It returns a canned,
 * attribute-appropriate XPath-ish expression after a short delay so the
 * `AiGeneratorDialog` flow (loading -> proposal -> Apply) can be exercised
 * end-to-end without a server. It intentionally rejects when the prompt
 * contains the word "fail" so the dialog's error state is reachable too.
 *
 * NOTE: the `${...}` sequences below are LITERAL expression placeholders, not
 * JS template interpolation — hence single-quoted strings throughout.
 */
import type { GenerateClient, GenerationRequest, GenerationResult } from '@openclinica/logic-builder'

const STUB_DELAY_MS = 400

export const logicBuilderStubClient: GenerateClient = {
  generate(req: GenerationRequest): Promise<GenerationResult> {
    return new Promise<GenerationResult>((resolve, reject) => {
      setTimeout(() => {
        const prompt = (req.prompt || '').toLowerCase()

        if (prompt.includes('fail')) {
          reject(new Error('Stub generation failed on purpose (prompt contained "fail").'))
          return
        }

        let expression: string
        if (prompt.includes('round')) {
          expression = 'round(${WEIGHT} div pow(${HEIGHT} div 100, 2), 1)'
        } else if (req.attribute === 'constraint' || req.attribute === 'relevant' || req.attribute === 'required') {
          expression = '${AGE} >= 18'
        } else if (req.attribute === 'repeatCount') {
          expression = '${NUM_VISITS} + 2'
        } else if (req.attribute === 'default') {
          expression = 'today()'
        } else {
          // calculation (and any future/unknown attribute)
          expression = '${WEIGHT} div pow(${HEIGHT} div 100, 2)'
        }

        resolve({ expression })
      }, STUB_DELAY_MS)
    })
  },
}

export default logicBuilderStubClient
