import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "../queryKeys";

export const useAuthSessionQuery = () => {
  return useQuery({
    queryKey: queryKeys.authSession,
    queryFn: () => authService.getSession(),
    staleTime: Infinity,
    retry: (failureCount, error) =>
      (error as { status?: number })?.status !== 401 && failureCount < 5,
    retryDelay: 1000,
  });
};
