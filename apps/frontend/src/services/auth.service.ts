import { ApiRoutes, type AuthSessionResponseDto } from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export const authService = {
  getSession: async (): Promise<AuthSessionResponseDto> => {
    return httpClient.get<AuthSessionResponseDto>(ApiRoutes.AUTH_SESSION);
  },

  unlock: async (token: string): Promise<{ ok: boolean }> => {
    return httpClient.post<{ ok: boolean }>(ApiRoutes.AUTH_UNLOCK, { token });
  },
};
