import { ApiRoutes } from "@spotiarr/shared";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SpotifyAuthStatus {
  authenticated: boolean;
  hasRefreshToken: boolean;
}

export const useSpotifyAuth = () => {
  const queryClient = useQueryClient();

  // Query to check authentication status
  const { data, isLoading } = useQuery<SpotifyAuthStatus>({
    queryKey: ["spotify-auth-status"],
    queryFn: async () => {
      const response = await fetch(`${ApiRoutes.BASE}/auth/spotify/status`);
      if (!response.ok) {
        throw new Error("Failed to check Spotify auth status");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mutation to logout
  const logoutMutation = useMutation({
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
      // Invalidate auth status query
      queryClient.invalidateQueries({ queryKey: ["spotify-auth-status"] });
    },
  });

  const login = () => {
    // Redirect to Spotify login
    window.location.href = `${ApiRoutes.BASE}/auth/spotify/login`;
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    isAuthenticated: data?.authenticated ?? false,
    hasRefreshToken: data?.hasRefreshToken ?? false,
    isLoading: isLoading || logoutMutation.isPending,
    login,
    logout,
  };
};
