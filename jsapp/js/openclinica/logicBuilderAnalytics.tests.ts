import chai from 'chai'

const mockTrack = jest.fn()
jest.mock('#/userpilot', () => ({
  __esModule: true,
  default: { track: (...args: unknown[]) => mockTrack(...args) },
}))

import type { FailureReason, GenerateClient, GenerationRequest, GenerationResult } from '@openclinica/logic-builder'
import {
  type GenerateRequestEvent,
  LOGIC_BUILDER_EVENTS,
  type SyntaxVerdictEvent,
  clearGenerationLedger,
  clearSyntaxVerdictMemory,
  emitGenerateApply,
  emitSyntaxVerdict,
  forgetSyntaxVerdict,
  latencyBucket,
  newGenerationId,
  recordGeneration,
  withGenerationAnalytics,
} from './logicBuilderAnalytics'

describe('LOGIC_BUILDER_EVENTS (P1.12)', () => {
  it('uses the namespaced, permanent UserPilot event names', () => {
    chai.expect(LOGIC_BUILDER_EVENTS).to.deep.equal({
      generateRequest: 'logic_builder.generate.request',
      generateApply: 'logic_builder.generate.apply',
      syntaxVerdict: 'logic_builder.syntax.verdict',
    })
  })
})

describe('latencyBucket (P1.12 AC1 timing)', () => {
  it('bins with the lower bound inclusive', () => {
    const cases: Array<[number, string]> = [
      [0, '<1s'],
      [999, '<1s'],
      [1000, '1-2s'],
      [1999, '1-2s'],
      [2000, '2-3s'],
      [2999, '2-3s'],
      [3000, '3-5s'],
      [4999, '3-5s'],
      [5000, '5-10s'],
      [9999, '5-10s'],
      [10000, '>10s'],
      [60000, '>10s'],
    ]
    for (const [ms, bucket] of cases) {
      chai.expect(latencyBucket(ms), `${ms} ms`).to.equal(bucket)
    }
  })
})

describe('newGenerationId (P1.12 AC1 identifier)', () => {
  it('uses randomUUID when the platform offers it', () => {
    chai.expect(newGenerationId({ randomUUID: () => 'uuid-1' })).to.equal('uuid-1')
  })

  it('falls back to a time+random id without randomUUID, and ids differ', () => {
    const a = newGenerationId({})
    const b = newGenerationId(undefined)
    chai.expect(a).to.match(/^[0-9a-z]+-[0-9a-z]+$/)
    chai.expect(a).to.not.equal(b)
  })

  it('falls back when randomUUID throws (insecure context)', () => {
    const id = newGenerationId({
      randomUUID: () => {
        throw new Error('insecure context')
      },
    })
    chai.expect(id).to.match(/^[0-9a-z]+-[0-9a-z]+$/)
  })
})

// AC3 at compile time: the request payload has no room for expression text.
// `npm run lint:types` fails if this directive becomes unused (i.e. if the
// whitelist ever gains an index signature or an `expression` key).
const forbiddenPayload: GenerateRequestEvent = {
  attribute: 'calculation',
  itemName: 'BMI',
  generationId: 'g',
  outcome: 'success',
  latencyMs: 1,
  latencyBucket: '<1s',
  // @ts-expect-error — `expression` is not a permitted GenerateRequestEvent key
  expression: 'never',
}
void forbiddenPayload

