import { afterEach, describe, expect, it, vi } from "vitest";
import { gerarUuid } from "./uuid";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("gerarUuid", () => {
  it("usa crypto.randomUUID quando disponível", () => {
    const randomUUID = vi.fn(() => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    vi.stubGlobal("crypto", { ...globalThis.crypto, randomUUID });

    expect(gerarUuid()).toBe("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it("gera um UUID v4 válido via getRandomValues quando randomUUID não existe", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        arr.forEach((_, i) => (arr[i] = (i * 17 + 3) & 0xff));
        return arr;
      },
    });

    const id = gerarUuid();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it("gera chaves distintas entre chamadas (nova operação = nova chave)", () => {
    const realGetRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array<ArrayBuffer>) => realGetRandomValues(arr),
    });

    const a = gerarUuid();
    const b = gerarUuid();
    expect(a).toMatch(UUID_V4_REGEX);
    expect(b).toMatch(UUID_V4_REGEX);
    expect(a).not.toBe(b);
  });

  it("lança erro explícito quando nenhuma API de crypto existe (nunca silencia)", () => {
    vi.stubGlobal("crypto", undefined);
    expect(() => gerarUuid()).toThrow(/idempotency key/i);
  });
});
