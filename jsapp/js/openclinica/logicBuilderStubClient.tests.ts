import chai from 'chai'
import type { GenerationRequest } from '@openclinica/logic-builder'
import { logicBuilderStubClient } from './logicBuilderStubClient'

function makeRequest(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    prompt: 'calculate bmi',
    attribute: 'calculation',
    targetFieldName: 'BMI',
    fields: { fields: [] },
    currentExpression: '',
    ...overrides,
  }
}

describe('logicBuilderStubClient (P1.1)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('resolves a kind: success result after the stub delay', async () => {
    const promise = logicBuilderStubClient.generate(makeRequest())
    jest.advanceTimersByTime(400)
    const result = await promise
    chai.expect(result.kind).to.equal('success')
    chai.expect((result as any).expression).to.be.a('string').and.not.equal('')
  })

  it('resolves a labeled kind: failure when the prompt contains "fail"', async () => {
    const promise = logicBuilderStubClient.generate(makeRequest({ prompt: 'please fail' }))
    jest.advanceTimersByTime(400)
    const result = await promise
    chai.expect(result.kind).to.equal('failure')
    chai.expect((result as any).error).to.be.a('string').and.not.equal('')
  })

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    let error: any
    try {
      await logicBuilderStubClient.generate(makeRequest(), { signal: controller.signal })
    } catch (e) {
      error = e
    }
    chai.expect(error?.name).to.equal('AbortError')
  })

  it('cancels a pending generation when the signal aborts mid-flight', async () => {
    const controller = new AbortController()
    const promise = logicBuilderStubClient.generate(makeRequest(), { signal: controller.signal })
    const caught = promise.catch((e) => e)
    controller.abort()
    const error = await caught
    chai.expect(error?.name).to.equal('AbortError')
    // The pending timer was cleared — advancing time must not do anything
    // further (a late resolve after rejection would be a no-op anyway, but the
    // timer itself should be gone).
    chai.expect(jest.getTimerCount()).to.equal(0)
  })
})
