import { ApiRoutes } from "@spotiarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";

export const useSpotifyLogoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${ApiRoutes.BASE}/auth/spotify/logout`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to logout from Spotify");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spotifyAuthStatus });
    },
  });
};
