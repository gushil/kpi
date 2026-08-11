/**
 * OC fork — P1.2 (OC-28277): the real GenerateClient. All generation logic
 * (prompts, model, stripping) lives server-side in the private package; this
 * module only points the package's HTTP client at the kpi proxy endpoint.
 */
import { createHttpGenerateClient } from '@openclinica/logic-builder'
import { ROOT_URL } from '#/constants'

/** Same cookie the api.ts fetch helpers use (custom OC CSRF cookie name). */
export function getOcCsrfToken(): string | null {
  const match = document.cookie.match(/occsrftoken_v2=(\w{32,64})/)
  return match ? match[1] : null
}

export const logicBuilderClient = createHttpGenerateClient({
  url: `${ROOT_URL}/api/v2/ai/generate-expression/`,
  getCsrfToken: getOcCsrfToken,
})