describe('emitGenerateApply (P1.12 AC2 — apply carries the generation id)', () => {
  const scope = { itemName: 'BMI', attribute: 'calculation' as const, expression: '${W} div (${H} * ${H})' }

  beforeEach(() => {
    mockTrack.mockReset()
    clearGenerationLedger()
  })

  it('emits the apply event with the ledger id when item, attribute and expression match', () => {
    recordGeneration({ generationId: 'g1', ...scope })
    const id = emitGenerateApply(scope)
    chai.expect(id).to.equal('g1')
    chai
      .expect(mockTrack.mock.calls)
      .to.deep.equal([
        [LOGIC_BUILDER_EVENTS.generateApply, { attribute: 'calculation', itemName: 'BMI', generationId: 'g1' }],
      ])
  })

  it('retains the slot, so a retried Apply after a rejected write still matches', () => {
    recordGeneration({ generationId: 'g1', ...scope })
    emitGenerateApply(scope)
    chai.expect(emitGenerateApply(scope)).to.equal('g1')
    chai.expect(mockTrack.mock.calls.length).to.equal(2)
  })

  it('emits without an id and warns when the expression differs', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    recordGeneration({ generationId: 'g1', ...scope })
    const id = emitGenerateApply({ ...scope, expression: 'something else' })
    chai.expect(id).to.equal(undefined)
    chai
      .expect(mockTrack.mock.calls)
      .to.deep.equal([[LOGIC_BUILDER_EVENTS.generateApply, { attribute: 'calculation', itemName: 'BMI' }]])
    chai.expect(warn.mock.calls.length).to.equal(1)
    warn.mockRestore()
  })

  it('misses when the item or attribute differs', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    recordGeneration({ generationId: 'g1', ...scope })
    chai.expect(emitGenerateApply({ ...scope, itemName: 'HEIGHT' })).to.equal(undefined)
    chai.expect(emitGenerateApply({ ...scope, attribute: 'default' })).to.equal(undefined)
    warn.mockRestore()
  })

  it('misses on an empty ledger and after clearGenerationLedger()', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    chai.expect(emitGenerateApply(scope)).to.equal(undefined)
    recordGeneration({ generationId: 'g1', ...scope })
    clearGenerationLedger()
    chai.expect(emitGenerateApply(scope)).to.equal(undefined)
    chai.expect(mockTrack.mock.calls.length).to.equal(2)
    warn.mockRestore()
  })

  it('never throws when the tracker throws, and still returns the matched id', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockTrack.mockImplementation(() => {
      throw new Error('sdk down')
    })
    recordGeneration({ generationId: 'g1', ...scope })
    let id: string | undefined
    chai
      .expect(() => {
        id = emitGenerateApply(scope)
      })
      .to.not.throw()
    chai.expect(id).to.equal('g1')
    warn.mockRestore()
  })
})

