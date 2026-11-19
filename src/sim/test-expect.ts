// A small `expect` for Node's built-in test runner (node:test), covering only
// the matchers the sim tests use. It keeps the tests close to Same Sun's
// vitest originals without adding a test framework to this repo.
import assert from 'node:assert/strict'

type Matchers = {
  toBe(want: unknown): void
  toEqual(want: unknown): void
  toMatchObject(want: object): void
  toBeTruthy(): void
  toBeGreaterThan(n: number): void
  toBeGreaterThanOrEqual(n: number): void
  toBeLessThan(n: number): void
  toBeLessThanOrEqual(n: number): void
  toBeCloseTo(n: number, digits?: number): void
  toHaveLength(n: number): void
  toMatch(re: RegExp): void
}

/** True when every key in `want` matches `got`, recursively (like vitest's toMatchObject). */
function partial(got: unknown, want: unknown): boolean {
  if (typeof want !== 'object' || want === null) return Object.is(got, want)
  if (typeof got !== 'object' || got === null) return false
  return Object.entries(want).every(([k, v]) => partial((got as Record<string, unknown>)[k], v))
}

function matchers(got: unknown, message: string | undefined, negate: boolean): Matchers {
  const check = (pass: boolean, what: string) => {
    if (pass === negate) assert.fail(`${message ? `${message}: ` : ''}expected ${JSON.stringify(got)} ${negate ? 'not ' : ''}${what}`)
  }
  const n = got as number
  return {
    toBe: (want) => check(Object.is(got, want), `to be ${JSON.stringify(want)}`),
    toEqual: (want) => {
      let same = true
      try {
        assert.deepStrictEqual(got, want)
      } catch {
        same = false
      }
      check(same, `to equal ${JSON.stringify(want)}`)
    },
    toMatchObject: (want) => check(partial(got, want), `to match ${JSON.stringify(want)}`),
    toBeTruthy: () => check(!!got, 'to be truthy'),
    toBeGreaterThan: (x) => check(n > x, `to be > ${x}`),
    toBeGreaterThanOrEqual: (x) => check(n >= x, `to be >= ${x}`),
    toBeLessThan: (x) => check(n < x, `to be < ${x}`),
    toBeLessThanOrEqual: (x) => check(n <= x, `to be <= ${x}`),
    toBeCloseTo: (x, digits = 2) => check(Math.abs(n - x) < 10 ** -digits / 2, `to be close to ${x}`),
    toHaveLength: (x) => check((got as { length: number }).length === x, `to have length ${x}`),
    toMatch: (re) => check(re.test(String(got)), `to match ${re}`),
  }
}

export function expect(got: unknown, message?: string) {
  return Object.assign(matchers(got, message, false), { not: matchers(got, message, true) })
}
