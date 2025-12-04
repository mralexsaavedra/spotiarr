import { ApiRoutes } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";

interface SpotifyAuthStatus {
  authenticated: boolean;
  hasRefreshToken: boolean;
}

export const useSpotifyAuthStatusQuery = () => {
  return useQuery<SpotifyAuthStatus>({
    queryKey: queryKeys.spotifyAuthStatus,
    queryFn: async () => {
      const response = await fetch(`${ApiRoutes.BASE}/auth/spotify/status`);
      if (!response.ok) {
        throw new Error("Failed to check Spotify auth status");
      }
      return response.json();
    },
  });
};