describe('withGenerationAnalytics (P1.12 AC1 request event, AC4 never alters the result)', () => {
  const req: GenerationRequest = {
    prompt: 'BMI from weight and height',
    attribute: 'calculation',
    targetFieldName: 'BMI',
    form: { rows: [] },
  }
  const success: GenerationResult = { kind: 'success', expression: '${W} div (${H} * ${H})' }

  function resolving(result: GenerationResult): GenerateClient {
    return { generate: () => Promise.resolve(result) }
  }
  function rejecting(error: unknown): GenerateClient {
    return { generate: () => Promise.reject(error) }
  }
  /** performance.now() is read once before and once after the inner call. */
  function clock(before: number, after: number) {
    return jest.spyOn(performance, 'now').mockReturnValueOnce(before).mockReturnValueOnce(after)
  }
  async function settle(client: GenerateClient): Promise<{ value?: GenerationResult; error?: unknown }> {
    try {
      return { value: await client.generate(req) }
    } catch (error) {
      return { error }
    }
  }

  beforeEach(() => {
    mockTrack.mockReset()
    clearGenerationLedger()
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('emits a success event with exactly the whitelisted keys and the measured latency, and records the ledger', async () => {
    clock(1000, 3500)
    const out = await withGenerationAnalytics(resolving(success)).generate(req)
    chai.expect(out).to.equal(success) // same object, by identity
    chai.expect(mockTrack.mock.calls.length).to.equal(1)
    const [name, payload] = mockTrack.mock.calls[0] as [string, GenerateRequestEvent]
    chai.expect(name).to.equal(LOGIC_BUILDER_EVENTS.generateRequest)
    chai
      .expect(Object.keys(payload).sort())
      .to.deep.equal(['attribute', 'generationId', 'itemName', 'latencyBucket', 'latencyMs', 'outcome'])
    chai.expect(payload).to.include({
      attribute: 'calculation',
      itemName: 'BMI',
      outcome: 'success',
      latencyMs: 2500,
      latencyBucket: '2-3s',
    })
    chai.expect(payload.generationId).to.be.a('string').and.not.equal('')
    // The ledger now resolves an Apply of this proposal to the same id.
    chai
      .expect(emitGenerateApply({ itemName: 'BMI', attribute: 'calculation', expression: success.expression }))
      .to.equal(payload.generationId)
  })

  it('mints a different id per request', async () => {
    const client = withGenerationAnalytics(resolving(success))
    await client.generate(req)
    await client.generate(req)
    const ids = mockTrack.mock.calls.map((call) => (call[1] as GenerateRequestEvent).generationId)
    chai.expect(ids[0]).to.not.equal(ids[1])
  })

  it.each([
    'insufficient_detail',
    'invalid_reference',
    'other_prompt_issue',
    'non_validated_function',
    'unavailable',
  ] as FailureReason[])('emits outcome %s for a failure and leaves the ledger empty', async (reason) => {
    clock(0, 10)
    const failure: GenerationResult = { kind: 'failure', reason }
    const out = await withGenerationAnalytics(resolving(failure)).generate(req)
    chai.expect(out).to.equal(failure)
    chai.expect(mockTrack.mock.calls[0][1]).to.include({ outcome: reason, latencyMs: 10, latencyBucket: '<1s' })
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    chai.expect(emitGenerateApply({ itemName: 'BMI', attribute: 'calculation', expression: 'x' })).to.equal(undefined)
  })

  it('clears a previous success from the ledger when the next generation fails', async () => {
    const client = withGenerationAnalytics(resolving(success))
    await client.generate(req)
    await withGenerationAnalytics(resolving({ kind: 'failure', reason: 'insufficient_detail' })).generate(req)
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    chai
      .expect(emitGenerateApply({ itemName: 'BMI', attribute: 'calculation', expression: success.expression }))
      .to.equal(undefined)
  })

  it('reads a malformed result and an empty success expression as unavailable', async () => {
    await withGenerationAnalytics(resolving({} as GenerationResult)).generate(req)
    await withGenerationAnalytics(resolving({ kind: 'success', expression: '   ' })).generate(req)
    chai
      .expect(mockTrack.mock.calls.map((call) => (call[1] as GenerateRequestEvent).outcome))
      .to.deep.equal(['unavailable', 'unavailable'])
  })

  it('reads a reason the package has not defined yet as unavailable, and leaves the ledger empty', async () => {
    const bogus = { kind: 'failure', reason: 'bogus' } as unknown as GenerationResult
    const out = await withGenerationAnalytics(resolving(bogus)).generate(req)
    chai.expect(out).to.equal(bogus)
    chai.expect(mockTrack.mock.calls[0][1]).to.include({ outcome: 'unavailable' })
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    chai.expect(emitGenerateApply({ itemName: 'BMI', attribute: 'calculation', expression: 'x' })).to.equal(undefined)
  })

  it('reads a reason shadowing an Object.prototype member as unavailable (prototype-chain guard)', async () => {
    const prototypeShadow = { kind: 'failure', reason: 'toString' } as unknown as GenerationResult
    const out = await withGenerationAnalytics(resolving(prototypeShadow)).generate(req)
    chai.expect(out).to.equal(prototypeShadow)
    chai.expect(mockTrack.mock.calls[0][1]).to.include({ outcome: 'unavailable' })
  })

  it('rethrows an AbortError and emits nothing', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const { error } = await settle(withGenerationAnalytics(rejecting(abort)))
    chai.expect(error).to.equal(abort)
    chai.expect(mockTrack.mock.calls.length).to.equal(0)
  })

  it('emits unavailable and rethrows the same error on any other rejection', async () => {
    clock(0, 7000)
    const network = new TypeError('network')
    const { error } = await settle(withGenerationAnalytics(rejecting(network)))
    chai.expect(error).to.equal(network)
    chai
      .expect(mockTrack.mock.calls[0][1])
      .to.include({ outcome: 'unavailable', latencyMs: 7000, latencyBucket: '5-10s' })
  })

  it('returns the result unchanged and does not reject when the tracker throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockTrack.mockImplementation(() => {
      throw new Error('sdk down')
    })
    const out = await withGenerationAnalytics(resolving(success)).generate(req)
    chai.expect(out).to.equal(success)
    chai.expect(warn.mock.calls.length).to.equal(1)
  })

  it('passes the request and abort signal through to the inner client untouched', async () => {
    const inner = { generate: jest.fn(() => Promise.resolve(success)) }
    const controller = new AbortController()
    await withGenerationAnalytics(inner).generate(req, { signal: controller.signal })
    chai.expect(inner.generate.mock.calls).to.deep.equal([[req, { signal: controller.signal }]])
  })
})

