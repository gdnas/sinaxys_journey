/// <reference types="vitest/globals" />

interface Describe {
  (name: string, fn: () => void): void;
  (name: string, fn: () => Promise<void>): void;
  skip: typeof describe;
  only: typeof describe;
}

interface It {
  (name: string, fn: () => void | Promise<void>): void;
  (name: string, fn: () => Promise<void>, timeout?: number): void;
  skip: typeof it;
  only: typeof it;
  todo: typeof it;
}

interface Expect {
  <T>(actual: T): Assertion<T>;
  extend(matchers: Record<string, Function>): void;
  any(): any;
  anything(): any;
  arrayContaining<T>(arr: T[]): any;
  objectContaining(obj: Partial<any>): any;
  stringContaining(str: string): any;
  stringMatching(str: string | RegExp): any;
}

interface Assertion<T> {
  toBe(expected: unknown): T;
  toEqual(expected: unknown): T;
  toStrictEqual(expected: unknown): T;
  toBeDefined(): T;
  toBeUndefined(): T;
  toBeNull(): T;
  toBeTruthy(): T;
  toBeFalsy(): T;
  toBeGreaterThan(expected: number): T;
  toBeGreaterThanOrEqual(expected: number): T;
  toBeLessThan(expected: number): T;
  toBeLessThanOrEqual(expected: number): T;
  toBeCloseTo(expected: number, precision?: number): T;
  toMatch(expected: string | RegExp): T;
  toContain(expected: unknown): T;
  toHaveLength(expected: number): T;
  toHaveProperty(key: string | string[], value?: unknown): T;
  toThrow(error?: string | RegExp | Error | new (...args: unknown[]) => Error): T;
  toBeInstanceOf(expected: unknown): T;
  toMatchObject(expected: Partial<any>): T;
}

declare const describe: Describe;
declare const it: It;
declare const test: It;
declare const expect: Expect;