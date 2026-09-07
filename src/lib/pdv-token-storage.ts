/**
 * PdvTokenStorage — armazenamento de tokens exclusivo do MARIELA PDV.
 * Chaves próprias: nunca compartilhar com o Backoffice.
 */

const ACCESS_KEY = "mariela-pdv.accessToken";
const REFRESH_KEY = "mariela-pdv.refreshToken";

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const PdvTokenStorage = {
  getAccessToken(): string | null {
    return safeStorage()?.getItem(ACCESS_KEY) ?? null;
  },
  getRefreshToken(): string | null {
    return safeStorage()?.getItem(REFRESH_KEY) ?? null;
  },
  setTokens(accessToken: string, refreshToken?: string) {
    const storage = safeStorage();
    if (!storage) return;
    storage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) storage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    const storage = safeStorage();
    if (!storage) return;
    storage.removeItem(ACCESS_KEY);
    storage.removeItem(REFRESH_KEY);
  },
};
