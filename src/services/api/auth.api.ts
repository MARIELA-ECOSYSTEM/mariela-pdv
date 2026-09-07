import { PdvApiClient } from "./client";
import type { PdvLoginPayload, PdvVendedor } from "@/types/auth";

/** POST /api/v1/pdv/auth/login — ainda não invocado pela interface. */
export function loginPdv(payload: PdvLoginPayload) {
  return PdvApiClient.post<{
    accessToken: string;
    refreshToken?: string;
    vendedor: PdvVendedor;
  }>("/api/v1/pdv/auth/login", payload);
}