describe('emitSyntaxVerdict (P1.13 AC1–AC3)', () => {
  const bmi = { itemName: 'BMI', attribute: 'calculation' as const }

  beforeEach(() => {
    mockTrack.mockReset()
    clearSyntaxVerdictMemory()
  })

  it('emits a valid verdict with exactly the whitelisted keys and no expression text', () => {
    emitSyntaxVerdict({ ...bmi, expression: '${WEIGHT} div ${HEIGHT}', categories: [] })
    chai.expect(mockTrack.mock.calls.length).to.equal(1)
    const [name, payload] = mockTrack.mock.calls[0] as [string, SyntaxVerdictEvent]
    chai.expect(name).to.equal(LOGIC_BUILDER_EVENTS.syntaxVerdict)
    chai
      .expect(Object.keys(payload).sort())
      .to.deep.equal([
        'afterAiApply',
        'attribute',
        'errorCategories',
        'errorCount',
        'generationId',
        'itemName',
        'verdict',
      ])
    chai.expect(payload).to.deep.equal({
      attribute: 'calculation',
      itemName: 'BMI',
      verdict: 'valid',
      errorCategories: '',
      errorCount: 0,
      afterAiApply: false,
      generationId: null,
    })
    chai.expect(JSON.stringify(payload)).to.not.include('WEIGHT')
  })

  it('emits an invalid verdict with the categories joined and counted', () => {
    emitSyntaxVerdict({ ...bmi, expression: '(${HIEGHT}', categories: ['paren', 'unknown_item'] })
    chai.expect(mockTrack.mock.calls[0][1]).to.include({
      verdict: 'invalid',
      errorCategories: 'paren|unknown_item',
      errorCount: 2,
      afterAiApply: false,
    })
  })

  it('does not emit again for an unchanged expression on the same item and attribute', () => {
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [] })
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [] })
    chai.expect(mockTrack.mock.calls.length).to.equal(1)
  })

  it('emits again when the expression changes, and tracks each attribute separately', () => {
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [] })
    emitSyntaxVerdict({ ...bmi, expression: '${A} + 1', categories: [] })
    emitSyntaxVerdict({ itemName: 'BMI', attribute: 'default', expression: '${A}', categories: [] })
    chai.expect(mockTrack.mock.calls.length).to.equal(3)
  })

  it('always emits a post-Apply verdict, marks it, carries the generation id, and then dedupes the following blur', () => {
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [] })
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [], afterAiApply: { generationId: 'g1' } })
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [] })
    chai.expect(mockTrack.mock.calls.length).to.equal(2)
    chai.expect(mockTrack.mock.calls[1][1]).to.include({ afterAiApply: true, generationId: 'g1', verdict: 'valid' })
  })

  it('marks a post-Apply verdict with a null generation id when the ledger missed', () => {
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [], afterAiApply: {} })
    chai.expect(mockTrack.mock.calls[0][1]).to.include({ afterAiApply: true, generationId: null })
  })

  it('emits again after the memory is cleared or one entry is forgotten', () => {
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [] })
    forgetSyntaxVerdict('BMI', 'calculation')
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [] })
    clearSyntaxVerdictMemory()
    emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [] })
    chai.expect(mockTrack.mock.calls.length).to.equal(3)
  })

  it('keys the memory on the row key when given, so two unnamed items do not share a slot', () => {
    emitSyntaxVerdict({ itemName: '', attribute: 'relevant', rowKey: 'c1', expression: '${a} + 1', categories: [] })
    emitSyntaxVerdict({ itemName: '', attribute: 'relevant', rowKey: 'c2', expression: '${a} + 1', categories: [] })
    emitSyntaxVerdict({ itemName: '', attribute: 'relevant', rowKey: 'c2', expression: '${a} + 1', categories: [] })
    chai.expect(mockTrack.mock.calls.length).to.equal(2)
  })

  it('keeps deduping across a rename when keyed on the row', () => {
    emitSyntaxVerdict({ itemName: 'OLD', attribute: 'calculation', rowKey: 'c9', expression: '${A}', categories: [] })
    emitSyntaxVerdict({ itemName: 'NEW', attribute: 'calculation', rowKey: 'c9', expression: '${A}', categories: [] })
    chai.expect(mockTrack.mock.calls.length).to.equal(1)
    chai.expect(mockTrack.mock.calls[0][1]).to.include({ itemName: 'OLD' })
  })

  it('forgets by row key', () => {
    emitSyntaxVerdict({ itemName: '', attribute: 'relevant', rowKey: 'c1', expression: '${a}', categories: [] })
    forgetSyntaxVerdict('c1', 'relevant')
    emitSyntaxVerdict({ itemName: '', attribute: 'relevant', rowKey: 'c1', expression: '${a}', categories: [] })
    chai.expect(mockTrack.mock.calls.length).to.equal(2)
  })

  it('never throws when the tracker throws', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockTrack.mockImplementation(() => {
      throw new Error('sdk down')
    })
    chai.expect(() => emitSyntaxVerdict({ ...bmi, expression: '${A}', categories: [] })).to.not.throw()
    chai.expect(warn.mock.calls.length).to.equal(1)
    warn.mockRestore()
  })
})

// AC3 at compile time: the verdict payload has no room for expression or message text.
const forbiddenVerdict: SyntaxVerdictEvent = {
  attribute: 'calculation',
  itemName: 'BMI',
  verdict: 'valid',
  errorCategories: '',
  errorCount: 0,
  afterAiApply: false,
  generationId: null,
  // @ts-expect-error — `expression` is not a permitted SyntaxVerdictEvent key
  expression: 'never',
}
void forbiddenVerdict
