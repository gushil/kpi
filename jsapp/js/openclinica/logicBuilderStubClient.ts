/**
 * OC fork — P1.1 AI Generator (Logic Builder) STUB client.
 *
 * A stand-in for the eventual real AI generation backend. It returns a canned,
 * attribute-appropriate XPath-ish expression after a short delay so the
 * `AiGeneratorDialog` flow (loading -> proposal -> Apply) can be exercised
 * end-to-end without a server.
 *
 * It follows the package's updated GenerateClient contract:
 *  - it honours the optional AbortSignal, so a superseded or abandoned request
 *    is actually cancelled (its pending timer is cleared) rather than only
 *    having its result ignored by the dialog; and
 *  - it reports an intentional failure as a labeled `GenerationFailure`
 *    (`{ kind: 'failure', error }`) — reachable by putting the word "fail" in
 *    the prompt — instead of an unlabeled promise rejection, so the caller can
 *    tell a failure apart from an empty-but-successful expression.
 *
 * NOTE: the `${...}` sequences below are LITERAL expression placeholders, not
 * JS template interpolation — hence single-quoted strings throughout.
 */
import type { GenerateClient, GenerationRequest, GenerationResult } from '@openclinica/logic-builder'

const STUB_DELAY_MS = 400

export const logicBuilderStubClient: GenerateClient = {
  generate(req: GenerationRequest, opts?: { signal?: AbortSignal }): Promise<GenerationResult> {
    const signal = opts?.signal
    return new Promise<GenerationResult>((resolve, reject) => {
      // Already cancelled before we even start — bail immediately.
      if (signal?.aborted) {
        reject(new DOMException('Generation aborted', 'AbortError'))
        return
      }

      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort)
        const prompt = (req.prompt || '').toLowerCase()

        if (prompt.includes('fail')) {
          // Labeled failure shape — distinguishable from an empty success.
          resolve({ kind: 'failure', error: 'Stub generation failed on purpose (prompt contained "fail").' })
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

        resolve({ kind: 'success', expression })
      }, STUB_DELAY_MS)

      // Cancel the pending "request" when the dialog supersedes it (a newer
      // Generate) or closes/unmounts — the package aborts in all three cases.
      function onAbort() {
        clearTimeout(timer)
        reject(new DOMException('Generation aborted', 'AbortError'))
      }
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  },
}

export default logicBuilderStubClient
