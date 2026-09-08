/**
 * Gera um UUID v4 criptograficamente seguro, compatível com ambientes onde
 * `crypto.randomUUID` não está disponível (ex.: contextos não-seguros do
 * Tauri/Chromium ou builds antigos).
 *
 * Usado para ids locais de linha de pagamento e para a `idempotencyKey` da
 * venda: uma NOVA operação recebe uma NOVA chave; retries da mesma tentativa
 * reutilizam a chave já gerada (ver PdvVendaTentativa).
 */
export function gerarUuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    // UUID v4: version e variant conforme RFC 4122
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error("crypto indisponível: não é possível gerar idempotency key segura");
}
