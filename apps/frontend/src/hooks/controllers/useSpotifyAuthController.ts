import { ApiRoutes } from "@spotiarr/shared";
import { useCallback } from "react";
import { useSpotifyLogoutMutation } from "../mutations/useSpotifyLogoutMutation";
import { useSpotifyAuthStatusQuery } from "../queries/useSpotifyAuthStatusQuery";

export const useSpotifyAuthController = () => {
  const { data, isLoading } = useSpotifyAuthStatusQuery();
  const logoutMutation = useSpotifyLogoutMutation();

  const login = useCallback(() => {
    window.location.href = `${ApiRoutes.BASE}/auth/spotify/login`;
  }, []);

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return {
    isAuthenticated: data?.authenticated ?? false,
    hasRefreshToken: data?.hasRefreshToken ?? false,
    isLoading: isLoading || logoutMutation.isPending,
    login,
    logout,
  };
};
