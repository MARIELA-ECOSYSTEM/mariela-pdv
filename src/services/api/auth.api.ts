/**
 * Endpoints reais de autenticação do PDV (mariela-backend):
 *   POST /api/v1/pdv/auth/login   ({ codigo, senha } — LoginPdvDto)
 *   POST /api/v1/pdv/auth/refresh   (executado dentro do PdvApiClient)
 *   POST /api/v1/pdv/auth/logout  ({ refreshToken } — RefreshPdvDto)
 *   GET  /api/v1/pdv/auth/me
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import type { PdvAuthPort } from "@/services/ports";
import type { PdvLoginPayload, PdvLoginResposta, PdvVendedor } from "@/types/auth";

export const authApi: PdvAuthPort = {
  async login(payload: PdvLoginPayload): Promise<PdvVendedor> {
    // O backend só aceita `codigo` como credencial — `payload.login` é o
    // valor digitado pela vendedora na tela (rótulo "Login").
    const resposta = await PdvApiClient.post<PdvLoginResposta>(`${PDV_API_PREFIX}/auth/login`, {
      codigo: payload.login,
      senha: payload.senha,
    });
    PdvTokenStorage.setTokens(resposta.accessToken, resposta.refreshToken);
    // O vendedor pode não vir no login; nesse caso GET /auth/me é a fonte.
    return resposta.vendedor ?? (await PdvApiClient.get<PdvVendedor>(`${PDV_API_PREFIX}/auth/me`));
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = PdvTokenStorage.getRefreshToken();
      // RefreshPdvDto exige refreshToken não vazio; sem token local não há o
      // que revogar no servidor — só a limpeza local (no finally) se aplica.
      if (refreshToken) {
        await PdvApiClient.post<void>(`${PDV_API_PREFIX}/auth/logout`, { refreshToken });
      }
    } finally {
      PdvTokenStorage.clear();
    }
  },

  me(): Promise<PdvVendedor> {
    return PdvApiClient.get<PdvVendedor>(`${PDV_API_PREFIX}/auth/me`);
  },
};
